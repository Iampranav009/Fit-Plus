import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  computeClientAdherencePercent,
  computeDayConsistency,
  computeStreakSummary,
  computeWeeklyStrip,
} from '../lib/streak';
import {
  attemptBookConsultationSlot,
  buildBulkAssignments,
  createDemoEnrollmentState,
  generateCryptoInviteToken,
  generateDeterministicPlanDraft,
  sanitizeAIPlanDraftPayload,
  validateInvite,
} from '../lib/engines';
import {
  buildWhatsAppChatUrl,
  computeAuthoritativeOrderAmountPaise,
  computePackageDurationDays,
  computeReviewStats,
  findEligibleReviewRelationship,
  isValidHttpMeetingLink,
} from '../lib/commerce';
import { createSeedSnapshot } from '../data/demo/fixtures';
import type { Assignment, CompletionEvent, TrainerReview } from '../types/domain';
import healthHandler from '../../api/health';
import generatePlanHandler from '../../api/ai/generate-plan';
import recalculateStreakHandler from '../../api/streaks/recalculate';
import respondRelationshipHandler from '../../api/relationships/respond';
import createOrderHandler from '../../api/payments/create-order';
import verifyPaymentHandler from '../../api/payments/verify';
import webhookHandler from '../../api/payments/webhook';
import refundHandler from '../../api/payments/refund';
import adminOverviewHandler from '../../api/admin/overview';
import monitoringErrorHandler from '../../api/monitoring/error';
import {
  buildDeterministicWebhookEventId,
  buildTrainerSettlementPreview,
  computeAuthoritativePackageDetails,
  extractPreferredPaymentAttempt,
  getCashfreeConfig,
  resolveAppBaseUrl,
  sanitizeIndianPhone,
  verifyCashfreeWebhookSignature,
} from '../../api/_lib/payments';

test('Streak engine: counts recovery days, treats unscheduled/future days as neutral, and recalculates on undo', () => {
  const today = '2026-11-15';
  const assignments: Assignment[] = [
    {
      id: 'a_req',
      clientId: 'c1',
      title: 'Workout',
      category: 'workout',
      instructions: 'Lift',
      durationMinutes: 40,
      dueTime: '8:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-12', '2026-11-14', '2026-11-15', '2026-11-16'],
      isOptional: false,
      isRecovery: false,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'a_rec',
      clientId: 'c1',
      title: 'Recovery walk',
      category: 'recovery',
      instructions: 'Walk 20 min',
      durationMinutes: 20,
      dueTime: '8:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-13'],
      isOptional: false,
      isRecovery: true,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'a_opt',
      clientId: 'c1',
      title: 'Optional stretch',
      category: 'habit',
      instructions: 'Stretch',
      durationMinutes: 10,
      dueTime: '9:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-11', '2026-11-15'],
      isOptional: true,
      isRecovery: false,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  // Note: 2026-11-11 has only an optional task -> must be neutral (neither breaks nor extends)
  const day11 = computeDayConsistency('2026-11-11', assignments, [], today);
  assert.equal(day11.status, 'neutral');

  const dayFuture = computeDayConsistency('2026-11-16', assignments, [], today);
  assert.equal(dayFuture.status, 'future');

  // Complete Nov 12, Nov 13 (recovery), Nov 14 -> today (Nov 15) is still pending, so streak is 3
  const completions: CompletionEvent[] = [
    { id: 'c1', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-12', completedAt: '2026-11-12T10:00:00Z' },
    { id: 'c2', assignmentId: 'a_rec', clientId: 'c1', dateKey: '2026-11-13', completedAt: '2026-11-13T10:00:00Z' },
    { id: 'c3', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-14', completedAt: '2026-11-14T10:00:00Z' },
  ];

  const pendingToday = computeStreakSummary(assignments, completions, today, 10);
  assert.equal(pendingToday.currentStreak, 3);
  assert.equal(pendingToday.todayStatus, 'pending');

  // Complete today's required task -> streak increases to 4 (even without optional task)
  const withToday = [
    ...completions,
    { id: 'c4', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-15', completedAt: '2026-11-15T10:00:00Z' },
  ];
  const afterToday = computeStreakSummary(assignments, withToday, today, 10);
  assert.equal(afterToday.currentStreak, 4);
  assert.equal(afterToday.todayStatus, 'completed');

  // Undo Nov 13 recovery -> breaks streak back to 2 (Nov 14 + Nov 15)
  const afterUndo = computeStreakSummary(
    assignments,
    withToday.filter((c) => c.id !== 'c2'),
    today,
    10,
  );
  assert.equal(afterUndo.currentStreak, 2);
});

test('Bulk assignment: creates individual records, skips duplicates when enabled, and preserves overrides', () => {
  const seed = createSeedSnapshot(new Date('2026-11-15T12:00:00Z'));
  const clientUserIdMap: Record<string, string> = {};
  seed.clients.forEach((c) => {
    clientUserIdMap[c.id] = c.userId;
  });

  const tpl = seed.templates.find((t) => t.id === 'tpl_steps_8k')!;
  const result = buildBulkAssignments(
    {
      trainerId: 'trn_arjun',
      clientIds: ['cl_aarav', 'cl_ananya'],
      template: tpl,
      startDateKey: seed.anchorDateKey,
      recurrenceDays: 3,
      dueTime: '8:30 PM',
      skipDuplicates: true,
      existingAssignments: seed.assignments,
    },
    clientUserIdMap,
  );

  // Aarav already has tpl_steps_8k scheduled today, so he is skipped; Ananya gets a new record
  assert.deepEqual(result.skippedClientIds, ['cl_aarav']);
  assert.equal(result.created.length, 1);
  assert.equal(result.created[0].clientId, 'cl_ananya');
  assert.equal(result.created[0].scheduledDates.length, 3);
});

test('Invite validation, package enrollment, and consultation duplicate-slot prevention', () => {
  const seed = createSeedSnapshot(new Date('2026-11-15T12:00:00Z'));

  const valid = validateInvite('FIT-ARJUN-2026', seed.invites, seed.anchorDateKey);
  assert.equal(valid.state, 'valid');

  const expired = validateInvite('FIT-EXP-000', seed.invites, seed.anchorDateKey);
  assert.equal(expired.state, 'expired');

  const invalid = validateInvite('NO-SUCH-TOKEN', seed.invites, seed.anchorDateKey);
  assert.equal(invalid.state, 'not_found');

  // Enrollment connects Kavya only after explicit acceptance
  const pkg = seed.packages.find((p) => p.id === 'pkg_arjun_weight')!;
  const enrolled = createDemoEnrollmentState({
    clientId: 'cl_kavya',
    trainerId: 'trn_arjun',
    pkg,
    existingRelationships: seed.relationships,
    existingEnrollments: seed.enrollments,
  });
  assert.ok(
    enrolled.relationships.some(
      (r) => r.clientId === 'cl_kavya' && r.trainerId === 'trn_arjun' && r.status === 'active',
    ),
  );

  // Booking slot succeeds once and blocks duplicate attempt on same slot
  const openSlot = seed.consultationSlots.find((s) => s.status === 'available')!;
  const firstBook = attemptBookConsultationSlot({
    slotId: openSlot.id,
    clientId: 'cl_kavya',
    topic: 'Initial consult',
    slots: seed.consultationSlots,
    bookings: seed.bookings,
  });
  assert.equal(firstBook.ok, true);
  if (firstBook.ok) {
    const secondBook = attemptBookConsultationSlot({
      slotId: openSlot.id,
      clientId: 'cl_aarav',
      topic: 'Double booking attempt',
      slots: firstBook.slots,
      bookings: [...seed.bookings, firstBook.booking],
    });
    assert.equal(secondBook.ok, false);
  }
});

test('Deterministic AI plan drafter produces reviewable draft without live API calls', () => {
  const draft = generateDeterministicPlanDraft({
    trainerId: 'trn_arjun',
    objective: 'weight_management',
    experienceLevel: 'beginner',
    daysPerWeek: 4,
    environment: 'home',
    dietaryPreference: 'vegetarian',
    constraints: 'Knee comfort',
  });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.workoutDays.length, 7);
  assert.ok(draft.nutritionOutline.length >= 3);
});

test('Stage 3B: generateCryptoInviteToken creates unique Firestore-safe uppercase tokens', () => {
  const token1 = generateCryptoInviteToken('FIT');
  const token2 = generateCryptoInviteToken('FIT');
  assert.match(token1, /^FIT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.match(token1, /^[a-zA-Z0-9_\-]+$/);
  assert.notEqual(token1, token2);
});

test('Stage 3B: trainer-approved recovery dates preserve streaks and adherence without penalty', () => {
  const today = '2026-11-15';
  const assignments: Assignment[] = [
    {
      id: 'a_req',
      clientId: 'c1',
      title: 'Strength workout',
      category: 'workout',
      instructions: 'Lift',
      durationMinutes: 40,
      dueTime: '8:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'],
      isOptional: false,
      isRecovery: false,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];
  const completions: CompletionEvent[] = [
    { id: 'c1', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-12', completedAt: '2026-11-12T10:00:00Z' },
    { id: 'c2', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-14', completedAt: '2026-11-14T10:00:00Z' },
    { id: 'c3', assignmentId: 'a_req', clientId: 'c1', dateKey: '2026-11-15', completedAt: '2026-11-15T10:00:00Z' },
  ];

  // Without approved recovery on Nov 13, streak is broken to 2 (Nov 14 + Nov 15)
  const withoutRecovery = computeStreakSummary(assignments, completions, today, 10);
  assert.equal(withoutRecovery.currentStreak, 2);

  // With trainer-approved recovery on Nov 13, status becomes recovery_completed and streak bridges to 4
  const approved = ['2026-11-13'];
  const day13 = computeDayConsistency('2026-11-13', assignments, completions, today, approved);
  assert.equal(day13.status, 'recovery_completed');

  const withRecovery = computeStreakSummary(assignments, completions, today, 10, approved);
  assert.equal(withRecovery.currentStreak, 4);

  const strip = computeWeeklyStrip(today, assignments, completions, approved);
  const nov13Strip = strip.find((d) => d.dateKey === '2026-11-13');
  assert.equal(nov13Strip?.status, 'recovery_completed');

  const adherence = computeClientAdherencePercent('c1', assignments, completions, today, 4, approved);
  assert.equal(adherence, 100);
});

test('Stage 3B: sanitizeAIPlanDraftPayload clamps oversized output and provides safe defaults', () => {
  const sanitized = sanitizeAIPlanDraftPayload({
    title: 'X'.repeat(300),
    summary: 'Y'.repeat(1200),
    workoutDays: Array.from({ length: 12 }, (_, idx) => ({
      dayLabel: `Day ${idx + 1}`,
      focus: 'F'.repeat(200),
      sampleSession: 'S'.repeat(400),
    })),
    nutritionOutline: Array.from({ length: 15 }, (_, idx) => `Meal ${idx + 1}`),
    habitCommitments: Array.from({ length: 15 }, (_, idx) => `Habit ${idx + 1}`),
  });

  assert.equal(sanitized.title.length, 140);
  assert.equal(sanitized.summary.length, 800);
  assert.equal(sanitized.workoutDays.length, 7);
  assert.equal(sanitized.workoutDays[0].focus.length, 120);
  assert.equal(sanitized.workoutDays[0].sampleSession.length, 240);
  assert.equal(sanitized.nutritionOutline.length, 10);
  assert.equal(sanitized.habitCommitments.length, 10);

  const emptyFallback = sanitizeAIPlanDraftPayload({});
  assert.ok(emptyFallback.title.length > 0);
  assert.ok(emptyFallback.workoutDays.length >= 1);
  assert.ok(emptyFallback.nutritionOutline.length >= 1);
  assert.ok(emptyFallback.habitCommitments.length >= 1);
});

function createMockRes() {
  const headers: Record<string, string> = {};
  const result = {
    statusCode: 200,
    body: undefined as unknown,
    headers,
  };
  const res = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      result.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      result.body = payload;
      return res;
    },
  };
  return { res: res as unknown as VercelResponse, result };
}

test('Stage 3B API handlers enforce 405 on GET and 401 without Bearer Firebase token', async () => {
  const handlers = [
    generatePlanHandler,
    recalculateStreakHandler,
    respondRelationshipHandler,
  ];

  for (const handler of handlers) {
    const getMock = createMockRes();
    await handler(
      { method: 'GET', headers: {}, body: {} } as unknown as VercelRequest,
      getMock.res,
    );
    assert.equal(getMock.result.statusCode, 405);
    assert.equal(getMock.result.headers.allow, 'POST');

    const unauthMock = createMockRes();
    await handler(
      { method: 'POST', headers: {}, body: {} } as unknown as VercelRequest,
      unauthMock.res,
    );
    assert.equal(unauthMock.result.statusCode, 401);
  }
});

test('Stage 3C commerce helpers: WhatsApp URL, authoritative pricing, review eligibility, and meeting link validation', () => {
  const waUrl = buildWhatsAppChatUrl('+91 98200 11223', 'Hi Arjun, checking my plan!');
  assert.equal(
    waUrl,
    'https://wa.me/919820011223?text=Hi%20Arjun%2C%20checking%20my%20plan!',
  );
  assert.equal(buildWhatsAppChatUrl('9820011223', 'No plus'), null);

  assert.equal(computePackageDurationDays({ cadence: 'monthly' }), 30);
  assert.equal(computePackageDurationDays({ cadence: 'quarterly' }), 90);
  assert.equal(computePackageDurationDays({ cadence: 'monthly', durationDays: 45 }), 45);
  assert.equal(computeAuthoritativeOrderAmountPaise({ priceInr: 2499, cadence: 'monthly' }), 249900);
  assert.equal(computeAuthoritativeOrderAmountPaise({ priceInr: 2499, cadence: 'free' }), 0);

  const serverPkg = computeAuthoritativePackageDetails({
    name: 'Strength Quarterly',
    cadence: 'quarterly',
    priceInr: 5999,
    consultationsIncluded: 6,
  });
  assert.equal(serverPkg.amountPaise, 599900);
  assert.equal(serverPkg.durationDays, 90);
  assert.equal(serverPkg.consultationsIncluded, 6);

  const reviews: TrainerReview[] = [
    {
      id: 'r1',
      trainerId: 't1',
      clientId: 'c1',
      clientUserId: 'u1',
      relationshipId: 'rel1',
      authorName: 'Riya S.',
      rating: 5,
      comment: 'Great coaching',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'r2',
      trainerId: 't1',
      clientId: 'c2',
      clientUserId: 'u2',
      relationshipId: 'rel2',
      authorName: 'Dev M.',
      rating: 4,
      comment: 'Consistent check-ins',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ];
  const stats = computeReviewStats(reviews);
  assert.equal(stats.averageRating, 4.5);
  assert.equal(stats.count, 2);

  const seed = createSeedSnapshot(new Date('2026-11-15T12:00:00Z'));
  assert.ok(findEligibleReviewRelationship('cl_aarav', 'trn_arjun', seed.relationships));
  assert.equal(findEligibleReviewRelationship('cl_kavya', 'trn_arjun', seed.relationships), undefined);

  assert.equal(isValidHttpMeetingLink('https://meet.google.com/abc-defg-hij'), true);
  assert.equal(isValidHttpMeetingLink('javascript:alert(1)'), false);
});

test('Stage 3D Cashfree HMAC webhook signature verification, idempotency keys, and payment attempt selection', () => {
  const secretKey = 'cfsk_ma_test_secret_123';
  const timestamp = '1731643200000';
  const rawPayload = Buffer.from(
    JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: 'fp_pay_123', order_amount: 1999, order_currency: 'INR' },
        payment: { cf_payment_id: '998877', payment_status: 'SUCCESS', payment_group: 'upi' },
      },
    }),
    'utf8',
  );
  const expectedSig = crypto
    .createHmac('sha256', secretKey)
    .update(`${timestamp}${rawPayload.toString('utf8')}`)
    .digest('base64');

  assert.equal(
    verifyCashfreeWebhookSignature({
      timestamp,
      rawBody: rawPayload,
      signature: expectedSig,
      secretKey,
    }),
    true,
  );
  assert.equal(
    verifyCashfreeWebhookSignature({
      timestamp,
      rawBody: rawPayload,
      signature: 'dGFtcGVyZWQ=',
      secretKey,
    }),
    false,
  );
  assert.equal(
    verifyCashfreeWebhookSignature({
      timestamp: '',
      rawBody: rawPayload,
      signature: expectedSig,
      secretKey,
    }),
    false,
  );

  const evt1 = buildDeterministicWebhookEventId({
    timestamp,
    eventType: 'PAYMENT_SUCCESS_WEBHOOK',
    orderId: 'fp_pay_123',
    cfPaymentId: '998877',
    paymentStatus: 'SUCCESS',
  });
  const evt2 = buildDeterministicWebhookEventId({
    timestamp,
    eventType: 'PAYMENT_SUCCESS_WEBHOOK',
    orderId: 'fp_pay_123',
    cfPaymentId: '998877',
    paymentStatus: 'SUCCESS',
  });
  assert.equal(evt1, evt2);

  const preferred = extractPreferredPaymentAttempt([
    { cf_payment_id: '1', order_id: 'fp_pay_123', payment_status: 'FAILED' },
    { cf_payment_id: '2', order_id: 'fp_pay_123', payment_status: 'SUCCESS', payment_group: 'upi' },
    { cf_payment_id: '3', order_id: 'fp_pay_123', payment_status: 'PENDING' },
  ]);
  assert.equal(preferred?.cf_payment_id, '2');
  assert.equal(preferred?.payment_group, 'upi');

  assert.equal(sanitizeIndianPhone('+91 98200 11223'), '9820011223');
  assert.equal(sanitizeIndianPhone(''), '9999999999');

  const cfConfig = getCashfreeConfig();
  assert.equal(cfConfig.env, 'sandbox');
  assert.equal(cfConfig.easySplitEnabled, false);
  assert.equal(cfConfig.baseUrl, 'https://sandbox.cashfree.com/pg');

  const settlement = buildTrainerSettlementPreview({
    trainerId: 'trn_arjun',
    amountInr: 1999,
    easySplitEnabled: false,
  });
  assert.equal(settlement.enabled, false);
  assert.equal(settlement.settlementStatus, 'not_applicable');

  const baseUrl = resolveAppBaseUrl({ host: 'fitplus-kappa.vercel.app', 'x-forwarded-proto': 'https' });
  assert.ok(baseUrl.startsWith('https://'));
});

test('Stage 3D /api/health returns HTTP 200 non-secret readiness and payment/admin handlers enforce auth and method security', async () => {
  const healthGet = createMockRes();
  await healthHandler(
    { method: 'GET', headers: {}, body: {} } as unknown as VercelRequest,
    healthGet.res,
  );
  assert.equal(healthGet.result.statusCode, 200);
  const healthBody = healthGet.result.body as {
    ok: boolean;
    firebase: { projectId: string; firestoreDatabaseId: string; adminConfigured: boolean };
    capabilities: { cashfreeConfigured: boolean; cashfreeEnv: string; easySplitEnabled: boolean };
  };
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.firebase.projectId, 'gen-lang-client-0381020502');
  assert.equal(
    healthBody.firebase.firestoreDatabaseId,
    'ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841',
  );
  assert.equal(healthBody.capabilities.cashfreeEnv, 'sandbox');
  assert.equal(healthBody.capabilities.easySplitEnabled, false);

  const healthPost = createMockRes();
  await healthHandler(
    { method: 'POST', headers: {}, body: {} } as unknown as VercelRequest,
    healthPost.res,
  );
  assert.equal(healthPost.result.statusCode, 405);

  for (const handler of [createOrderHandler, verifyPaymentHandler, refundHandler]) {
    const getMock = createMockRes();
    await handler(
      { method: 'GET', headers: {}, body: {} } as unknown as VercelRequest,
      getMock.res,
    );
    assert.equal(getMock.result.statusCode, 405);

    const unauthMock = createMockRes();
    await handler(
      { method: 'POST', headers: {}, body: {} } as unknown as VercelRequest,
      unauthMock.res,
    );
    assert.equal(unauthMock.result.statusCode, 401);
  }

  const webhookGet = createMockRes();
  await webhookHandler(
    { method: 'GET', headers: {}, body: {} } as unknown as VercelRequest,
    webhookGet.res,
  );
  assert.equal(webhookGet.result.statusCode, 405);

  const webhookUnconfigured = createMockRes();
  await webhookHandler(
    { method: 'POST', headers: {}, body: {} } as unknown as VercelRequest,
    webhookUnconfigured.res,
  );
  assert.equal(webhookUnconfigured.result.statusCode, 503);

  const adminDelete = createMockRes();
  await adminOverviewHandler(
    { method: 'DELETE', headers: {}, body: {} } as unknown as VercelRequest,
    adminDelete.res,
  );
  assert.equal(adminDelete.result.statusCode, 405);

  const adminUnauth = createMockRes();
  await adminOverviewHandler(
    { method: 'GET', headers: {}, body: {} } as unknown as VercelRequest,
    adminUnauth.res,
  );
  assert.equal(adminUnauth.result.statusCode, 401);

  const monInvalid = createMockRes();
  await monitoringErrorHandler(
    { method: 'POST', headers: {}, body: {} } as unknown as VercelRequest,
    monInvalid.res,
  );
  assert.equal(monInvalid.result.statusCode, 400);

  const monValid = createMockRes();
  await monitoringErrorHandler(
    {
      method: 'POST',
      headers: {},
      body: { name: 'TypeError', message: 'Render fail for user@example.com', route: '/discover' },
    } as unknown as VercelRequest,
    monValid.res,
  );
  assert.equal(monValid.result.statusCode, 200);
});

