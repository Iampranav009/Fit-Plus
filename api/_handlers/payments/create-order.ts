import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../../_lib/firebaseAdmin.js';
import { applySecurityHeaders, checkRateLimit, sanitizeErrorMessage } from '../../_lib/security.js';
import {
  activateEnrollmentFromPayment,
  buildTrainerSettlementPreview,
  computeAuthoritativePackageDetails,
  createCashfreeOrder,
  formatInvoiceNumber,
  getCashfreeConfig,
  resolveAppBaseUrl,
  sanitizeIndianPhone,
} from '../../_lib/payments.js';

const CreateOrderSchema = z.object({
  packageId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  trainerId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  clientId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
  inviteId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
  couponCode: z.string().max(32).optional(),
  referralCode: z.string().max(32).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);

    const rateLimit = checkRateLimit(`order:${authCtx.uid}`, 15, 60 * 1000);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        ok: false,
        code: 'rate-limit/exceeded',
        error: 'Too many order requests. Please wait a moment before trying again.',
      });
    }

    const parsed = CreateOrderSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'validation/invalid-input',
        error: 'Invalid package checkout payload.',
      });
    }

    const { packageId, trainerId, clientId: requestedClientId, inviteId } = parsed.data;
    const { db } = getFirebaseAdminContext();

    const [pkgSnap, trainerSnap] = await Promise.all([
      db.collection('packages').doc(packageId).get(),
      db.collection('trainers').doc(trainerId).get(),
    ]);

    if (!pkgSnap.exists) {
      return res.status(404).json({ ok: false, code: 'package/not-found', error: 'Coaching package not found.' });
    }
    if (!trainerSnap.exists) {
      return res.status(404).json({ ok: false, code: 'trainer/not-found', error: 'Coach profile not found.' });
    }

    const pkgData = pkgSnap.data()!;
    const trainerData = trainerSnap.data()!;

    if (String(pkgData.trainerId) !== trainerId) {
      return res.status(400).json({
        ok: false,
        code: 'package/trainer-mismatch',
        error: 'Selected package does not belong to this coach.',
      });
    }
    if (pkgData.status !== 'active') {
      return res.status(409).json({
        ok: false,
        code: 'package/paused',
        error: 'This coaching package is currently paused.',
      });
    }

    let resolvedClientId = requestedClientId;
    let clientData: Record<string, unknown> | undefined;
    if (resolvedClientId) {
      const clientSnap = await db.collection('clients').doc(resolvedClientId).get();
      if (clientSnap.exists && String(clientSnap.data()?.userId) === authCtx.uid) {
        clientData = clientSnap.data();
      } else {
        resolvedClientId = undefined;
      }
    }
    if (!resolvedClientId) {
      const clientQuery = await db
        .collection('clients')
        .where('userId', '==', authCtx.uid)
        .limit(1)
        .get();
      if (!clientQuery.empty) {
        resolvedClientId = clientQuery.docs[0].id;
        clientData = clientQuery.docs[0].data();
      }
    }

    if (!resolvedClientId) {
      return res.status(400).json({
        ok: false,
        code: 'client/profile-required',
        error: 'Complete your client onboarding profile before enrolling in a package.',
      });
    }

    const pkgDetails = computeAuthoritativePackageDetails(pkgData);
    const paymentId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const invoiceNumber = formatInvoiceNumber(paymentId);
    const trainerUserId = String(trainerData.userId);

    // Stage 4C Authoritative Coupon & Referral Discounts
    let discountInr = 0;
    let appliedCoupon: string | undefined = undefined;
    let appliedReferral: string | undefined = undefined;

    if (parsed.data.couponCode) {
      const code = parsed.data.couponCode.trim().toUpperCase();
      if (code === 'WELCOME20' && pkgDetails.priceInr >= 1000) {
        discountInr = Math.min(1000, Math.round((pkgDetails.priceInr * 20) / 100));
        appliedCoupon = code;
      } else if (code === 'FITPLUS500' && pkgDetails.priceInr >= 2000) {
        discountInr = 500;
        appliedCoupon = code;
      } else if (code === 'TRANSFORM10' && pkgDetails.cadence === 'quarterly' && pkgDetails.priceInr >= 3000) {
        discountInr = Math.round((pkgDetails.priceInr * 10) / 100);
        appliedCoupon = code;
      } else if (code.endsWith('10') && code.length >= 4) {
        discountInr = Math.round((pkgDetails.priceInr * 10) / 100);
        appliedCoupon = code;
      }
    } else if (parsed.data.referralCode) {
      const ref = parsed.data.referralCode.trim().toUpperCase();
      if (pkgDetails.priceInr >= 1500) {
        discountInr = 500;
        appliedReferral = ref;
      }
    }

    const finalAmountInr = Math.max(0, pkgDetails.priceInr - discountInr);
    const finalAmountPaise = finalAmountInr * 100;

    if (finalAmountPaise === 0) {
      await db.collection('payments').doc(paymentId).set({
        id: paymentId,
        clientId: resolvedClientId,
        clientUserId: authCtx.uid,
        trainerId,
        trainerUserId,
        packageId,
        packageName: pkgDetails.name,
        ...(inviteId ? { inviteId } : {}),
        invoiceNumber,
        amountPaise: 0,
        amountInr: 0,
        ...(discountInr > 0 ? {
          originalAmountInr: pkgDetails.priceInr,
          discountInr,
          ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
          ...(appliedReferral ? { referralCode: appliedReferral } : {}),
        } : {}),
        currency: 'INR',
        status: 'created',
        provider: 'free_tier',
        mode: 'sandbox',
        settlementStatus: 'not_applicable',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const activated = await activateEnrollmentFromPayment({
        db,
        paymentId,
        actorUserId: authCtx.uid,
      });

      return res.status(200).json({
        ok: true,
        mode: 'free_enrolled',
        paymentId,
        subscriptionId: activated.subscriptionId,
        enrollmentId: activated.enrollmentId,
        relationshipId: activated.relationshipId,
        invoiceNumber: activated.invoiceNumber,
      });
    }

    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) {
      return res.status(503).json({
        ok: false,
        code: 'payment/gateway-unconfigured',
        error: 'Cashfree checkout credentials are not configured on this server yet.',
      });
    }

    const contactSnap = await db
      .collection('users')
      .doc(authCtx.uid)
      .collection('private')
      .doc('contact')
      .get();

    const customerName =
      `${String(clientData?.firstName || '')} ${String(clientData?.lastName || '')}`.trim() ||
      String(authCtx.decoded.name || 'FitPlus Member');
    const customerPhone = sanitizeIndianPhone(
      typeof contactSnap.data()?.whatsappE164 === 'string'
        ? contactSnap.data()?.whatsappE164
        : undefined,
    );

    const cashfreeOrderId = `fp_${paymentId}`;
    const baseUrl = resolveAppBaseUrl(req.headers);
    const returnUrl = `${baseUrl}/payments/result?order_id={order_id}&payment_id=${encodeURIComponent(paymentId)}`;
    const notifyUrl = `${baseUrl}/api/payments/webhook`;

    const cfOrder = await createCashfreeOrder({
      config: cashfreeConfig,
      orderId: cashfreeOrderId,
      amountInr: finalAmountInr,
      customer: {
        customerId: authCtx.uid,
        customerName,
        customerEmail: authCtx.email || 'member@fitplus.in',
        customerPhone,
      },
      returnUrl,
      notifyUrl,
      orderNote: `${pkgDetails.name} coaching (${invoiceNumber})`,
      orderTags: {
        paymentId,
        packageId,
        trainerId,
        clientId: resolvedClientId,
      },
    });

    const settlementPreview = buildTrainerSettlementPreview({
      trainerId,
      amountInr: finalAmountInr,
      easySplitEnabled: cashfreeConfig.easySplitEnabled,
    });

    await db.collection('payments').doc(paymentId).set({
      id: paymentId,
      clientId: resolvedClientId,
      clientUserId: authCtx.uid,
      trainerId,
      trainerUserId,
      packageId,
      packageName: pkgDetails.name,
      ...(inviteId ? { inviteId } : {}),
      invoiceNumber,
      amountPaise: finalAmountPaise,
      amountInr: finalAmountInr,
      ...(discountInr > 0 ? {
        originalAmountInr: pkgDetails.priceInr,
        discountInr,
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
        ...(appliedReferral ? { referralCode: appliedReferral } : {}),
      } : {}),
      currency: 'INR',
      status: 'created',
      provider: 'cashfree',
      mode: cashfreeConfig.env,
      providerOrderId: cfOrder.order_id,
      cfOrderId: String(cfOrder.cf_order_id),
      paymentSessionId: cfOrder.payment_session_id,
      refundStatus: 'none',
      settlementStatus: settlementPreview.settlementStatus,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      ok: true,
      mode: 'cashfree_checkout',
      cashfreeEnv: cashfreeConfig.env,
      orderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id,
      amountPaise: finalAmountPaise,
      amountInr: finalAmountInr,
      originalAmountInr: pkgDetails.priceInr,
      discountInr,
      currency: 'INR',
      paymentId,
      invoiceNumber,
      packageName: pkgDetails.name,
      trainerName: String(trainerData.displayName || 'FitPlus Coach'),
      isLiveMode: cashfreeConfig.isLive,
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Create Cashfree order error:', error);
    const message = sanitizeErrorMessage(error, 'Unable to initialize Cashfree checkout right now.');
    return res.status(500).json({
      ok: false,
      code: 'payment/order-failed',
      error: message,
    });
  }
}
