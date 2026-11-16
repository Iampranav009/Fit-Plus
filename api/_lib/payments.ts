import crypto from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export type CashfreeEnvironment = 'sandbox' | 'production';

export interface CashfreeServerConfig {
  appId: string;
  secretKey: string;
  env: CashfreeEnvironment;
  apiVersion: string;
  baseUrl: string;
  isConfigured: boolean;
  isLive: boolean;
  easySplitEnabled: boolean;
}

export function getCashfreeConfig(): CashfreeServerConfig {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  const rawEnv = (process.env.CASHFREE_ENV || 'sandbox').trim().toLowerCase();
  const isProdKey =
    secretKey.startsWith('cfsk_ma_prod_') ||
    appId.startsWith('CF_PROD_') ||
    appId.startsWith('prod_');
  const env: CashfreeEnvironment = rawEnv === 'production' || isProdKey ? 'production' : 'sandbox';
  const apiVersion = (process.env.CASHFREE_API_VERSION || '2025-01-01').trim() || '2025-01-01';
  const baseUrl =
    env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  const easySplitEnabled = process.env.CASHFREE_EASY_SPLIT_ENABLED === 'true';

  return {
    appId,
    secretKey,
    env,
    apiVersion,
    baseUrl,
    isConfigured: Boolean(appId && secretKey),
    isLive: env === 'production',
    easySplitEnabled,
  };
}

export function resolveAppBaseUrl(headers?: {
  host?: string | string[];
  'x-forwarded-host'?: string | string[];
  'x-forwarded-proto'?: string | string[];
  origin?: string | string[];
}): string {
  const explicit = (process.env.APP_BASE_URL || process.env.APP_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const originHeader = Array.isArray(headers?.origin) ? headers?.origin[0] : headers?.origin;
  if (originHeader && /^https?:\/\//i.test(originHeader)) {
    return originHeader.replace(/\/+$/, '');
  }

  const forwardedHost = Array.isArray(headers?.['x-forwarded-host'])
    ? headers?.['x-forwarded-host'][0]
    : headers?.['x-forwarded-host'];
  const host = forwardedHost || (Array.isArray(headers?.host) ? headers?.host[0] : headers?.host);
  if (host) {
    const protoHeader = Array.isArray(headers?.['x-forwarded-proto'])
      ? headers?.['x-forwarded-proto'][0]
      : headers?.['x-forwarded-proto'];
    const proto = protoHeader || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  }

  return 'https://fitplus-kappa.vercel.app';
}

export function sanitizeIndianPhone(rawPhone?: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return '9999999999';
}

export function computeAuthoritativePackageDetails(pkgData: Record<string, unknown>): {
  name: string;
  cadence: 'monthly' | 'quarterly' | 'free';
  priceInr: number;
  amountPaise: number;
  durationDays: number;
  consultationsIncluded: number;
} {
  const cadenceRaw = String(pkgData.cadence || 'monthly');
  const cadence: 'monthly' | 'quarterly' | 'free' =
    cadenceRaw === 'quarterly' || cadenceRaw === 'free' ? cadenceRaw : 'monthly';
  const rawPrice = Number(pkgData.priceInr || 0);
  const priceInr = cadence === 'free' ? 0 : Math.max(0, Math.round(Number.isFinite(rawPrice) ? rawPrice : 0));
  const amountPaise = priceInr * 100;
  const rawDuration = Number(pkgData.durationDays || 0);
  const durationDays =
    Number.isFinite(rawDuration) && rawDuration >= 1
      ? Math.min(366, Math.round(rawDuration))
      : cadence === 'quarterly'
        ? 90
        : 30;
  const rawConsultations = Number(pkgData.consultationsIncluded ?? (cadence === 'quarterly' ? 6 : 2));
  const consultationsIncluded = Number.isFinite(rawConsultations)
    ? Math.max(0, Math.min(60, Math.round(rawConsultations)))
    : 2;

  return {
    name: String(pkgData.name || 'Coaching Package').slice(0, 140),
    cadence,
    priceInr,
    amountPaise,
    durationDays,
    consultationsIncluded,
  };
}

export function timingSafeStringEquals(expected: string, actual: string): boolean {
  const normalizedExpected = expected.trim();
  const normalizedActual = actual.trim();
  if (!normalizedExpected || normalizedExpected.length !== normalizedActual.length) {
    return false;
  }
  const a = Buffer.from(normalizedExpected, 'utf8');
  const b = Buffer.from(normalizedActual, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifies Cashfree Payment Gateway webhook signature:
 * signature = Base64(HMAC-SHA256(secretKey, timestamp + rawBody))
 */
export function verifyCashfreeWebhookSignature(params: {
  timestamp: string;
  rawBody: Buffer | string;
  signature: string;
  secretKey: string;
}): boolean {
  const timestamp = params.timestamp.trim();
  const signature = params.signature.trim();
  const secretKey = (params.secretKey || '').trim().replace(/^["']|["']$/g, '');
  if (!timestamp || !params.rawBody || !signature || !secretKey) {
    return false;
  }

  const rawBuffer = Buffer.isBuffer(params.rawBody)
    ? params.rawBody
    : Buffer.from(params.rawBody, 'utf8');

  if (rawBuffer.length === 0) {
    return false;
  }

  // Exact byte concatenation: timestamp (as utf8 bytes) + rawBody bytes
  const expectedFromBuffer = crypto
    .createHmac('sha256', secretKey)
    .update(Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBuffer]))
    .digest('base64');

  if (timingSafeStringEquals(expectedFromBuffer, signature)) {
    return true;
  }

  // Fallback string-based concatenation: timestamp + bodyStr
  const bodyStr = rawBuffer.toString('utf8');
  const expectedFromStr = crypto
    .createHmac('sha256', secretKey)
    .update(`${timestamp}${bodyStr}`)
    .digest('base64');

  return timingSafeStringEquals(expectedFromStr, signature);
}

export function buildDeterministicWebhookEventId(params: {
  headerEventId?: string;
  timestamp?: string;
  eventType?: string;
  orderId?: string;
  cfPaymentId?: string;
  paymentStatus?: string;
}): string {
  if (params.headerEventId && params.headerEventId.trim()) {
    return params.headerEventId.trim().slice(0, 128);
  }
  const raw = [
    params.eventType || 'UNKNOWN',
    params.orderId || '',
    params.cfPaymentId || '',
    params.paymentStatus || '',
    params.timestamp || '',
  ].join('|');
  const digest = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 20);
  return `cf_evt_${digest}`;
}

export function formatInvoiceNumber(paymentId: string, now = new Date()): string {
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const suffix = paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase().padStart(6, '0');
  return `FP-${ym}-${suffix}`;
}

function buildCashfreeHeaders(config: CashfreeServerConfig): Record<string, string> {
  return {
    'x-client-id': config.appId,
    'x-client-secret': config.secretKey,
    'x-api-version': config.apiVersion,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export interface CashfreeOrderResponse {
  cf_order_id: string | number;
  order_id: string;
  order_currency: string;
  order_amount: number;
  order_status: string;
  payment_session_id: string;
  order_expiry_time?: string;
  order_meta?: {
    return_url?: string;
    notify_url?: string;
  };
}

export interface CashfreePaymentAttempt {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_group?: string;
  payment_message?: string;
  payment_time?: string;
  payment_completion_time?: string;
}

export interface CashfreeRefundResponse {
  cf_refund_id?: string;
  refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency?: string;
  refund_status: string;
  refund_note?: string;
}

export async function createCashfreeOrder(params: {
  config: CashfreeServerConfig;
  orderId: string;
  amountInr: number;
  customer: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  };
  returnUrl: string;
  notifyUrl: string;
  orderNote: string;
  orderTags?: Record<string, string>;
}): Promise<CashfreeOrderResponse> {
  const response = await fetch(`${params.config.baseUrl}/orders`, {
    method: 'POST',
    headers: buildCashfreeHeaders(params.config),
    body: JSON.stringify({
      order_id: params.orderId,
      order_amount: Number(params.amountInr.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: params.customer.customerId.slice(0, 50),
        customer_name: params.customer.customerName.slice(0, 100) || 'FitPlus Member',
        customer_email: params.customer.customerEmail || 'member@fitplus.in',
        customer_phone: params.customer.customerPhone,
      },
      order_meta: {
        return_url: params.returnUrl,
        notify_url: params.notifyUrl,
      },
      order_note: params.orderNote.slice(0, 200),
      ...(params.orderTags ? { order_tags: params.orderTags } : {}),
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Cashfree order creation failed (${response.status}): ${bodyText.slice(0, 240)}`);
  }

  const data = (await response.json()) as CashfreeOrderResponse;
  if (!data.order_id || !data.payment_session_id) {
    throw new Error('Cashfree order response did not return a payment_session_id.');
  }
  return data;
}

export async function fetchCashfreeOrder(
  config: CashfreeServerConfig,
  orderId: string,
): Promise<CashfreeOrderResponse> {
  const response = await fetch(
    `${config.baseUrl}/orders/${encodeURIComponent(orderId)}`,
    {
      method: 'GET',
      headers: buildCashfreeHeaders(config),
    },
  );
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Cashfree order lookup failed (${response.status}): ${bodyText.slice(0, 240)}`);
  }
  return (await response.json()) as CashfreeOrderResponse;
}

export async function fetchCashfreeOrderPayments(
  config: CashfreeServerConfig,
  orderId: string,
): Promise<CashfreePaymentAttempt[]> {
  const response = await fetch(
    `${config.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
    {
      method: 'GET',
      headers: buildCashfreeHeaders(config),
    },
  );
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Cashfree payments lookup failed (${response.status}): ${bodyText.slice(0, 240)}`);
  }
  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? (data as CashfreePaymentAttempt[]) : [];
}

export async function createCashfreeRefund(params: {
  config: CashfreeServerConfig;
  orderId: string;
  refundId: string;
  refundAmountInr: number;
  refundNote: string;
}): Promise<CashfreeRefundResponse> {
  const response = await fetch(
    `${params.config.baseUrl}/orders/${encodeURIComponent(params.orderId)}/refunds`,
    {
      method: 'POST',
      headers: buildCashfreeHeaders(params.config),
      body: JSON.stringify({
        refund_id: params.refundId.slice(0, 40),
        refund_amount: Number(params.refundAmountInr.toFixed(2)),
        refund_note: params.refundNote.slice(0, 250),
      }),
    },
  );
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Cashfree refund request failed (${response.status}): ${bodyText.slice(0, 240)}`);
  }
  return (await response.json()) as CashfreeRefundResponse;
}

export function extractPreferredPaymentAttempt(
  attempts: CashfreePaymentAttempt[],
): CashfreePaymentAttempt | undefined {
  if (!Array.isArray(attempts) || attempts.length === 0) return undefined;
  const success = attempts.find((a) => String(a.payment_status).toUpperCase() === 'SUCCESS');
  if (success) return success;
  const pending = attempts.find((a) => String(a.payment_status).toUpperCase() === 'PENDING');
  if (pending) return pending;
  return attempts[attempts.length - 1];
}

export function buildTrainerSettlementPreview(params: {
  trainerId: string;
  amountInr: number;
  easySplitEnabled: boolean;
}): {
  enabled: boolean;
  settlementStatus: 'not_applicable' | 'pending_onboarding';
  provider: 'cashfree_easy_split';
  trainerId: string;
  grossAmountInr: number;
} {
  if (!params.easySplitEnabled) {
    return {
      enabled: false,
      settlementStatus: 'not_applicable',
      provider: 'cashfree_easy_split',
      trainerId: params.trainerId,
      grossAmountInr: params.amountInr,
    };
  }
  return {
    enabled: false,
    settlementStatus: 'pending_onboarding',
    provider: 'cashfree_easy_split',
    trainerId: params.trainerId,
    grossAmountInr: params.amountInr,
  };
}

export async function activateEnrollmentFromPayment(params: {
  db: Firestore;
  paymentId: string;
  providerPaymentId?: string;
  paymentMethod?: string;
  webhookEventId?: string;
  actorUserId: string;
}): Promise<{
  alreadyCaptured: boolean;
  paymentId: string;
  subscriptionId: string;
  enrollmentId: string;
  relationshipId: string;
  invoiceNumber: string;
}> {
  const { db, paymentId, providerPaymentId, paymentMethod, webhookEventId, actorUserId } = params;
  const paymentRef = db.collection('payments').doc(paymentId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) {
    throw new Error('Payment record not found');
  }

  const payment = paymentSnap.data()!;
  if (payment.status === 'captured' && payment.subscriptionId) {
    if (webhookEventId && payment.webhookEventId !== webhookEventId) {
      await paymentRef.update({
        webhookEventId,
        lastWebhookAt: new Date().toISOString(),
        ...(providerPaymentId && !payment.providerPaymentId ? { providerPaymentId } : {}),
        ...(paymentMethod && !payment.paymentMethod ? { paymentMethod } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return {
      alreadyCaptured: true,
      paymentId,
      subscriptionId: String(payment.subscriptionId),
      enrollmentId: String(payment.enrollmentId || `enr_${paymentId}`),
      relationshipId: String(payment.relationshipId || ''),
      invoiceNumber: String(payment.invoiceNumber || formatInvoiceNumber(paymentId)),
    };
  }

  const clientId = String(payment.clientId);
  const clientUserId = String(payment.clientUserId);
  const trainerId = String(payment.trainerId);
  const trainerUserId = String(payment.trainerUserId);
  const packageId = String(payment.packageId);
  const inviteId = payment.inviteId ? String(payment.inviteId) : undefined;

  const [pkgSnap, clientSnap, trainerSnap] = await Promise.all([
    db.collection('packages').doc(packageId).get(),
    db.collection('clients').doc(clientId).get(),
    db.collection('trainers').doc(trainerId).get(),
  ]);

  const pkgDetails = pkgSnap.exists
    ? computeAuthoritativePackageDetails(pkgSnap.data()!)
    : {
        name: String(payment.packageName || 'Coaching Package'),
        cadence: 'monthly' as const,
        priceInr: Number(payment.amountInr || 0),
        amountPaise: Number(payment.amountPaise || 0),
        durationDays: 30,
        consultationsIncluded: 2,
      };

  const now = new Date();
  const nowIso = now.toISOString();
  const periodEnd = new Date(now.getTime() + pkgDetails.durationDays * 86_400_000);
  const periodEndIso = periodEnd.toISOString();
  const renewalDueDate = periodEndIso.slice(0, 10);

  const subscriptionId = String(payment.subscriptionId || `sub_${paymentId}`);
  const enrollmentId = String(payment.enrollmentId || `enr_${paymentId}`);
  const invoiceNumber = String(payment.invoiceNumber || formatInvoiceNumber(paymentId, now));
  const providerOrderId = String(payment.providerOrderId || payment.razorpayOrderId || '');
  const resolvedProvider =
    payment.provider === 'free_tier'
      ? 'free_tier'
      : payment.provider === 'razorpay'
        ? 'razorpay'
        : 'cashfree';

  const existingActiveRelId = String(clientSnap.data()?.activeRelationshipId || '');
  const existingRelsSnap = await db
    .collection('relationships')
    .where('clientUserId', '==', clientUserId)
    .where('trainerId', '==', trainerId)
    .limit(5)
    .get();

  const matchingRelDoc = existingRelsSnap.docs.find((d) => d.data().status !== 'ended');
  const relationshipId = matchingRelDoc ? matchingRelDoc.id : `rel_${clientId}_${trainerId}`;

  const batch = db.batch();

  batch.update(paymentRef, {
    status: 'captured',
    subscriptionId,
    enrollmentId,
    relationshipId,
    invoiceNumber,
    ...(providerPaymentId ? { providerPaymentId } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(webhookEventId ? { webhookEventId, lastWebhookAt: nowIso } : {}),
    settlementStatus: String(payment.settlementStatus || 'not_applicable'),
    verifiedAt: nowIso,
    paidAt: nowIso,
    failureReason: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(db.collection('subscriptions').doc(subscriptionId), {
    id: subscriptionId,
    clientId,
    clientUserId,
    trainerId,
    trainerUserId,
    packageId,
    packageName: pkgDetails.name,
    priceInr: pkgDetails.priceInr,
    cadence: pkgDetails.cadence,
    durationDays: pkgDetails.durationDays,
    consultationsIncluded: pkgDetails.consultationsIncluded,
    status: 'active',
    provider: resolvedProvider,
    latestPaymentId: paymentId,
    ...(providerOrderId ? { providerOrderId } : {}),
    ...(payment.razorpayOrderId ? { razorpayOrderId: String(payment.razorpayOrderId) } : {}),
    currentPeriodStart: nowIso,
    currentPeriodEnd: periodEndIso,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(db.collection('enrollments').doc(enrollmentId), {
    id: enrollmentId,
    clientId,
    clientUserId,
    trainerId,
    trainerUserId,
    packageId,
    subscriptionId,
    status: 'active',
    isDemoCheckout: false,
    enrolledAt: nowIso,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (existingActiveRelId && existingActiveRelId !== relationshipId) {
    batch.update(db.collection('relationships').doc(existingActiveRelId), {
      status: 'ended',
      endedAt: nowIso,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  batch.set(
    db.collection('relationships').doc(relationshipId),
    {
      id: relationshipId,
      trainerId,
      trainerUserId,
      clientId,
      clientUserId,
      packageId,
      status: 'active',
      startedAt: nowIso,
      createdAt: matchingRelDoc ? matchingRelDoc.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (clientSnap.exists) {
    batch.update(db.collection('clients').doc(clientId), {
      activeTrainerUserId: trainerUserId,
      activeRelationshipId: relationshipId,
      renewalDueDate,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (inviteId) {
    batch.update(db.collection('invites').doc(inviteId), {
      status: 'redeemed',
      redeemedByClientId: clientId,
      redeemedByUserId: clientUserId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (payment.referralCode) {
    const refCode = String(payment.referralCode).trim().toUpperCase();
    try {
      const refQuery = await db
        .collection('referrals')
        .where('referralCode', '==', refCode)
        .limit(1)
        .get();
      if (!refQuery.empty) {
        batch.update(refQuery.docs[0].ref, {
          status: 'converted',
          refereeUserId: clientUserId,
          packageId,
          paymentId,
          convertedAt: nowIso,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (refErr) {
      console.warn('Error associating referral conversion:', refErr);
    }
  }

  const trainerName = String(trainerSnap.data()?.displayName || 'Your FitPlus Coach');
  const clientName = clientSnap.exists
    ? `${String(clientSnap.data()?.firstName || '')} ${String(clientSnap.data()?.lastName || '')}`.trim() || 'Client'
    : 'Client';

  const clientNtfId = `ntf_c_${paymentId}`;
  batch.set(db.collection('notifications').doc(clientNtfId), {
    id: clientNtfId,
    recipientUserId: clientUserId,
    senderUserId: actorUserId,
    title: 'Coaching enrollment active',
    body: `${pkgDetails.name} with ${trainerName} is active (${invoiceNumber}).`,
    category: 'system',
    read: false,
    actionRoute: '/app/coach',
    relatedClientId: clientId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const trainerNtfId = `ntf_t_${paymentId}`;
  batch.set(db.collection('notifications').doc(trainerNtfId), {
    id: trainerNtfId,
    recipientUserId: trainerUserId,
    senderUserId: actorUserId,
    title: 'New package enrollment',
    body: `${clientName} enrolled in ${pkgDetails.name} (${pkgDetails.priceInr === 0 ? 'Free' : `₹${pkgDetails.priceInr.toLocaleString('en-IN')}`}).`,
    category: 'system',
    read: false,
    actionRoute: '/studio/packages',
    relatedClientId: clientId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    alreadyCaptured: false,
    paymentId,
    subscriptionId,
    enrollmentId,
    relationshipId,
    invoiceNumber,
  };
}

/**
 * Safely updates a non-captured payment state ('pending' | 'failed' | 'cancelled')
 * without ever downgrading an already captured or refunded payment.
 */
export async function recordNonCapturedPaymentState(params: {
  db: Firestore;
  paymentId: string;
  nextStatus: 'pending' | 'failed' | 'cancelled';
  providerPaymentId?: string;
  paymentMethod?: string;
  failureReason?: string;
  webhookEventId?: string;
}): Promise<{ updated: boolean; currentStatus: string }> {
  const paymentRef = params.db.collection('payments').doc(params.paymentId);
  const snap = await paymentRef.get();
  if (!snap.exists) {
    return { updated: false, currentStatus: 'missing' };
  }
  const existing = snap.data()!;
  const currentStatus = String(existing.status || 'created');
  if (currentStatus === 'captured' || currentStatus === 'refunded') {
    return { updated: false, currentStatus };
  }
  if (params.webhookEventId && existing.webhookEventId === params.webhookEventId) {
    return { updated: false, currentStatus };
  }

  const nowIso = new Date().toISOString();
  await paymentRef.update({
    status: params.nextStatus,
    ...(params.providerPaymentId ? { providerPaymentId: params.providerPaymentId } : {}),
    ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {}),
    ...(params.failureReason ? { failureReason: params.failureReason.slice(0, 240) } : {}),
    ...(params.webhookEventId ? { webhookEventId: params.webhookEventId, lastWebhookAt: nowIso } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { updated: true, currentStatus: params.nextStatus };
}
