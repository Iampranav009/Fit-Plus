import crypto from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export interface RazorpayServerConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isConfigured: boolean;
  isLive: boolean;
}

export function getRazorpayConfig(): RazorpayServerConfig {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  const isLive = process.env.RAZORPAY_LIVE_ENABLED === 'true' || keyId.startsWith('rzp_live_');
  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured: Boolean(keyId && keySecret),
    isLive,
  };
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

export function timingSafeHexEquals(expectedHex: string, actualHex: string): boolean {
  const normalizedExpected = expectedHex.trim().toLowerCase();
  const normalizedActual = actualHex.trim().toLowerCase();
  if (!normalizedExpected || normalizedExpected.length !== normalizedActual.length) {
    return false;
  }
  const a = Buffer.from(normalizedExpected, 'utf8');
  const b = Buffer.from(normalizedActual, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyRazorpayCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string,
): boolean {
  if (!razorpayOrderId || !razorpayPaymentId || !signature || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return timingSafeHexEquals(expected, signature);
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  webhookSecret: string,
): boolean {
  if (!rawBody || !signature || !webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return timingSafeHexEquals(expected, signature);
}

export function formatInvoiceNumber(paymentId: string, now = new Date()): string {
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const suffix = paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase().padStart(6, '0');
  return `FP-${ym}-${suffix}`;
}

export async function createRazorpayOrder(params: {
  keyId: string;
  keySecret: string;
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; receipt: string; status: string }> {
  const auth = Buffer.from(`${params.keyId}:${params.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt.slice(0, 40),
      notes: params.notes,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Razorpay order creation failed (${response.status}): ${bodyText.slice(0, 200)}`);
  }

  return (await response.json()) as {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
  };
}

export async function activateEnrollmentFromPayment(params: {
  db: Firestore;
  paymentId: string;
  razorpayPaymentId?: string;
  actorUserId: string;
}): Promise<{
  alreadyCaptured: boolean;
  paymentId: string;
  subscriptionId: string;
  enrollmentId: string;
  relationshipId: string;
  invoiceNumber: string;
}> {
  const { db, paymentId, razorpayPaymentId, actorUserId } = params;
  const paymentRef = db.collection('payments').doc(paymentId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) {
    throw new Error('Payment record not found');
  }

  const payment = paymentSnap.data()!;
  if (payment.status === 'captured' && payment.subscriptionId) {
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
    ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    paidAt: nowIso,
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
    currentPeriodStart: nowIso,
    currentPeriodEnd: periodEndIso,
    ...(payment.razorpayOrderId ? { razorpayOrderId: String(payment.razorpayOrderId) } : {}),
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
