import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../_lib/firebaseAdmin.js';
import {
  activateEnrollmentFromPayment,
  computeAuthoritativePackageDetails,
  createRazorpayOrder,
  formatInvoiceNumber,
  getRazorpayConfig,
} from '../_lib/payments.js';

const CreateOrderSchema = z.object({
  packageId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  trainerId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  clientId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
  inviteId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
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
    if (resolvedClientId) {
      const clientSnap = await db.collection('clients').doc(resolvedClientId).get();
      if (!clientSnap.exists || String(clientSnap.data()?.userId) !== authCtx.uid) {
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

    if (pkgDetails.amountPaise === 0) {
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
        currency: 'INR',
        status: 'created',
        provider: 'free_tier',
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

    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig.isConfigured) {
      return res.status(503).json({
        ok: false,
        code: 'payment/gateway-unconfigured',
        error: 'Razorpay checkout credentials are not configured on this server yet.',
      });
    }

    const order = await createRazorpayOrder({
      keyId: razorpayConfig.keyId,
      keySecret: razorpayConfig.keySecret,
      amountPaise: pkgDetails.amountPaise,
      receipt: paymentId,
      notes: {
        paymentId,
        packageId,
        trainerId,
        clientId: resolvedClientId,
        clientUserId: authCtx.uid,
      },
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
      amountPaise: pkgDetails.amountPaise,
      amountInr: pkgDetails.priceInr,
      currency: 'INR',
      status: 'created',
      provider: 'razorpay',
      razorpayOrderId: order.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      ok: true,
      mode: 'razorpay_checkout',
      keyId: razorpayConfig.keyId,
      orderId: order.id,
      amountPaise: pkgDetails.amountPaise,
      amountInr: pkgDetails.priceInr,
      currency: 'INR',
      paymentId,
      packageName: pkgDetails.name,
      trainerName: String(trainerData.displayName || 'FitPlus Coach'),
      isLiveMode: razorpayConfig.isLive,
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Create payment order error:', error);
    return res.status(500).json({
      ok: false,
      code: 'payment/order-failed',
      error: 'Unable to initialize checkout right now.',
    });
  }
}
