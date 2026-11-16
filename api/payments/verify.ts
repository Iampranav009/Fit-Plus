import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../_lib/firebaseAdmin.js';
import {
  activateEnrollmentFromPayment,
  extractPreferredPaymentAttempt,
  fetchCashfreeOrder,
  fetchCashfreeOrderPayments,
  getCashfreeConfig,
  recordNonCapturedPaymentState,
} from '../_lib/payments.js';

const VerifySchema = z.object({
  orderId: z.string().min(1).max(128),
  paymentId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = VerifySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'validation/invalid-input',
        error: 'Missing Cashfree order verification parameters.',
      });
    }

    const { orderId, paymentId: providedPaymentId } = parsed.data;
    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) {
      return res.status(503).json({
        ok: false,
        code: 'payment/gateway-unconfigured',
        error: 'Cashfree credentials are not configured on this server.',
      });
    }

    const { db } = getFirebaseAdminContext();
    let paymentDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    if (providedPaymentId) {
      const snap = await db.collection('payments').doc(providedPaymentId).get();
      if (snap.exists) paymentDoc = snap;
    }
    if (!paymentDoc) {
      const byOrderSnap = await db
        .collection('payments')
        .where('providerOrderId', '==', orderId)
        .limit(1)
        .get();
      if (!byOrderSnap.empty) {
        paymentDoc = byOrderSnap.docs[0];
      }
    }

    if (!paymentDoc || !paymentDoc.exists) {
      return res.status(404).json({ ok: false, code: 'payment/not-found', error: 'Payment record not found.' });
    }

    const payment = paymentDoc.data()!;
    const paymentId = paymentDoc.id;

    if (String(payment.clientUserId) !== authCtx.uid && !authCtx.isAdmin) {
      return res.status(403).json({
        ok: false,
        code: 'auth/forbidden',
        error: 'Not authorized to verify this payment.',
      });
    }

    if (payment.status === 'captured' && payment.subscriptionId) {
      return res.status(200).json({
        ok: true,
        status: 'paid',
        alreadyCaptured: true,
        paymentId,
        orderId: String(payment.providerOrderId || payment.razorpayOrderId || orderId),
        providerPaymentId: String(payment.providerPaymentId || payment.razorpayPaymentId || ''),
        paymentMethod: typeof payment.paymentMethod === 'string' ? payment.paymentMethod : undefined,
        packageName: String(payment.packageName || 'Coaching Package'),
        amountInr: Number(payment.amountInr || 0),
        subscriptionId: String(payment.subscriptionId),
        enrollmentId: String(payment.enrollmentId || `enr_${paymentId}`),
        relationshipId: String(payment.relationshipId || ''),
        invoiceNumber: String(payment.invoiceNumber || ''),
      });
    }

    const expectedOrderId = String(payment.providerOrderId || '');
    if (expectedOrderId !== orderId) {
      return res.status(400).json({
        ok: false,
        code: 'payment/order-mismatch',
        error: 'Order ID does not match the initialized payment.',
      });
    }

    const [cfOrder, cfAttempts] = await Promise.all([
      fetchCashfreeOrder(cashfreeConfig, orderId),
      fetchCashfreeOrderPayments(cashfreeConfig, orderId),
    ]);

    const cfOrderAmountPaise = Math.round(Number(cfOrder.order_amount || 0) * 100);
    if (
      cfOrder.order_id !== orderId ||
      String(cfOrder.order_currency).toUpperCase() !== 'INR' ||
      cfOrderAmountPaise !== Number(payment.amountPaise)
    ) {
      return res.status(400).json({
        ok: false,
        status: 'failed',
        code: 'payment/amount-mismatch',
        error: 'Gateway order currency or amount did not match expected package price.',
      });
    }

    const preferredAttempt = extractPreferredPaymentAttempt(cfAttempts);
    const orderStatus = String(cfOrder.order_status || '').toUpperCase();
    const attemptStatus = String(preferredAttempt?.payment_status || '').toUpperCase();
    const providerPaymentId = preferredAttempt?.cf_payment_id
      ? String(preferredAttempt.cf_payment_id)
      : undefined;
    const paymentMethod = preferredAttempt?.payment_group
      ? String(preferredAttempt.payment_group)
      : undefined;

    if (orderStatus === 'PAID' && attemptStatus === 'SUCCESS') {
      const activated = await activateEnrollmentFromPayment({
        db,
        paymentId,
        providerPaymentId,
        paymentMethod,
        actorUserId: authCtx.uid,
      });

      return res.status(200).json({
        ok: true,
        status: 'paid',
        alreadyCaptured: activated.alreadyCaptured,
        paymentId,
        orderId,
        providerPaymentId,
        paymentMethod,
        packageName: String(payment.packageName || 'Coaching Package'),
        amountInr: Number(payment.amountInr || 0),
        subscriptionId: activated.subscriptionId,
        enrollmentId: activated.enrollmentId,
        relationshipId: activated.relationshipId,
        invoiceNumber: activated.invoiceNumber,
      });
    }

    if (
      orderStatus === 'TERMINATED' ||
      orderStatus === 'EXPIRED' ||
      attemptStatus === 'USER_DROPPED' ||
      attemptStatus === 'CANCELLED'
    ) {
      const reason =
        preferredAttempt?.payment_message || 'Checkout was cancelled before payment completed.';
      await recordNonCapturedPaymentState({
        db,
        paymentId,
        nextStatus: 'cancelled',
        providerPaymentId,
        paymentMethod,
        failureReason: reason,
      });
      return res.status(200).json({
        ok: false,
        status: 'cancelled',
        paymentId,
        orderId,
        packageName: String(payment.packageName || 'Coaching Package'),
        amountInr: Number(payment.amountInr || 0),
        error: reason,
      });
    }

    if (attemptStatus === 'FAILED' || attemptStatus === 'VOID') {
      const reason = preferredAttempt?.payment_message || 'Payment failed at gateway.';
      await recordNonCapturedPaymentState({
        db,
        paymentId,
        nextStatus: 'failed',
        providerPaymentId,
        paymentMethod,
        failureReason: reason,
      });
      return res.status(200).json({
        ok: false,
        status: 'failed',
        paymentId,
        orderId,
        packageName: String(payment.packageName || 'Coaching Package'),
        amountInr: Number(payment.amountInr || 0),
        error: reason,
      });
    }

    await recordNonCapturedPaymentState({
      db,
      paymentId,
      nextStatus: 'pending',
      providerPaymentId,
      paymentMethod,
    });

    return res.status(200).json({
      ok: true,
      status: 'pending',
      paymentId,
      orderId,
      packageName: String(payment.packageName || 'Coaching Package'),
      amountInr: Number(payment.amountInr || 0),
      message: 'Payment confirmation is pending from your bank or UPI app.',
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Verify Cashfree payment error:', error);
    return res.status(500).json({ ok: false, code: 'payment/verify-failed', error: 'Unable to verify payment.' });
  }
}
