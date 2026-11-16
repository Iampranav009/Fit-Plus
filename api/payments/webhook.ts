import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminContext, isFirebaseAdminConfigured } from '../_lib/firebaseAdmin.js';
import {
  activateEnrollmentFromPayment,
  getRazorpayConfig,
  verifyRazorpayWebhookSignature,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const razorpayConfig = getRazorpayConfig();
  if (!razorpayConfig.webhookSecret) {
    return res.status(503).json({
      ok: false,
      code: 'payment/webhook-unconfigured',
      error: 'Razorpay webhook secret is not configured on this server.',
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
    const sigHeader = req.headers['x-razorpay-signature'];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader || '';

    if (!verifyRazorpayWebhookSignature(rawBody, signature, razorpayConfig.webhookSecret)) {
      return res.status(401).json({
        ok: false,
        code: 'payment/invalid-webhook-signature',
        error: 'Invalid Razorpay webhook signature.',
      });
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            error_description?: string;
          };
        };
      };
    };

    const eventName = payload.event || '';
    const entity = payload.payload?.payment?.entity;
    const orderId = entity?.order_id;
    const razorpayPaymentId = entity?.id;

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const { db } = getFirebaseAdminContext();
    const paymentsSnap = await db
      .collection('payments')
      .where('razorpayOrderId', '==', orderId)
      .limit(1)
      .get();

    if (paymentsSnap.empty) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'order_not_tracked' });
    }

    const paymentDoc = paymentsSnap.docs[0];

    if (eventName === 'payment.captured') {
      await activateEnrollmentFromPayment({
        db,
        paymentId: paymentDoc.id,
        razorpayPaymentId,
        actorUserId: String(paymentDoc.data().clientUserId),
      });
    } else if (eventName === 'payment.failed') {
      const currentStatus = paymentDoc.data().status;
      if (currentStatus === 'created') {
        await paymentDoc.ref.update({
          status: 'failed',
          ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
          failureReason: String(entity?.error_description || 'Payment failed at gateway').slice(0, 240),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return res.status(200).json({ ok: true, event: eventName });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return res.status(500).json({ ok: false, error: 'Webhook processing error' });
  }
}
