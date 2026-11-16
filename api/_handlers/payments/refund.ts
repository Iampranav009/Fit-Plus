import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../../_lib/firebaseAdmin.js';
import { createCashfreeRefund, getCashfreeConfig } from '../../_lib/payments.js';

const RefundSchema = z.object({
  paymentId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  reason: z.string().min(3).max(240),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    if (!authCtx.isAdmin) {
      return res.status(403).json({
        ok: false,
        code: 'auth/admin-required',
        error: 'Only platform administrators can initiate gateway refunds.',
      });
    }

    const parsed = RefundSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'validation/invalid-input',
        error: 'Valid paymentId and refund reason are required.',
      });
    }

    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) {
      return res.status(503).json({
        ok: false,
        code: 'payment/gateway-unconfigured',
        error: 'Cashfree credentials are not configured on this server.',
      });
    }

    const { db } = getFirebaseAdminContext();
    const paymentRef = db.collection('payments').doc(parsed.data.paymentId);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      return res.status(404).json({ ok: false, code: 'payment/not-found', error: 'Payment record not found.' });
    }

    const payment = paymentSnap.data()!;
    if (payment.provider !== 'cashfree' || !payment.providerOrderId) {
      return res.status(400).json({
        ok: false,
        code: 'payment/refund-unsupported',
        error: 'Gateway refund is only available for Cashfree orders.',
      });
    }

    if (payment.status !== 'captured' || Number(payment.amountInr || 0) <= 0) {
      return res.status(409).json({
        ok: false,
        code: 'payment/not-refundable',
        error: 'Only captured paid transactions can be refunded.',
      });
    }

    const refundId = `rf_${payment.id}`.slice(0, 40);
    const cfRefund = await createCashfreeRefund({
      config: cashfreeConfig,
      orderId: String(payment.providerOrderId),
      refundId,
      refundAmountInr: Number(payment.amountInr),
      refundNote: parsed.data.reason,
    });

    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const batch = db.batch();
    batch.update(paymentRef, {
      refundStatus: cfRefund.refund_status === 'SUCCESS' ? 'processed' : 'pending',
      ...(cfRefund.refund_status === 'SUCCESS' ? { status: 'refunded' } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection('auditLogs').doc(auditId), {
      id: auditId,
      actorUserId: authCtx.uid,
      action: 'payment.refund_initiated',
      targetType: 'payment',
      targetId: payment.id,
      summary: `Initiated Cashfree refund ${cfRefund.refund_id} for ₹${payment.amountInr}: ${parsed.data.reason}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return res.status(200).json({
      ok: true,
      paymentId: payment.id,
      refundId: cfRefund.refund_id,
      refundStatus: cfRefund.refund_status,
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Cashfree refund error:', error);
    return res.status(500).json({ ok: false, code: 'payment/refund-failed', error: 'Unable to process refund.' });
  }
}
