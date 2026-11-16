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
  getRazorpayConfig,
  verifyRazorpayCheckoutSignature,
} from '../_lib/payments.js';

const VerifySchema = z.object({
  paymentId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  razorpayOrderId: z.string().min(1).max(128),
  razorpayPaymentId: z.string().min(1).max(128),
  razorpaySignature: z.string().min(1).max(256),
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
        error: 'Missing Razorpay verification parameters.',
      });
    }

    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;
    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig.isConfigured) {
      return res.status(503).json({
        ok: false,
        code: 'payment/gateway-unconfigured',
        error: 'Razorpay credentials are not configured on this server.',
      });
    }

    const { db } = getFirebaseAdminContext();
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      return res.status(404).json({ ok: false, code: 'payment/not-found', error: 'Payment record not found.' });
    }

    const payment = paymentSnap.data()!;
    if (String(payment.clientUserId) !== authCtx.uid && !authCtx.isAdmin) {
      return res.status(403).json({ ok: false, code: 'auth/forbidden', error: 'Not authorized to verify this payment.' });
    }

    if (payment.status === 'captured' && payment.subscriptionId) {
      return res.status(200).json({
        ok: true,
        alreadyCaptured: true,
        paymentId,
        subscriptionId: String(payment.subscriptionId),
        enrollmentId: String(payment.enrollmentId || `enr_${paymentId}`),
        invoiceNumber: String(payment.invoiceNumber || ''),
      });
    }

    if (String(payment.razorpayOrderId || '') !== razorpayOrderId) {
      return res.status(400).json({
        ok: false,
        code: 'payment/order-mismatch',
        error: 'Order ID does not match the initialized payment.',
      });
    }

    const signatureValid = verifyRazorpayCheckoutSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpayConfig.keySecret,
    );

    if (!signatureValid) {
      await paymentRef.update({
        status: 'failed',
        failureReason: 'Signature verification failed',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return res.status(400).json({
        ok: false,
        code: 'payment/invalid-signature',
        error: 'Payment signature verification failed.',
      });
    }

    const activated = await activateEnrollmentFromPayment({
      db,
      paymentId,
      razorpayPaymentId,
      actorUserId: authCtx.uid,
    });

    return res.status(200).json({
      ok: true,
      alreadyCaptured: activated.alreadyCaptured,
      paymentId,
      subscriptionId: activated.subscriptionId,
      enrollmentId: activated.enrollmentId,
      relationshipId: activated.relationshipId,
      invoiceNumber: activated.invoiceNumber,
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Verify payment error:', error);
    return res.status(500).json({ ok: false, code: 'payment/verify-failed', error: 'Unable to verify payment.' });
  }
}
