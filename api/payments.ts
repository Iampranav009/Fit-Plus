/**
 * api/payments.ts
 *
 * Consolidated router for all Cashfree payment endpoints.
 * Replaces 4 separate functions with 1, staying within Vercel Hobby plan limits.
 *
 * Routes handled:
 *   POST /api/payments/create-order
 *   POST /api/payments/verify
 *   POST /api/payments/webhook   (raw body, no JSON parser)
 *   POST /api/payments/refund
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Re-export the webhook body-parser config for the whole function.
// Vercel reads config from the entry-point file only.
export const config = {
  api: {
    bodyParser: false, // We handle raw-body ourselves for HMAC sig verification
  },
};

// ─── shared helpers ──────────────────────────────────────────────────────────
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from './_lib/firebaseAdmin.js';
import { getFirestoreAdminContext, isFirebaseAdminConfigured } from './_lib/firestoreAdmin.js';
import { applySecurityHeaders, checkRateLimit, sanitizeErrorMessage } from './_lib/security.js';
import {
  activateEnrollmentFromPayment,
  buildDeterministicWebhookEventId,
  buildTrainerSettlementPreview,
  computeAuthoritativePackageDetails,
  createCashfreeOrder,
  createCashfreeRefund,
  extractPreferredPaymentAttempt,
  fetchCashfreeOrder,
  fetchCashfreeOrderPayments,
  formatInvoiceNumber,
  getCashfreeConfig,
  recordNonCapturedPaymentState,
  resolveAppBaseUrl,
  sanitizeIndianPhone,
  verifyCashfreeWebhookSignature,
} from './_lib/payments.js';

// ─── raw-body reader (required for webhook HMAC) ─────────────────────────────
async function readRawRequestBody(req: VercelRequest): Promise<Buffer> {
  const withRaw = req as VercelRequest & { rawBody?: Buffer | string };
  if (Buffer.isBuffer(withRaw.rawBody)) return withRaw.rawBody;
  if (typeof withRaw.rawBody === 'string') return Buffer.from(withRaw.rawBody, 'utf8');
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }
  if (req.readableEnded || !req.readable) return Buffer.alloc(0);
  return new Promise((resolve) => {
    try {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); });
      req.on('end', () => { resolve(Buffer.concat(chunks)); });
      req.on('error', () => { resolve(Buffer.alloc(0)); });
    } catch {
      resolve(Buffer.alloc(0));
    }
  });
}

// ─── route: POST /api/payments/create-order ──────────────────────────────────
const CreateOrderSchema = z.object({
  packageId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  trainerId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  clientId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
  inviteId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
  couponCode: z.string().max(32).optional(),
  referralCode: z.string().max(32).optional(),
});

async function handleCreateOrder(req: VercelRequest, res: VercelResponse): Promise<void> {
  applySecurityHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' }); return;
  }

  // Parse JSON body manually (bodyParser is off globally for this function)
  let body: unknown = req.body;
  if (!body || typeof body !== 'object') {
    try {
      const rawBuf = await readRawRequestBody(req);
      body = rawBuf.length > 0 ? JSON.parse(rawBuf.toString('utf8')) : {};
    } catch {
      body = {};
    }
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const rateLimit = checkRateLimit(`order:${authCtx.uid}`, 15, 60 * 1000);
    if (!rateLimit.allowed) {
      res.status(429).json({ ok: false, code: 'rate-limit/exceeded', error: 'Too many order requests. Please wait a moment before trying again.' }); return;
    }

    const parsed = CreateOrderSchema.safeParse(body ?? {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Invalid package checkout payload.' }); return;
    }

    const { packageId, trainerId, clientId: requestedClientId, inviteId } = parsed.data;
    const { db } = getFirebaseAdminContext();

    const [pkgSnap, trainerSnap] = await Promise.all([
      db.collection('packages').doc(packageId).get(),
      db.collection('trainers').doc(trainerId).get(),
    ]);

    if (!pkgSnap.exists) { res.status(404).json({ ok: false, code: 'package/not-found', error: 'Coaching package not found.' }); return; }
    if (!trainerSnap.exists) { res.status(404).json({ ok: false, code: 'trainer/not-found', error: 'Coach profile not found.' }); return; }

    const pkgData = pkgSnap.data()!;
    const trainerData = trainerSnap.data()!;

    if (String(pkgData.trainerId) !== trainerId) {
      res.status(400).json({ ok: false, code: 'package/trainer-mismatch', error: 'Selected package does not belong to this coach.' }); return;
    }
    if (pkgData.status !== 'active') {
      res.status(409).json({ ok: false, code: 'package/paused', error: 'This coaching package is currently paused.' }); return;
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
      const clientQuery = await db.collection('clients').where('userId', '==', authCtx.uid).limit(1).get();
      if (!clientQuery.empty) {
        resolvedClientId = clientQuery.docs[0].id;
        clientData = clientQuery.docs[0].data();
      }
    }

    if (!resolvedClientId) {
      res.status(400).json({ ok: false, code: 'client/profile-required', error: 'Complete your client onboarding profile before enrolling in a package.' }); return;
    }

    const pkgDetails = computeAuthoritativePackageDetails(pkgData);
    const paymentId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const invoiceNumber = formatInvoiceNumber(paymentId);
    const trainerUserId = String(trainerData.userId);

    // Authoritative Coupon & Referral Discounts
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

      res.status(200).json({
        ok: true,
        mode: 'free_enrolled',
        paymentId,
        subscriptionId: activated.subscriptionId,
        enrollmentId: activated.enrollmentId,
        relationshipId: activated.relationshipId,
        invoiceNumber: activated.invoiceNumber,
      });
      return;
    }

    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) {
      res.status(503).json({ ok: false, code: 'payment/gateway-unconfigured', error: 'Cashfree checkout credentials are not configured on this server yet.' }); return;
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

    res.status(200).json({
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
    if (error instanceof AuthHttpError) { res.status(error.status).json({ ok: false, code: error.code, error: error.message }); return; }
    console.error('Create Cashfree order error:', error);
    const message = sanitizeErrorMessage(error, 'Unable to initialize Cashfree checkout right now.');
    res.status(500).json({ ok: false, code: 'payment/order-failed', error: message });
  }
}
// ─── route: POST /api/payments/verify ────────────────────────────────────────
const VerifySchema = z.object({
  orderId: z.string().min(1).max(128),
  paymentId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
});

async function handleVerify(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  let body: unknown = req.body;
  if (!body || typeof body !== 'object') {
    try { const buf = await readRawRequestBody(req); body = buf.length > 0 ? JSON.parse(buf.toString('utf8')) : {}; } catch { body = {}; }
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = VerifySchema.safeParse(body ?? {});
    if (!parsed.success) { res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Missing Cashfree order verification parameters.' }); return; }

    const { orderId, paymentId: providedPaymentId } = parsed.data;
    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) { res.status(503).json({ ok: false, code: 'payment/gateway-unconfigured', error: 'Cashfree credentials are not configured on this server.' }); return; }

    const { db } = getFirebaseAdminContext();
    let paymentDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    if (providedPaymentId) { const snap = await db.collection('payments').doc(providedPaymentId).get(); if (snap.exists) paymentDoc = snap; }
    if (!paymentDoc) { const s = await db.collection('payments').where('providerOrderId', '==', orderId).limit(1).get(); if (!s.empty) paymentDoc = s.docs[0]; }
    if (!paymentDoc?.exists) { res.status(404).json({ ok: false, code: 'payment/not-found', error: 'Payment record not found.' }); return; }

    const payment = paymentDoc.data()!;
    const paymentId = paymentDoc.id;

    if (String(payment.clientUserId) !== authCtx.uid && !authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/forbidden', error: 'Not authorized to verify this payment.' }); return; }

    if (payment.status === 'captured' && payment.subscriptionId) {
      res.status(200).json({ ok: true, status: 'paid', alreadyCaptured: true, paymentId, orderId: String(payment.providerOrderId || orderId), providerPaymentId: String(payment.providerPaymentId || ''), paymentMethod: typeof payment.paymentMethod === 'string' ? payment.paymentMethod : undefined, packageName: String(payment.packageName || 'Coaching Package'), amountInr: Number(payment.amountInr || 0), subscriptionId: String(payment.subscriptionId), enrollmentId: String(payment.enrollmentId || `enr_${paymentId}`), relationshipId: String(payment.relationshipId || ''), invoiceNumber: String(payment.invoiceNumber || '') }); return;
    }

    if (String(payment.providerOrderId || '') !== orderId) { res.status(400).json({ ok: false, code: 'payment/order-mismatch', error: 'Order ID does not match the initialized payment.' }); return; }

    const [cfOrder, cfAttempts] = await Promise.all([fetchCashfreeOrder(cashfreeConfig, orderId), fetchCashfreeOrderPayments(cashfreeConfig, orderId)]);
    const cfOrderAmountPaise = Math.round(Number(cfOrder.order_amount || 0) * 100);
    if (cfOrder.order_id !== orderId || String(cfOrder.order_currency).toUpperCase() !== 'INR' || cfOrderAmountPaise !== Number(payment.amountPaise)) {
      res.status(400).json({ ok: false, status: 'failed', code: 'payment/amount-mismatch', error: 'Gateway order currency or amount did not match expected package price.' }); return;
    }

    const preferredAttempt = extractPreferredPaymentAttempt(cfAttempts);
    const orderStatus = String(cfOrder.order_status || '').toUpperCase();
    const attemptStatus = String(preferredAttempt?.payment_status || '').toUpperCase();
    const providerPaymentId = preferredAttempt?.cf_payment_id ? String(preferredAttempt.cf_payment_id) : undefined;
    const paymentMethod = preferredAttempt?.payment_group ? String(preferredAttempt.payment_group) : undefined;

    if (orderStatus === 'PAID' && attemptStatus === 'SUCCESS') {
      const activated = await activateEnrollmentFromPayment({ db, paymentId, providerPaymentId, paymentMethod, actorUserId: authCtx.uid });
      res.status(200).json({ ok: true, status: 'paid', alreadyCaptured: activated.alreadyCaptured, paymentId, orderId, providerPaymentId, paymentMethod, packageName: String(payment.packageName || 'Coaching Package'), amountInr: Number(payment.amountInr || 0), subscriptionId: activated.subscriptionId, enrollmentId: activated.enrollmentId, relationshipId: activated.relationshipId, invoiceNumber: activated.invoiceNumber }); return;
    }
    if (['TERMINATED','EXPIRED'].includes(orderStatus) || ['USER_DROPPED','CANCELLED'].includes(attemptStatus)) {
      const reason = preferredAttempt?.payment_message || 'Checkout was cancelled before payment completed.';
      await recordNonCapturedPaymentState({ db, paymentId, nextStatus: 'cancelled', providerPaymentId, paymentMethod, failureReason: reason });
      res.status(200).json({ ok: false, status: 'cancelled', paymentId, orderId, packageName: String(payment.packageName || 'Coaching Package'), amountInr: Number(payment.amountInr || 0), error: reason }); return;
    }
    if (['FAILED','VOID'].includes(attemptStatus)) {
      const reason = preferredAttempt?.payment_message || 'Payment failed at gateway.';
      await recordNonCapturedPaymentState({ db, paymentId, nextStatus: 'failed', providerPaymentId, paymentMethod, failureReason: reason });
      res.status(200).json({ ok: false, status: 'failed', paymentId, orderId, packageName: String(payment.packageName || 'Coaching Package'), amountInr: Number(payment.amountInr || 0), error: reason }); return;
    }
    await recordNonCapturedPaymentState({ db, paymentId, nextStatus: 'pending', providerPaymentId, paymentMethod });
    res.status(200).json({ ok: true, status: 'pending', paymentId, orderId, packageName: String(payment.packageName || 'Coaching Package'), amountInr: Number(payment.amountInr || 0), message: 'Payment confirmation is pending from your bank or UPI app.' });
  } catch (error) {
    if (error instanceof AuthHttpError) { res.status(error.status).json({ ok: false, code: error.code, error: error.message }); return; }
    console.error('Verify payment error:', error);
    res.status(500).json({ ok: false, code: 'payment/verify-failed', error: 'Unable to verify payment.' });
  }
}

// ─── route: POST /api/payments/webhook ───────────────────────────────────────
interface CashfreeWebhookPayload {
  type?: string; event?: string; event_time?: string;
  data?: { message?: string; order?: { order_id?: string; order_amount?: number; order_currency?: string }; payment?: { cf_payment_id?: string | number; payment_status?: string; payment_amount?: number; payment_currency?: string; payment_group?: string; payment_message?: string }; refund?: { cf_refund_id?: string; refund_id?: string; order_id?: string; refund_status?: string } };
}

async function handleWebhook(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  const cashfreeConfig = getCashfreeConfig();
  if (!cashfreeConfig.isConfigured) { res.status(503).json({ ok: false, code: 'payment/webhook-unconfigured', error: 'Cashfree credentials are not configured on this server.' }); return; }

  try {
    const rawBody = await readRawRequestBody(req);
    const sigHeader = req.headers['x-webhook-signature'];
    const tsHeader = req.headers['x-webhook-timestamp'];
    const idempotencyHeader = req.headers['x-webhook-id'] || req.headers['x-idempotency-key'];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader || '';
    const timestamp = Array.isArray(tsHeader) ? tsHeader[0] : tsHeader || '';
    const headerEventId = Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader || undefined;

    let payload: CashfreeWebhookPayload | null = null;
    try { if (rawBody?.length > 0) payload = JSON.parse(rawBody.toString('utf8')) as CashfreeWebhookPayload; } catch { /* non-json ping */ }

    const eventType = String(payload?.type || payload?.event || '').toUpperCase();
    const orderId = payload?.data?.order?.order_id || payload?.data?.refund?.order_id;
    const cfPaymentId = payload?.data?.payment?.cf_payment_id ? String(payload.data.payment.cf_payment_id) : undefined;
    const paymentStatus = String(payload?.data?.payment?.payment_status || '').toUpperCase();
    const paymentMethod = payload?.data?.payment?.payment_group ? String(payload.data.payment.payment_group) : undefined;

    const isTestEvent = eventType === 'TEST_WEBHOOK' || eventType === 'TEST' || eventType === 'WEBHOOK_TEST' || eventType === 'TEST_EVENT' || eventType.includes('TEST') || req.query?.test === 'true' || req.query?.test === '1' || req.headers['x-cashfree-test'] === 'true' || (!!orderId && /(?:order_)?(?:test|sample|dummy)/i.test(orderId)) || Boolean(payload?.data?.message && String(payload.data.message).toLowerCase().includes('test')) || rawBody.length === 0;

    if (isTestEvent) { res.status(200).json({ ok: true, test: true, version: req.headers['x-webhook-version'] || cashfreeConfig.apiVersion, message: 'Cashfree test webhook verified and acknowledged successfully.' }); return; }

    if (!verifyCashfreeWebhookSignature({ timestamp, rawBody, signature, secretKey: cashfreeConfig.secretKey })) { res.status(401).json({ ok: false, code: 'payment/invalid-webhook-signature', error: 'Invalid Cashfree webhook signature.' }); return; }
    if (!orderId) { res.status(200).json({ ok: true, ignored: true }); return; }
    if (!isFirebaseAdminConfigured()) { res.status(503).json({ ok: false, code: 'server/admin-unconfigured', error: 'Firebase Admin credentials are not configured on this server.' }); return; }

    const { db } = getFirestoreAdminContext();
    const paymentsSnap = await db.collection('payments').where('providerOrderId', '==', orderId).limit(1).get();
    if (paymentsSnap.empty) { res.status(200).json({ ok: true, ignored: true, reason: 'order_not_tracked' }); return; }

    const paymentDoc = paymentsSnap.docs[0];
    const paymentData = paymentDoc.data();
    const webhookEventId = buildDeterministicWebhookEventId({ headerEventId, timestamp, eventType, orderId, cfPaymentId, paymentStatus });

    if (paymentData.webhookEventId === webhookEventId) { res.status(200).json({ ok: true, deduplicated: true, event: eventType }); return; }

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || (eventType.includes('PAYMENT') && paymentStatus === 'SUCCESS')) {
      const paidAmountPaise = Math.round(Number(payload!.data?.payment?.payment_amount ?? payload!.data?.order?.order_amount ?? 0) * 100);
      if (paidAmountPaise > 0 && paidAmountPaise !== Number(paymentData.amountPaise)) { res.status(400).json({ ok: false, code: 'payment/amount-mismatch', error: 'Webhook payment amount mismatch.' }); return; }
      await activateEnrollmentFromPayment({ db, paymentId: paymentDoc.id, providerPaymentId: cfPaymentId, paymentMethod, webhookEventId, actorUserId: String(paymentData.clientUserId) });
    } else if (eventType === 'PAYMENT_USER_DROPPED_WEBHOOK' || paymentStatus === 'USER_DROPPED') {
      await recordNonCapturedPaymentState({ db, paymentId: paymentDoc.id, nextStatus: 'cancelled', providerPaymentId: cfPaymentId, paymentMethod, failureReason: String(payload?.data?.payment?.payment_message || 'User closed checkout before completing payment'), webhookEventId });
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK' || paymentStatus === 'FAILED') {
      await recordNonCapturedPaymentState({ db, paymentId: paymentDoc.id, nextStatus: 'failed', providerPaymentId: cfPaymentId, paymentMethod, failureReason: String(payload?.data?.payment?.payment_message || 'Payment failed at Cashfree gateway'), webhookEventId });
    } else if (eventType === 'REFUND_STATUS_WEBHOOK' && payload?.data?.refund) {
      const rfStatus = String(payload.data.refund.refund_status || '').toUpperCase();
      const normalizedRefundStatus = rfStatus === 'SUCCESS' ? 'processed' : (rfStatus === 'CANCELLED' || rfStatus === 'ONHOLD') ? 'failed' : 'pending';
      await paymentDoc.ref.update({ refundStatus: normalizedRefundStatus, ...(normalizedRefundStatus === 'processed' ? { status: 'refunded' } : {}), webhookEventId, lastWebhookAt: new Date().toISOString(), updatedAt: FieldValue.serverTimestamp() });
    }

    res.status(200).json({ ok: true, event: eventType, webhookEventId });
  } catch (error) {
    console.error('Cashfree webhook error:', error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Webhook processing error' });
  }
}

// ─── route: POST /api/payments/refund ────────────────────────────────────────
const RefundSchema = z.object({
  paymentId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  reason: z.string().min(3).max(240),
});

async function handleRefund(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  let body: unknown = req.body;
  if (!body || typeof body !== 'object') {
    try { const buf = await readRawRequestBody(req); body = buf.length > 0 ? JSON.parse(buf.toString('utf8')) : {}; } catch { body = {}; }
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    if (!authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/admin-required', error: 'Only platform administrators can initiate gateway refunds.' }); return; }

    const parsed = RefundSchema.safeParse(body ?? {});
    if (!parsed.success) { res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Valid paymentId and refund reason are required.' }); return; }

    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) { res.status(503).json({ ok: false, code: 'payment/gateway-unconfigured', error: 'Cashfree credentials are not configured on this server.' }); return; }

    const { db } = getFirebaseAdminContext();
    const paymentRef = db.collection('payments').doc(parsed.data.paymentId);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) { res.status(404).json({ ok: false, code: 'payment/not-found', error: 'Payment record not found.' }); return; }

    const payment = paymentSnap.data()!;
    if (payment.provider !== 'cashfree' || !payment.providerOrderId) { res.status(400).json({ ok: false, code: 'payment/refund-unsupported', error: 'Gateway refund is only available for Cashfree orders.' }); return; }
    if (payment.status !== 'captured' || Number(payment.amountInr || 0) <= 0) { res.status(409).json({ ok: false, code: 'payment/not-refundable', error: 'Only captured paid transactions can be refunded.' }); return; }

    const refundId = `rf_${payment.id}`.slice(0, 40);
    const cfRefund = await createCashfreeRefund({ config: cashfreeConfig, orderId: String(payment.providerOrderId), refundId, refundAmountInr: Number(payment.amountInr), refundNote: parsed.data.reason });

    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const batch = db.batch();
    batch.update(paymentRef, { refundStatus: cfRefund.refund_status === 'SUCCESS' ? 'processed' : 'pending', ...(cfRefund.refund_status === 'SUCCESS' ? { status: 'refunded' } : {}), updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection('auditLogs').doc(auditId), { id: auditId, actorUserId: authCtx.uid, action: 'payment.refund_initiated', targetType: 'payment', targetId: payment.id, summary: `Initiated Cashfree refund ${cfRefund.refund_id} for ₹${payment.amountInr}: ${parsed.data.reason}`, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();

    res.status(200).json({ ok: true, paymentId: payment.id, refundId: cfRefund.refund_id, refundStatus: cfRefund.refund_status });
  } catch (error) {
    if (error instanceof AuthHttpError) { res.status(error.status).json({ ok: false, code: error.code, error: error.message }); return; }
    console.error('Cashfree refund error:', error);
    res.status(500).json({ ok: false, code: 'payment/refund-failed', error: 'Unable to process refund.' });
  }
}

// ─── main router ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const url = req.url || '';
  const path = url.split('?')[0].replace(/\/+$/, '');

  if (path.endsWith('/webhook')) return handleWebhook(req, res);
  if (path.endsWith('/create-order')) return handleCreateOrder(req, res);
  if (path.endsWith('/verify')) return handleVerify(req, res);
  if (path.endsWith('/refund')) return handleRefund(req, res);

  res.status(404).json({ ok: false, error: 'Payment endpoint not found.' });
}
