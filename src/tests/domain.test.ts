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
  computeGstBreakdown,
  computePackageDurationDays,
  computeReviewStats,
  computeTrainerSettlement,
  findEligibleReviewRelationship,
  isValidHttpMeetingLink,
  validateCouponCode,
} from '../lib/commerce';
import {
  buildReferralDeepLink,
  evaluateReferralReward,
  generateReferralCode,
} from '../lib/referralEngine';
import {
  buildConversationId,
  formatMessageTime,
  formatConversationSnippetDate,
  formatTimeIndian,
} from '../lib/messagingEngine';
import {
  calculateVisualWorkoutDayMetrics,
  calculateVisualNutritionDayMacros,
  scaleIndianFoodItem,
} from '../lib/coachingBuildersEngine';
import {
  computeClientPulse,
  computeTrainerActionItems,
  computeTrainerBusinessAnalytics,
} from '../lib/pulseEngine';
import {
  evaluateScheduledReminders,
  isInIndianQuietHours,
} from '../lib/reminderScheduler';
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

  // Test Webhook event handling with signed payload
  process.env.CASHFREE_APP_ID = 'test_app_id';
  process.env.CASHFREE_SECRET_KEY = 'test_secret_key';
  const testPayload = JSON.stringify({
    type: 'TEST_WEBHOOK',
    data: { order: { order_id: 'order_test_123' } },
  });
  const testTimestamp = '1746427759733';
  const testSig = crypto
    .createHmac('sha256', 'test_secret_key')
    .update(`${testTimestamp}${testPayload}`)
    .digest('base64');

  const webhookTestRes = createMockRes();
  await webhookHandler(
    {
      method: 'POST',
      headers: {
        'x-webhook-signature': testSig,
        'x-webhook-timestamp': testTimestamp,
        'x-webhook-version': '2025-01-01',
      },
      rawBody: Buffer.from(testPayload, 'utf8'),
      body: JSON.parse(testPayload),
    } as unknown as VercelRequest,
    webhookTestRes.res,
  );
  assert.equal(webhookTestRes.result.statusCode, 200);
  assert.equal((webhookTestRes.result.body as any)?.test, true);
  assert.equal((webhookTestRes.result.body as any)?.ok, true);

  // Reset env
  delete process.env.CASHFREE_APP_ID;
  delete process.env.CASHFREE_SECRET_KEY;

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

// ==========================================
// STAGE 4A UNIT TESTS
// ==========================================

import {
  BUILTIN_EXERCISES,
  filterExercises,
  findExerciseByNameOrId,
  mergeExerciseCatalog,
  MUSCLE_LABELS,
} from '../data/exerciseLibrary';
import {
  estimateOneRepMax,
  parseRestSeconds,
  parseTargetSetCount,
  parseTargetRepsNum,
  getPreviousExerciseBest,
  computeSessionMetrics,
  buildInitialWorkoutExercises,
} from '../lib/workoutEngine';
import {
  INDIAN_FOOD_DATABASE,
  computeNutritionTotals,
  scaleFoodToLoggedItem,
} from '../data/indianFoods';
import {
  ACHIEVEMENT_CATALOG,
  evaluateAchievementsState,
} from '../lib/achievementsEngine';
import { computeMonthlyWrappedSummary } from '../lib/wrappedEngine';
import type {
  ExerciseDefinition,
  WorkoutDayPlan,
  WorkoutExerciseLog,
  WorkoutSession,
  LoggedFoodItem,
} from '../types/domain';

test('Stage 4A — Exercise Library: builtins, search, filters & custom merge', () => {
  assert.ok(BUILTIN_EXERCISES.length >= 30, 'Must have at least 30 verified Indian-accessible exercises');

  // Verify each exercise has instructions, cues, mistakes and valid targets
  for (const ex of BUILTIN_EXERCISES) {
    assert.ok(ex.id.startsWith('ex_'), `Exercise ${ex.name} id must start with ex_`);
    assert.ok(ex.name.length > 3, `Exercise ${ex.id} must have a descriptive name`);
    assert.ok(ex.instructions.length >= 2, `Exercise ${ex.name} must have at least 2 clear steps`);
    assert.ok(ex.commonMistakes.length >= 1, `Exercise ${ex.name} must list common form mistakes`);
    assert.ok(ex.primaryMuscles.length >= 1, `Exercise ${ex.name} must target primary muscles`);
    assert.ok(MUSCLE_LABELS[ex.primaryMuscles[0]], `Primary muscle must be in MUSCLE_LABELS`);
  }

  // Filter by muscle
  const chestExercises = filterExercises(BUILTIN_EXERCISES, { muscle: 'chest' });
  assert.ok(chestExercises.length >= 3, 'Must find chest exercises');
  for (const ex of chestExercises) {
    const targets = [...ex.primaryMuscles, ...ex.secondaryMuscles];
    assert.ok(targets.includes('chest'));
  }

  // Filter by environment (home)
  const homeExercises = filterExercises(BUILTIN_EXERCISES, { environment: 'home' });
  assert.ok(homeExercises.length > 0);
  for (const ex of homeExercises) {
    assert.notEqual(ex.environment, 'gym', 'Home filter must exclude gym-only exercises');
  }

  // Search by keyword
  const pushups = filterExercises(BUILTIN_EXERCISES, { search: 'push-up' });
  assert.ok(pushups.length >= 1);
  assert.ok(pushups.some((e) => e.name.toLowerCase().includes('push-up')));

  // Lookup helper
  const found = findExerciseByNameOrId('Goblet Squat', BUILTIN_EXERCISES);
  assert.ok(found);
  assert.equal(found?.id, 'ex_goblet_squat');

  // Custom exercises merge
  const customEx: ExerciseDefinition = {
    id: 'ex_custom_desi_dand',
    name: 'Desi Dand (Hindu Push-Up)',
    category: 'strength',
    environment: 'both',
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    primaryMuscles: ['shoulders', 'chest', 'core'],
    secondaryMuscles: ['triceps'],
    instructions: ['Downward dog to cobra glide.'],
    commonMistakes: ['Sagging lower back.'],
    safetyNotes: 'Keep movement fluid.',
    alternativeIds: [],
    isCustom: true,
  };
  const merged = mergeExerciseCatalog([customEx]);
  assert.equal(merged.length, BUILTIN_EXERCISES.length + 1);
  assert.equal(merged[merged.length - 1].id, 'ex_custom_desi_dand');
});

test('Stage 4A — Workout Engine: 1RM calculation, rest parsing & live session metrics', () => {
  // 1RM estimation (Epley formula: weight * (1 + reps/30))
  assert.equal(estimateOneRepMax(0, 10), 0);
  assert.equal(estimateOneRepMax(100, 1), 100);
  // 100kg for 10 reps -> 100 * (1 + 10/30) = 133.3 kg
  assert.equal(estimateOneRepMax(100, 10), 133.3);
  // 60kg for 6 reps -> 60 * (1 + 6/30) = 60 * 1.2 = 72 kg
  assert.equal(estimateOneRepMax(60, 6), 72);

  // Rest parser
  assert.equal(parseRestSeconds('60s'), 60);
  assert.equal(parseRestSeconds('90 sec'), 90);
  assert.equal(parseRestSeconds('2 min'), 120);
  assert.equal(parseRestSeconds(''), 45); // default fallback

  // Set & rep parsers
  assert.equal(parseTargetSetCount('4 sets'), 4);
  assert.equal(parseTargetSetCount('3'), 3);
  assert.equal(parseTargetRepsNum('10-12'), 10);
  assert.equal(parseTargetRepsNum('15'), 15);

  // Benchmark history lookup
  const pastSession: WorkoutSession = {
    id: 'sess_prev',
    clientId: 'cl_aarav',
    dateKey: '2026-11-10',
    title: 'Upper Body',
    status: 'completed',
    startedAt: '2026-11-10T10:00:00Z',
    durationSeconds: 2400,
    totalVolumeKg: 4500,
    completedSetsCount: 12,
    prCount: 1,
    exercises: [
      {
        exerciseId: 'ex_incline_db_press',
        exerciseName: 'Incline Dumbbell Press',
        targetSets: '3',
        targetReps: '10',
        restSeconds: 60,
        sets: [
          { setNumber: 1, reps: 10, weightKg: 20, completed: true },
          { setNumber: 2, reps: 10, weightKg: 22.5, completed: true },
          { setNumber: 3, reps: 8, weightKg: 22.5, completed: true },
        ],
      },
    ],
    updatedAt: '2026-11-10T11:00:00Z',
  };

  const prevBest = getPreviousExerciseBest('Incline Dumbbell Press', 'ex_incline_db_press', [pastSession], 'cl_aarav');
  assert.equal(prevBest.bestWeightKg, 22.5);
  assert.equal(prevBest.bestRepsAtWeight, 10);
  assert.ok(prevBest.bestEstimated1RM > 29);
  assert.equal(prevBest.lastSessionDate, '2026-11-10');

  // Compute live session metrics & personal record detection
  const currentExercises: WorkoutExerciseLog[] = [
    {
      exerciseId: 'ex_incline_db_press',
      exerciseName: 'Incline Dumbbell Press',
      targetSets: '3',
      targetReps: '10',
      restSeconds: 60,
      sets: [
        { setNumber: 1, reps: 10, weightKg: 22.5, completed: true },
        { setNumber: 2, reps: 10, weightKg: 25, completed: true }, // PR! 25kg > 22.5kg
        { setNumber: 3, reps: 8, weightKg: 25, completed: false }, // Not completed, ignored
      ],
    },
  ];

  const metrics = computeSessionMetrics(currentExercises, [pastSession], 'cl_aarav');
  // Volume: (22.5 * 10) + (25 * 10) = 225 + 250 = 475 kg
  assert.equal(metrics.totalVolumeKg, 475);
  assert.equal(metrics.completedSetsCount, 2);
  assert.equal(metrics.prCount, 1);
  assert.equal(metrics.exercisesWithPRs[0].sets[1].isPersonalRecord, true);
  assert.equal(metrics.exercisesWithPRs[0].sets[0].isPersonalRecord, false);

  // Initial exercises builder from day plan
  const dayPlan: WorkoutDayPlan = {
    dayIndex: 0,
    dayLabel: 'Mon',
    focusTitle: 'Upper Push',
    isRecoveryDay: false,
    durationMinutes: 45,
    coachInstructions: 'Controlled eccentric tempo.',
    exercises: [
      { id: 'item_1', name: 'Incline Dumbbell Press', sets: '3', reps: '10', rest: '60s' },
    ],
  };
  const built = buildInitialWorkoutExercises(dayPlan, BUILTIN_EXERCISES, [pastSession], 'cl_aarav');
  assert.equal(built.length, 1);
  assert.equal(built[0].exerciseId, 'ex_incline_db_press');
  assert.equal(built[0].sets.length, 3);
  assert.equal(built[0].sets[0].weightKg, 22.5); // Pre-filled with previous best weight
});

test('Stage 4A — Indian Food Database: nutrition scaling & daily totals', () => {
  assert.ok(INDIAN_FOOD_DATABASE.length >= 20, 'Must have at least 20 Indian staples');

  // Verify nutritional integrity
  for (const food of INDIAN_FOOD_DATABASE) {
    assert.ok(food.id.startsWith('fd_'), `Food ${food.name} id must start with fd_`);
    assert.ok(food.estimatedCalories > 0, `Food ${food.name} must have positive calories`);
    assert.ok(food.estimatedProteinG >= 0, `Food ${food.name} must have non-negative protein`);
    assert.ok(food.servingGrams > 0, `Food ${food.name} must have serving grams`);
  }

  // Food scaling
  const paneer = INDIAN_FOOD_DATABASE.find((f) => f.id === 'fd_paneer_bhurji')!;
  assert.ok(paneer);
  // 1.5x portion
  const loggedItem = scaleFoodToLoggedItem(paneer, 'lunch', 1.5, 'item_paneer_1');
  assert.equal(loggedItem.servings, 1.5);
  assert.equal(loggedItem.slot, 'lunch');
  assert.equal(loggedItem.estimatedCalories, Math.round(paneer.estimatedCalories * 1.5));
  assert.equal(loggedItem.estimatedProteinG, Math.round(paneer.estimatedProteinG * 1.5 * 10) / 10);
  assert.equal(loggedItem.isEstimated, true);

  // Daily totals calculation
  const roti = INDIAN_FOOD_DATABASE.find((f) => f.id === 'fd_phulka')!;
  const dal = INDIAN_FOOD_DATABASE.find((f) => f.id === 'fd_dal_tadka')!;
  assert.ok(roti);
  assert.ok(dal);
  const items: LoggedFoodItem[] = [
    scaleFoodToLoggedItem(roti, 'lunch', 2, 'item_1'), // 2 rotis
    scaleFoodToLoggedItem(dal, 'lunch', 1, 'item_2'),  // 1 bowl dal
  ];

  const totals = computeNutritionTotals(items);
  const expectedCal = items[0].estimatedCalories + items[1].estimatedCalories;
  const expectedProtein = Math.round((items[0].estimatedProteinG + items[1].estimatedProteinG) * 10) / 10;
  assert.equal(totals.calories, expectedCal);
  assert.equal(totals.proteinG, expectedProtein);
});

test('Stage 4A — Achievements Engine: unlocks & progress evaluation', () => {
  assert.equal(ACHIEVEMENT_CATALOG.length, 9, 'Must have exactly 9 badge definitions');

  const assignments: Assignment[] = [
    {
      id: 'asg_1',
      clientId: 'cl_aarav',
      title: 'Workout',
      category: 'workout',
      instructions: 'Lift',
      durationMinutes: 40,
      dueTime: '8:00 PM',
      completionType: 'checkbox',
      scheduledDates: ['2026-11-14', '2026-11-15'],
      isOptional: false,
      isRecovery: false,
      hasCustomOverride: false,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  const completions: CompletionEvent[] = [
    {
      id: 'comp_1',
      assignmentId: 'asg_1',
      clientId: 'cl_aarav',
      dateKey: '2026-11-15',
      completedAt: '2026-11-15T18:00:00Z',
    },
  ];

  const sessions: WorkoutSession[] = [
    {
      id: 'sess_1',
      clientId: 'cl_aarav',
      dateKey: '2026-11-15',
      title: 'First Workout',
      status: 'completed',
      startedAt: '2026-11-15T17:00:00Z',
      durationSeconds: 1800,
      totalVolumeKg: 3500,
      completedSetsCount: 10,
      prCount: 1,
      exercises: [],
      updatedAt: '2026-11-15T18:00:00Z',
    },
  ];

  const evalResult = evaluateAchievementsState({
    clientId: 'cl_aarav',
    todayKey: '2026-11-15',
    assignments,
    completions,
    approvedRecoveryDates: [],
    workoutSessions: sessions,
    progressEvents: [],
    existingUnlocks: [],
  });

  // Should have earned first_workout and personal_record badges
  assert.ok(evalResult.newlyUnlocked.some((u) => u.badgeId === 'first_workout'));
  assert.ok(evalResult.newlyUnlocked.some((u) => u.badgeId === 'personal_record'));

  // If already unlocked, newlyUnlocked must deduplicate and return 0
  const reEval = evaluateAchievementsState({
    clientId: 'cl_aarav',
    todayKey: '2026-11-15',
    assignments,
    completions,
    approvedRecoveryDates: [],
    workoutSessions: sessions,
    progressEvents: [],
    existingUnlocks: evalResult.newlyUnlocked,
  });
  assert.equal(reEval.newlyUnlocked.length, 0, 'Must deduplicate already unlocked badges');
});

test('Stage 4A — FitPlus Wrapped: monthly aggregation & privacy controls', () => {
  const sessions: WorkoutSession[] = [
    {
      id: 'sess_nov_1',
      clientId: 'cl_aarav',
      dateKey: '2026-11-05',
      title: 'Legs & Core',
      status: 'completed',
      startedAt: '2026-11-05T09:00:00Z',
      durationSeconds: 2700, // 45 mins
      totalVolumeKg: 5200,
      completedSetsCount: 15,
      prCount: 2,
      exercises: [
        {
          exerciseId: 'ex_goblet_squat',
          exerciseName: 'Goblet Squat (Dumbbell or Kettlebell)',
          targetSets: '3',
          targetReps: '12',
          restSeconds: 60,
          sets: [
            { setNumber: 1, reps: 12, weightKg: 20, completed: true },
            { setNumber: 2, reps: 12, weightKg: 20, completed: true },
            { setNumber: 3, reps: 12, weightKg: 22.5, completed: true },
          ],
        },
      ],
      updatedAt: '2026-11-05T10:00:00Z',
    },
  ];

  const summary = computeMonthlyWrappedSummary({
    clientId: 'cl_aarav',
    monthKey: '2026-11',
    todayKey: '2026-11-15',
    assignments: [],
    completions: [],
    approvedRecoveryDates: [],
    workoutSessions: sessions,
    achievements: [],
    progressEvents: [],
    includeWeightChange: false, // Default privacy OFF
  });

  assert.equal(summary.monthKey, '2026-11');
  assert.equal(summary.workoutsCompleted, 1);
  assert.equal(summary.totalTrainingMinutes, 45);
  assert.equal(summary.totalVolumeKg, 5200);
  assert.equal(summary.prsAchieved, 2);
  assert.equal(summary.topExercise, 'Goblet Squat (Dumbbell or Kettlebell)');
  assert.equal(summary.optionalWeightChangeKg, undefined, 'Weight change must be undefined when privacy toggle is OFF');
});

test('Stage 4B — Messaging Engine: conversation IDs, Indian time formatting, and WhatsApp chat links', () => {
  const convId = buildConversationId('cl_aarav', 'trn_arjun');
  assert.equal(convId, 'conv_cl_aarav_trn_arjun');

  const testIso = '2026-11-16T09:30:00.000Z';
  const formattedTime = formatTimeIndian(testIso);
  assert.ok(formattedTime.includes(':'), 'Time should format with hours and minutes');

  const waUrl = buildWhatsAppChatUrl('+919876543210', 'Namaste Aarav! Coach Arjun here.');
  assert.ok(waUrl && waUrl.startsWith('https://wa.me/919876543210'));
  assert.ok(waUrl.includes('Namaste%20Aarav'));
});

test('Stage 4B — Coaching Builders: visual workout day metrics and nutrition macro scaling', () => {
  const sampleDay = {
    dayIndex: 0,
    dayLabel: 'Day 1',
    focusTitle: 'Push Day',
    isRecoveryDay: false,
    durationMinutes: 50,
    coachInstructions: 'Controlled eccentric tempo.',
    exercises: [
      {
        id: 'ex_1',
        name: 'Incline DB Press',
        targetSets: 4,
        targetReps: '8-10',
        restSeconds: 90,
      },
      {
        id: 'ex_2',
        name: 'Cable Flyes',
        targetSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
      },
    ],
  };

  const workoutMetrics = calculateVisualWorkoutDayMetrics(sampleDay);
  assert.equal(workoutMetrics.exerciseCount, 2);
  assert.equal(workoutMetrics.totalSets, 7);
  assert.ok(workoutMetrics.estimatedMinutes >= 15);

  const paneerFood = INDIAN_FOOD_DATABASE.find((f) => f.id === 'fd_paneer_bhurji');
  assert.ok(paneerFood, 'Paneer bhurji must exist in Indian food database');
  const scaled = scaleIndianFoodItem(paneerFood, 2);
  assert.equal(scaled.servings, 2);
  assert.equal(scaled.estimatedCalories, paneerFood.estimatedCalories * 2);
  assert.equal(scaled.estimatedProteinG, paneerFood.estimatedProteinG * 2);

  const mealTotals = calculateVisualNutritionDayMacros([
    {
      slot: 'lunch',
      title: 'Lunch',
      items: [scaled],
    },
  ]);
  assert.equal(mealTotals.calories, paneerFood.estimatedCalories * 2);
  assert.equal(mealTotals.proteinG, paneerFood.estimatedProteinG * 2);
});

test('Stage 4B — Client Pulse & Action Items: status classification and priority ranking', () => {
  const mockClient = {
    id: 'cl_test',
    userId: 'usr_test',
    firstName: 'Dev',
    lastName: 'Sharma',
    primaryGoal: 'muscle_strength' as const,
    experienceLevel: 'intermediate' as const,
    environment: 'gym' as const,
    daysPerWeek: 4,
    equipment: ['dumbbells'],
    dietaryPreference: 'vegetarian' as const,
    targetWeightKg: 75,
    gender: 'male' as const,
    createdAt: '2026-10-01T00:00:00Z',
  };

  // Client with 0 completions should trigger attention
  const pulse = computeClientPulse({
    client: mockClient,
    assignments: [
      {
        id: 'asg_1',
        clientId: 'cl_test',
        title: 'Workout',
        category: 'workout',
        instructions: 'Lift',
        durationMinutes: 45,
        dueTime: '08:00',
        completionType: 'checkbox',
        isOptional: false,
        isRecovery: false,
        hasCustomOverride: false,
        scheduledDates: ['2026-11-10', '2026-11-12', '2026-11-14'],
        createdAt: '2026-11-01T00:00:00Z',
      },
    ],
    completions: [],
    todayKey: '2026-11-16',
    workoutSessions: [],
    weeklyCheckIns: [],
  });

  assert.ok(
    pulse.status === 'needs_attention' || pulse.status === 'follow_up_recommended',
    'Client with missing workouts should require attention',
  );
  assert.ok(pulse.attentionReasons.length > 0);

  // Trainer action items ranking
  const actionItems = computeTrainerActionItems({
    clients: [mockClient],
    assignments: [],
    completions: [],
    todayKey: '2026-11-16',
    workoutSessions: [],
    weeklyCheckIns: [
      {
        id: 'wci_1',
        clientId: 'cl_test',
        weekKey: '2026-11-15',
        dateKey: '2026-11-15',
        energyLevel: 3,
        sleepQuality: 3,
        workoutDifficulty: 4,
        hungerLevel: 3,
        createdAt: '2026-11-15T20:00:00Z',
        updatedAt: '2026-11-15T20:00:00Z',
      },
    ],
    subscriptions: [],
    conversations: [
      {
        id: 'conv_1',
        clientId: 'cl_test',
        clientUserId: 'usr_test',
        clientName: 'Dev Sharma',
        trainerId: 'trn_arjun',
        trainerUserId: 'usr_trainer_arjun',
        trainerName: 'Coach Arjun',
        unreadCountClient: 0,
        unreadCountTrainer: 2,
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-16T08:00:00Z',
      },
    ],
  });

  assert.ok(actionItems.length >= 2, 'Should generate actions for unread chat and pending check-in');
  assert.equal(actionItems[0].priority, 'high', 'Highest priority action should be ranked first');
});

test('Stage 4B — Automation & Reminders: quiet hours evaluation and idempotency dispatch', () => {
  const pastReminder = {
    id: 'rem_past',
    recipientUserId: 'usr_client_aarav',
    category: 'workout' as const,
    title: 'Hydration Target',
    body: 'Time to drink your afternoon water target!',
    scheduledFor: '2026-11-16T12:00:00Z',
    triggerStatus: 'scheduled' as const,
    idempotencyKey: 'rem_hydration_20261116',
    channel: 'in_app' as const,
    createdAt: '2026-11-16T08:00:00Z',
  };

  const futureReminder = {
    id: 'rem_future',
    recipientUserId: 'usr_client_aarav',
    category: 'check_in' as const,
    title: 'Sunday Check-in',
    body: 'Log your weekly check-in.',
    scheduledFor: '2026-11-20T18:00:00Z',
    triggerStatus: 'scheduled' as const,
    idempotencyKey: 'rem_checkin_20261120',
    channel: 'in_app' as const,
    createdAt: '2026-11-16T08:00:00Z',
  };

  const evalResult = evaluateScheduledReminders({
    reminders: [pastReminder, futureReminder],
    nowIso: '2026-11-16T14:00:00Z',
    enforceQuietHours: false,
  });

  assert.equal(evalResult.dispatchedReminders.length, 1);
  assert.equal(evalResult.dispatchedReminders[0].id, 'rem_past');
  assert.equal(evalResult.dispatchedReminders[0].triggerStatus, 'sent');
  assert.equal(evalResult.generatedNotifications.length, 1);
  assert.equal(evalResult.generatedNotifications[0].recipientUserId, 'usr_client_aarav');
});

test('Stage 4C — Commercial Engine: GST invoicing, coupon code validation, and trainer settlements', () => {
  // 1. Coupon validation
  const welcomeRes = validateCouponCode({ code: 'WELCOME20', originalAmountInr: 3000 });
  assert.equal(welcomeRes.isValid, true);
  assert.equal(welcomeRes.discountInr, 600); // 20% of 3000
  assert.equal(welcomeRes.finalAmountInr, 2400);

  const cappedRes = validateCouponCode({ code: 'WELCOME20', originalAmountInr: 8000 });
  assert.equal(cappedRes.isValid, true);
  assert.equal(cappedRes.discountInr, 1000); // Capped at 1000
  assert.equal(cappedRes.finalAmountInr, 7000);

  const flatRes = validateCouponCode({ code: 'FITPLUS500', originalAmountInr: 2500 });
  assert.equal(flatRes.isValid, true);
  assert.equal(flatRes.discountInr, 500);
  assert.equal(flatRes.finalAmountInr, 2000);

  const coachRes = validateCouponCode({ code: 'VIP10', originalAmountInr: 5000 });
  assert.equal(coachRes.isValid, true);
  assert.equal(coachRes.discountInr, 500);
  assert.equal(coachRes.finalAmountInr, 4500);

  const invalidRes = validateCouponCode({ code: 'INVALID_CODE', originalAmountInr: 2000 });
  assert.equal(invalidRes.isValid, false);
  assert.equal(invalidRes.discountInr, 0);

  // 2. GST Breakdown (18% inclusive)
  const gst = computeGstBreakdown(5900);
  assert.equal(gst.totalAmountInr, 5900);
  assert.equal(gst.baseAmountInr, 5000); // 5900 / 1.18 = 5000
  assert.equal(gst.cgstInr, 450); // 9%
  assert.equal(gst.sgstInr, 450); // 9%
  assert.equal(gst.totalGstInr, 900); // 18%

  // 3. Trainer Settlement (10% platform fee, 90% take home)
  const settlement = computeTrainerSettlement(10000);
  assert.equal(settlement.grossAmountInr, 10000);
  assert.equal(settlement.platformFeeInr, 1000); // 10%
  assert.equal(settlement.netPayableInr, 9000); // 90%
});

test('Stage 4C — Growth Engine: Referral codes, deep links, and reward qualification', () => {
  const code = generateReferralCode('Pranav Shinde', 'user_7x9q123');
  assert.equal(code, 'FIT-PRANAV-Q123');

  const deepLink = buildReferralDeepLink(code, 'https://fitplus-kappa.vercel.app');
  assert.equal(deepLink, 'https://fitplus-kappa.vercel.app/auth?ref=FIT-PRANAV-Q123');

  const eligibleReward = evaluateReferralReward(3500);
  assert.equal(eligibleReward.isEligible, true);
  assert.equal(eligibleReward.discountInr, 500);
  assert.equal(eligibleReward.rewardInr, 500);

  const ineligibleReward = evaluateReferralReward(1000); // Below 1500 minimum
  assert.equal(ineligibleReward.isEligible, false);
  assert.equal(ineligibleReward.discountInr, 0);
});




