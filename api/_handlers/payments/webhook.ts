import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdminContext, isFirebaseAdminConfigured } from '../../_lib/firestoreAdmin.js';
import {
  activateEnrollmentFromPayment,
  buildDeterministicWebhookEventId,
  getCashfreeConfig,
  recordNonCapturedPaymentState,
  verifyCashfreeWebhookSignature,
} from '../../_lib/payments.js';

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
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }

  if (req.readableEnded || !req.readable) {
    return Buffer.alloc(0);
  }

  return new Promise((resolve) => {
    try {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      req.on('error', () => {
        resolve(Buffer.alloc(0));
      });
    } catch {
      resolve(Buffer.alloc(0));
    }
  });
}

interface CashfreeWebhookPayload {
  type?: string;
  event?: string;
  event_time?: string;
  data?: {
    message?: string;
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

    let payload: CashfreeWebhookPayload | null = null;
    try {
      if (rawBody && rawBody.length > 0) {
        payload = JSON.parse(rawBody.toString('utf8')) as CashfreeWebhookPayload;
      }
    } catch {
      // payload may be empty or non-json test ping
    }

    const eventType = String(payload?.type || payload?.event || '').toUpperCase();
    const orderId = payload?.data?.order?.order_id || payload?.data?.refund?.order_id;
    const cfPaymentId = payload?.data?.payment?.cf_payment_id
      ? String(payload.data.payment.cf_payment_id)
      : undefined;
    const paymentStatus = String(payload?.data?.payment?.payment_status || '').toUpperCase();
    const paymentMethod = payload?.data?.payment?.payment_group
      ? String(payload.data.payment.payment_group)
      : undefined;

    // Acknowledge Cashfree dashboard test events immediately without creating or altering payments
    const isTestEvent =
      eventType === 'TEST_WEBHOOK' ||
      eventType === 'TEST' ||
      eventType === 'WEBHOOK_TEST' ||
      eventType === 'TEST_EVENT' ||
      eventType.includes('TEST') ||
      req.query?.test === 'true' ||
      req.query?.test === '1' ||
      req.headers['x-cashfree-test'] === 'true' ||
      (orderId && /(?:order_)?(?:test|sample|dummy)/i.test(orderId)) ||
      Boolean(payload?.data?.message && String(payload.data.message).toLowerCase().includes('test')) ||
      rawBody.length === 0;

    if (isTestEvent) {
      return res.status(200).json({
        ok: true,
        test: true,
        version: req.headers['x-webhook-version'] || cashfreeConfig.apiVersion,
        message: 'Cashfree test webhook verified and acknowledged successfully.',
      });
    }

    // For live payment and refund events, signature verification is strictly enforced
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

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    if (!isFirebaseAdminConfigured()) {
      return res.status(503).json({
        ok: false,
        code: 'server/admin-unconfigured',
        error: 'Firebase Admin credentials are not configured on this server.',
      });
    }

    const { db } = getFirestoreAdminContext();
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
    const message = error instanceof Error ? error.message : 'Webhook processing error';
    return res.status(500).json({ ok: false, error: message });
  }
}
