import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminContext, isFirebaseAdminConfigured } from '../_lib/firebaseAdmin.js';
import {
  activateEnrollmentFromPayment,
  buildDeterministicWebhookEventId,
  getCashfreeConfig,
  recordNonCapturedPaymentState,
  verifyCashfreeWebhookSignature,
} from '../_lib/payments.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawRequestBody(req: VercelRequest): Promise<Buffer> {
  const withRaw = req as VercelRequest & { rawBody?: Buffer | string };
  if (Buffer.isBuffer(withRaw.rawBody)) return withRaw.rawBody;
  if (typeof withRaw.rawBody === 'string') return Buffer.from(withRaw.rawBody, 'utf8');
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length > 0) {
    return Buffer.concat(chunks);
  }
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }
  return Buffer.alloc(0);
}

interface CashfreeWebhookPayload {
  type?: string;
  event_time?: string;
  data?: {
    order?: {
      order_id?: string;
      order_amount?: number;
      order_currency?: string;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
      payment_amount?: number;
      payment_currency?: string;
      payment_group?: string;
      payment_message?: string;
    };
    refund?: {
      cf_refund_id?: string;
      refund_id?: string;
      order_id?: string;
      refund_status?: string;
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const cashfreeConfig = getCashfreeConfig();
  if (!cashfreeConfig.isConfigured) {
    return res.status(503).json({
      ok: false,
      code: 'payment/webhook-unconfigured',
      error: 'Cashfree credentials are not configured on this server.',
    });
  }

  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({
      ok: false,
      code: 'server/admin-unconfigured',
      error: 'Firebase Admin credentials are not configured on this server.',
    });
  }

  try {
    const rawBody = await readRawRequestBody(req);
    const sigHeader = req.headers['x-webhook-signature'];
    const tsHeader = req.headers['x-webhook-timestamp'];
    const idempotencyHeader = req.headers['x-webhook-id'] || req.headers['x-idempotency-key'];

    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader || '';
    const timestamp = Array.isArray(tsHeader) ? tsHeader[0] : tsHeader || '';
    const headerEventId = Array.isArray(idempotencyHeader)
      ? idempotencyHeader[0]
      : idempotencyHeader || undefined;

    if (
      !verifyCashfreeWebhookSignature({
        timestamp,
        rawBody,
        signature,
        secretKey: cashfreeConfig.secretKey,
      })
    ) {
      return res.status(401).json({
        ok: false,
        code: 'payment/invalid-webhook-signature',
        error: 'Invalid Cashfree webhook signature.',
      });
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as CashfreeWebhookPayload;
    const eventType = String(payload.type || '').toUpperCase();
    const orderId = payload.data?.order?.order_id || payload.data?.refund?.order_id;
    const cfPaymentId = payload.data?.payment?.cf_payment_id
      ? String(payload.data.payment.cf_payment_id)
      : undefined;
    const paymentStatus = String(payload.data?.payment?.payment_status || '').toUpperCase();
    const paymentMethod = payload.data?.payment?.payment_group
      ? String(payload.data.payment.payment_group)
      : undefined;

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const { db } = getFirebaseAdminContext();
    const paymentsSnap = await db
      .collection('payments')
      .where('providerOrderId', '==', orderId)
      .limit(1)
      .get();

    if (paymentsSnap.empty) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'order_not_tracked' });
    }

    const paymentDoc = paymentsSnap.docs[0];
    const paymentData = paymentDoc.data();
    const webhookEventId = buildDeterministicWebhookEventId({
      headerEventId,
      timestamp,
      eventType,
      orderId,
      cfPaymentId,
      paymentStatus,
    });

    if (paymentData.webhookEventId === webhookEventId) {
      return res.status(200).json({ ok: true, deduplicated: true, event: eventType });
    }

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || (eventType.includes('PAYMENT') && paymentStatus === 'SUCCESS')) {
      const paidAmountPaise = Math.round(
        Number(payload.data?.payment?.payment_amount ?? payload.data?.order?.order_amount ?? 0) * 100,
      );
      if (paidAmountPaise > 0 && paidAmountPaise !== Number(paymentData.amountPaise)) {
        return res.status(400).json({
          ok: false,
          code: 'payment/amount-mismatch',
          error: 'Webhook payment amount mismatch.',
        });
      }

      await activateEnrollmentFromPayment({
        db,
        paymentId: paymentDoc.id,
        providerPaymentId: cfPaymentId,
        paymentMethod,
        webhookEventId,
        actorUserId: String(paymentData.clientUserId),
      });
    } else if (eventType === 'PAYMENT_USER_DROPPED_WEBHOOK' || paymentStatus === 'USER_DROPPED') {
      await recordNonCapturedPaymentState({
        db,
        paymentId: paymentDoc.id,
        nextStatus: 'cancelled',
        providerPaymentId: cfPaymentId,
        paymentMethod,
        failureReason: String(
          payload.data?.payment?.payment_message || 'User closed checkout before completing payment',
        ),
        webhookEventId,
      });
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK' || paymentStatus === 'FAILED') {
      await recordNonCapturedPaymentState({
        db,
        paymentId: paymentDoc.id,
        nextStatus: 'failed',
        providerPaymentId: cfPaymentId,
        paymentMethod,
        failureReason: String(
          payload.data?.payment?.payment_message || 'Payment failed at Cashfree gateway',
        ),
        webhookEventId,
      });
    } else if (eventType === 'REFUND_STATUS_WEBHOOK' && payload.data?.refund) {
      const rfStatus = String(payload.data.refund.refund_status || '').toUpperCase();
      const normalizedRefundStatus =
        rfStatus === 'SUCCESS'
          ? 'processed'
          : rfStatus === 'CANCELLED' || rfStatus === 'ONHOLD'
            ? 'failed'
            : 'pending';
      await paymentDoc.ref.update({
        refundStatus: normalizedRefundStatus,
        ...(normalizedRefundStatus === 'processed' ? { status: 'refunded' } : {}),
        webhookEventId,
        lastWebhookAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({ ok: true, event: eventType, webhookEventId });
  } catch (error) {
    console.error('Cashfree webhook error:', error);
    return res.status(500).json({ ok: false, error: 'Webhook processing error' });
  }
}
