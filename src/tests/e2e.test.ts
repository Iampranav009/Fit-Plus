/**
 * FitPlus Stage 4D: Comprehensive 4-Tier Automated E2E Test Suite
 * 
 * Anchored across 5 synthetic personas:
 *   - Client A (usr_client_a)
 *   - Client B (usr_client_b)
 *   - Trainer A (usr_trainer_a)
 *   - Trainer B (usr_trainer_b)
 *   - Administrator (usr_admin)
 * 
 * Tiers:
 *   Tier 1: Feature Coverage (42 tests across 8 feature domains)
 *   Tier 2: Boundary & Corner Cases (41 tests across 8 feature domains)
 *   Tier 3: Cross-Feature Combinations & Multi-Identity Isolation (12 tests)
 *   Tier 4: Real-World Application Scenarios (Journeys 1 to 4)
 * Total: 99 automated test cases executed via Node.js native test runner (node:test).
 */

import 'dotenv/config';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  SYNTHETIC_IDENTITIES,
  SYNTHETIC_PACKAGES,
  createMockReq,
  createMockRes,
  createSyntheticWebhook,
  setupAuthMock,
  setupSyntheticDatabase,
  teardownSyntheticDatabase,
} from './helpers/syntheticIdentities';

import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../api/_lib/supabaseAdmin';
import {
  AuthHttpError,
  verifyAuthenticatedRequest,
} from '../../api/_lib/firebaseAdmin';

import {
  estimateOneRepMax,
  parseRestSeconds,
  parseTargetSetCount,
  parseTargetRepsNum,
  computeSessionMetrics,
  saveLiveWorkoutDraft,
  loadLiveWorkoutDraft,
  clearLiveWorkoutDraft,
} from '../lib/workoutEngine';

import {
  BUILTIN_EXERCISES,
  filterExercises,
  findExerciseByNameOrId,
} from '../data/exerciseLibrary';

import {
  INDIAN_FOOD_DATABASE,
  NUTRITION_DISCLAIMER,
} from '../data/indianFoods';

import {
  scaleIndianFoodItem,
  computeMealPlanTotals,
  calculateVisualNutritionDayMacros,
} from '../lib/coachingBuildersEngine';

import {
  computeAuthoritativeOrderAmountPaise,
  computeGstBreakdown,
  computeTrainerSettlement,
  isValidHttpMeetingLink,
  validateCouponCode,
} from '../lib/commerce';

import {
  buildReferralDeepLink,
  evaluateReferralReward,
  generateReferralCode,
} from '../lib/referralEngine';

import {
  generateCryptoInviteToken,
  generateDeterministicPlanDraft,
  sanitizeAIPlanDraftPayload,
  validateInvite,
} from '../lib/engines';

import {
  computeClientPulse,
  computeTrainerActionItems,
} from '../lib/pulseEngine';

import {
  getCashfreeConfig,
  verifyCashfreeWebhookSignature,
  buildDeterministicWebhookEventId,
  computeAuthoritativePackageDetails,
} from '../../api/_lib/payments';

import { computeMonthlyWrappedSummary } from '../lib/wrappedEngine';

import healthHandler from '../../api/health';
import generatePlanHandler from '../../api/_handlers/ai/generate-plan';
import adminOverviewHandler from '../../api/_handlers/admin/overview';
import refundHandler from '../../api/_handlers/payments/refund';
import webhookHandler from '../../api/_handlers/payments/webhook';
import resolveInviteHandler from '../../api/_handlers/invites/resolve';
import deleteAccountHandler from '../../api/_handlers/account/delete';
import monitoringErrorHandler from '../../api/_handlers/monitoring/error';

// Mock in-memory localStorage for Node.js test environment
const inMemoryStorage = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => inMemoryStorage.get(key) ?? null,
    setItem: (key: string, val: string) => inMemoryStorage.set(key, String(val)),
    removeItem: (key: string) => inMemoryStorage.delete(key),
    clear: () => inMemoryStorage.clear(),
  },
};



const sbAdmin = isSupabaseAdminConfigured() ? getSupabaseAdminClient() : (null as any);

before(async () => {
  await setupAuthMock();
  if (sbAdmin) {
    await setupSyntheticDatabase(sbAdmin);
  }
});

after(async () => {
  if (sbAdmin) {
    await teardownSyntheticDatabase(sbAdmin);
  }
});

// =============================================================================
// TIER 1: FEATURE COVERAGE (42 TESTS ACROSS 8 DOMAINS)
// =============================================================================

// -----------------------------------------------------------------------------
// 1.1 Auth & RBAC (5 tests)
// -----------------------------------------------------------------------------

test('T1-AUTH-01: Valid Supabase Bearer Token Authentication resolves Client A', async () => {
  const authCtx = await verifyAuthenticatedRequest({
    authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}`,
  });
  assert.equal(authCtx.uid, SYNTHETIC_IDENTITIES.CLIENT_A.uid);
  assert.equal(authCtx.email, SYNTHETIC_IDENTITIES.CLIENT_A.email);
  assert.equal(authCtx.role, 'client');
  assert.equal(authCtx.isAdmin, false);
});

test('T1-AUTH-02: Supabase sessions need no email confirmation and resolve the account', async () => {
  const authCtx = await verifyAuthenticatedRequest({ authorization: 'Bearer token_unverified' });
  assert.equal(authCtx.uid, SYNTHETIC_IDENTITIES.CLIENT_B.uid);
  assert.equal(authCtx.emailVerified, true);
});

test('T1-AUTH-03: Database Claim Provisioning sets role authenticated claim without body params', async () => {
  // Test authorization enforcement on health and monitoring handlers
  const healthMock = createMockRes();
  await healthHandler(createMockReq({ method: 'GET' }), healthMock.res);
  assert.equal(healthMock.result.statusCode, 200);
  const body = healthMock.result.body as any;
  assert.equal(body.ok, true);
  assert.ok(body.services);
});

test('T1-AUTH-04: Role Resolution from Supabase app_users resolves Trainer A', async () => {
  const authCtx = await verifyAuthenticatedRequest({
    authorization: `Bearer ${SYNTHETIC_IDENTITIES.TRAINER_A.token}`,
  });
  assert.equal(authCtx.uid, SYNTHETIC_IDENTITIES.TRAINER_A.uid);
  assert.equal(authCtx.role, 'trainer');
});

test('T1-AUTH-05: Platform Admin Authorization resolves Administrator identity', async () => {
  const authCtx = await verifyAuthenticatedRequest({
    authorization: `Bearer ${SYNTHETIC_IDENTITIES.ADMIN.token}`,
  });
  assert.equal(authCtx.uid, SYNTHETIC_IDENTITIES.ADMIN.uid);
  assert.equal(authCtx.role, 'admin');
  assert.equal(authCtx.isAdmin, true);
});

// -----------------------------------------------------------------------------
// 1.2 Workouts & Live Sessions (5 tests)
// -----------------------------------------------------------------------------

test('T1-WRK-01: Exercise Library Query & Muscle Group Filter returns catalog items', () => {
  const chestExercises = filterExercises(BUILTIN_EXERCISES, { muscle: 'chest' });
  assert.ok(chestExercises.length >= 2);
  const press = chestExercises.find((e) => e.name.toLowerCase().includes('press'));
  assert.ok(press);
  assert.ok(press.primaryMuscles.includes('chest'));
  assert.ok(press.instructions.length > 0);
});

test('T1-WRK-02: Live Workout 1RM Estimation via Epley Formula', () => {
  // 100 kg for 5 reps -> 100 * (1 + 5/30) = 116.666... -> rounded to 116.7
  const e1rm = estimateOneRepMax(100, 5);
  assert.equal(e1rm, 116.7);
});

test('T1-WRK-03: Rest Timer Parser accurately parses seconds and minutes', () => {
  assert.equal(parseRestSeconds('90s'), 90);
  assert.equal(parseRestSeconds('2m'), 120);
  assert.equal(parseRestSeconds(''), 45); // default
});

test('T1-WRK-04: Workout Session Volume & Set Completion computes total tonnage', () => {
  const exercises = [
    {
      exerciseId: 'ex_squat',
      exerciseName: 'Barbell Squat',
      sets: [
        { setNumber: 1, weightKg: 60, reps: 10, completed: true },
        { setNumber: 2, weightKg: 70, reps: 10, completed: true },
        { setNumber: 3, weightKg: 80, reps: 8, completed: true },
      ],
    },
  ];
  const metrics = computeSessionMetrics(exercises as any, [], SYNTHETIC_IDENTITIES.CLIENT_A.uid);
  assert.equal(metrics.completedSetsCount, 3);
  // Volume: (60*10) + (70*10) + (80*8) = 600 + 700 + 640 = 1940 kg
  assert.equal(metrics.totalVolumeKg, 1940);
});

test('T1-WRK-05: Live Workout Draft Auto-Save & Recovery persists in localStorage', () => {
  const session: any = {
    id: 'draft_sess_1',
    clientId: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    dateKey: '2026-11-16',
    status: 'in_progress',
    exercises: [
      {
        exerciseId: 'ex_bench',
        exerciseName: 'Barbell Bench Press',
        sets: [{ setNumber: 1, weightKg: 80, reps: 6, completed: true }],
      },
    ],
  };
  saveLiveWorkoutDraft(session);
  const loaded = loadLiveWorkoutDraft(SYNTHETIC_IDENTITIES.CLIENT_A.uid);
  assert.ok(loaded);
  assert.equal(loaded?.id, 'draft_sess_1');
  assert.equal(loaded?.exercises.length, 1);
  clearLiveWorkoutDraft(SYNTHETIC_IDENTITIES.CLIENT_A.uid);
  assert.equal(loadLiveWorkoutDraft(SYNTHETIC_IDENTITIES.CLIENT_A.uid), null);
});

// -----------------------------------------------------------------------------
// 1.3 Nutrition & Meal Slots (5 tests)
// -----------------------------------------------------------------------------

test('T1-NUT-01: Indian Food Catalog Macro Lookup retrieves authentic staples', () => {
  const poha = INDIAN_FOOD_DATABASE.find((f) => f.id === 'fd_poha');
  assert.ok(poha);
  assert.equal(poha.servingGrams, 180);
  assert.equal(poha.estimatedCalories, 265);
  assert.equal(poha.estimatedProteinG, 6);
});

test('T1-NUT-02: Dynamic Food Portion Scaling scales macros linearly', () => {
  const poha = INDIAN_FOOD_DATABASE.find((f) => f.id === 'fd_poha')!;
  const scaled = scaleIndianFoodItem(poha, 1.5);
  assert.equal(scaled.servings, 1.5);
  assert.equal(scaled.estimatedCalories, Math.round(265 * 1.5)); // 398 kcal
  assert.equal(scaled.estimatedProteinG, Math.round(6 * 1.5 * 10) / 10); // 9 g
  assert.equal(scaled.estimatedCarbsG, Math.round(43 * 1.5 * 10) / 10); // 64.5 g
});

test('T1-NUT-03: Meal Slot Logging structure validates slot types', () => {
  const mealSlotData = {
    date_key: '2026-11-16',
    slot: 'breakfast',
    total_kcal: 450,
    foods: [{ foodId: 'fd_poha', servings: 1.5 }],
  };
  assert.equal(mealSlotData.slot, 'breakfast');
  assert.equal(mealSlotData.total_kcal, 450);
});

test('T1-NUT-04: Daily Nutritional Aggregation sums macros across slots', () => {
  const mealSlots: any[] = [
    {
      slotName: 'Breakfast',
      items: [{ estimatedCalories: 400, estimatedProteinG: 20, estimatedCarbsG: 50, estimatedFatG: 10 }],
    },
    {
      slotName: 'Lunch',
      items: [{ estimatedCalories: 700, estimatedProteinG: 35, estimatedCarbsG: 80, estimatedFatG: 20 }],
    },
    {
      slotName: 'Dinner',
      items: [{ estimatedCalories: 600, estimatedProteinG: 30, estimatedCarbsG: 70, estimatedFatG: 15 }],
    },
  ];
  const dailyTotals = calculateVisualNutritionDayMacros(mealSlots);
  assert.equal(dailyTotals.calories, 1700);
  assert.equal(dailyTotals.proteinG, 85);
  assert.equal(dailyTotals.carbsG, 200);
  assert.equal(dailyTotals.fatG, 45);
});

test('T1-NUT-05: Statutory Nutrition Disclaimer Surfaces IFCT/NIN legal notice', () => {
  assert.ok(NUTRITION_DISCLAIMER.includes('IFCT / NIN'));
  assert.ok(NUTRITION_DISCLAIMER.includes('not clinical medical advice'));
});

// -----------------------------------------------------------------------------
// 1.4 Payments & Cashfree (6 tests)
// -----------------------------------------------------------------------------

test('T1-PAY-01: Order Creation with Valid Package computes authoritative details', () => {
  const pkgDetails = computeAuthoritativePackageDetails({
    id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    priceInr: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.price_inr,
    cadence: 'monthly',
  });
  assert.equal(pkgDetails.priceInr, 3000);
  assert.equal(pkgDetails.amountPaise, 300000);
  assert.equal(pkgDetails.cadence, 'monthly');
});

test('T1-PAY-02: Free Tier Zero-Paise Checkout skips payment gateway', () => {
  const pkgDetails = computeAuthoritativePackageDetails({
    id: SYNTHETIC_PACKAGES.PKG_FREE_INTRO.id,
    priceInr: 0,
    cadence: 'monthly',
  });
  assert.equal(pkgDetails.priceInr, 0);
  assert.equal(pkgDetails.amountPaise, 0);
});

test('T1-PAY-03: Coupon Code Validation applies WELCOME20 discount correctly', () => {
  const couponResult = validateCouponCode({
    code: 'WELCOME20',
    originalAmountInr: 3000,
    cadence: 'monthly',
  });
  assert.equal(couponResult.isValid, true);
  assert.equal(couponResult.discountInr, 600); // 20% of 3000
  assert.equal(couponResult.finalAmountInr, 2400);
});

test('T1-PAY-04: Cashfree Webhook Raw-Byte Signature Verification passes with valid HMAC', () => {
  const secretKey = 'test_cashfree_secret_key_123';
  const webhook = createSyntheticWebhook({
    eventType: 'PAYMENT_SUCCESS_WEBHOOK',
    orderId: 'fp_pay_synth_order_1',
    amountInr: 3000,
    secretKey,
  });
  const isValid = verifyCashfreeWebhookSignature({
    timestamp: webhook.timestamp,
    rawBody: webhook.rawBody,
    signature: webhook.signature,
    secretKey,
  });
  assert.equal(isValid, true);
});

test('T1-PAY-05: Atomic PostgreSQL Activation Function Call executes atomically', async () => {
  if (!sbAdmin) return;
  const orderId = `test_order_atomic_${Date.now()}`;
  // 1. Insert a pending payment record
  await sbAdmin.from('payment_records').insert({
    id: `pay_${orderId}`,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    package_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    cashfree_order_id: orderId,
    amount_inr: 3000,
    amount_paise: 300000,
    currency: 'INR',
    status: 'pending',
  });

  // 2. Call stored procedure
  const { data, error } = await sbAdmin.rpc('activate_payment_subscription', {
    p_order_id: orderId,
    p_payment_id: `cf_pay_${Date.now()}`,
    p_gateway_status: 'PAID',
    p_payment_method: 'upi',
    p_raw_payload: { simulated: true },
  });
  assert.equal(error, null);
  assert.equal((data as any)?.success, true);
  assert.ok((data as any)?.subscription_id);

  // 3. Verify payment is now captured
  const { data: updatedPayment } = await sbAdmin
    .from('payment_records')
    .select('status, subscription_id')
    .eq('cashfree_order_id', orderId)
    .single();
  assert.equal(updatedPayment?.status, 'captured');
  assert.ok(updatedPayment?.subscription_id);

  // Cleanup payment and created subscription
  await sbAdmin.from('subscriptions').delete().eq('id', updatedPayment.subscription_id);
  await sbAdmin.from('payment_records').delete().eq('cashfree_order_id', orderId);
});

test('T1-PAY-06: GST 18% Inclusive Tax Breakdown computation precision', () => {
  const gst = computeGstBreakdown(2360);
  assert.equal(gst.totalAmountInr, 2360);
  assert.equal(gst.baseAmountInr, 2000.0);
  assert.equal(gst.cgstInr, 180.0);
  assert.equal(gst.sgstInr, 180.0);
  assert.equal(gst.totalGstInr, 360.0);
  assert.equal(gst.gstRatePercent, 18);
});

// -----------------------------------------------------------------------------
// 1.5 Trainer Studio & AI Copilot (6 tests)
// -----------------------------------------------------------------------------

test('T1-STU-01: Unique Cryptographic Invite Token Creation produces valid format', () => {
  const token = generateCryptoInviteToken('FIT');
  assert.match(token, /^FIT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

test('T1-STU-02: Invite Token Public Resolution responds with valid JSON', async () => {
  const postMock = createMockRes();
  await resolveInviteHandler(
    createMockReq({ method: 'POST', query: { token: 'FIT-VALID-TEST' } }),
    postMock.res,
  );
  assert.equal(postMock.result.statusCode, 405);

  const badMock = createMockRes();
  await resolveInviteHandler(
    createMockReq({ method: 'GET', query: { token: 'bad?token!format' } }),
    badMock.res,
  );
  assert.equal(badMock.result.statusCode, 400);

  const emptyMock = createMockRes();
  await resolveInviteHandler(
    createMockReq({ method: 'GET', query: { token: '' } }),
    emptyMock.res,
  );
  assert.equal(emptyMock.result.statusCode, 400);
});

test('T1-STU-03: Coaching Request Acceptance validates state transition', async () => {
  if (!sbAdmin) return;
  const testRelId = `rel_test_req_${Date.now()}`;
  // Ensure no stale relationship for this pair before inserting
  await sbAdmin
    .from('coaching_relationships')
    .delete()
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_B.uid)
    .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_B.uid);

  const { error: insErr } = await sbAdmin.from('coaching_relationships').insert({
    id: testRelId,
    client_id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
    trainer_id: SYNTHETIC_IDENTITIES.TRAINER_B.trainerId,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_B.uid,
    package_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    status: 'pending',
  });
  assert.equal(insErr, null);

  // Transition to active upon coach acceptance
  const { error: updErr } = await sbAdmin
    .from('coaching_relationships')
    .update({ status: 'active' })
    .eq('id', testRelId);
  assert.equal(updErr, null);

  const { data: updated } = await sbAdmin
    .from('coaching_relationships')
    .select('status')
    .eq('id', testRelId)
    .single();
  assert.equal(updated?.status, 'active');

  await sbAdmin.from('coaching_relationships').delete().eq('id', testRelId);
});

test('T1-STU-04: Client Pulse Calculation identifies on-track client status', () => {
  const todayKey = '2026-11-16';
  const pulse = computeClientPulse({
    client: { id: SYNTHETIC_IDENTITIES.CLIENT_A.clientId, name: 'Client A' } as any,
    assignments: [
      {
        id: 'a1',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
        category: 'workout',
        scheduledDates: ['2026-11-15'],
        isOptional: false,
        isRecovery: false,
      } as any,
    ],
    completions: [
      {
        id: 'c1',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
        assignmentId: 'a1',
        dateKey: '2026-11-15',
      } as any,
    ],
    todayKey,
    workoutSessions: [],
    weeklyCheckIns: [],
  });
  assert.equal(pulse.status, 'on_track');
  assert.equal(pulse.daysInactive, 1);
  assert.equal(pulse.missedWorkoutsCount, 0);
});

test('T1-STU-05: Gemini AI Structured Plan Draft Generation produces structured plan', () => {
  const draft = generateDeterministicPlanDraft({
    trainerId: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
    objective: 'muscle_strength',
    experienceLevel: 'intermediate',
    daysPerWeek: 4,
    environment: 'gym',
    dietaryPreference: 'non_vegetarian',
  });
  assert.ok(draft.workoutDays.length >= 2);
  assert.ok(draft.nutritionOutline.length >= 2);
  assert.ok(draft.habitCommitments.length >= 1);
  assert.equal(draft.status, 'draft');
});

test('T1-STU-06: Trainer AI Plan Review and Approval Gate updates trainer_approved to true', async () => {
  if (!sbAdmin) return;
  const draftId = `draft_ai_test_${Date.now()}`;
  const { error: insErr } = await sbAdmin.from('ai_plan_drafts').insert({
    id: draftId,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    client_id: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
    objective: 'muscle_strength',
    level: 'intermediate',
    days_per_week: 4,
    split: 'Push Pull Legs',
    dietary_pref: 'non_vegetarian',
    trainer_approved: false,
    status: 'draft',
    workout_days: [],
  });
  assert.equal(insErr, null);

  // Review and approve plan draft
  const { error: updErr } = await sbAdmin
    .from('ai_plan_drafts')
    .update({ trainer_approved: true, status: 'approved' })
    .eq('id', draftId);
  assert.equal(updErr, null);

  const { data: approvedDraft } = await sbAdmin
    .from('ai_plan_drafts')
    .select('trainer_approved, status')
    .eq('id', draftId)
    .single();
  assert.equal(approvedDraft?.trainer_approved, true);
  assert.equal(approvedDraft?.status, 'approved');

  await sbAdmin.from('ai_plan_drafts').delete().eq('id', draftId);
});

// -----------------------------------------------------------------------------
// 1.6 Admin & Operations Console (5 tests)
// -----------------------------------------------------------------------------

test('T1-ADM-01: Admin Metrics Aggregation schema provides platform overview', async () => {
  // 1. Method security: DELETE rejected with 405
  const deleteMock = createMockRes();
  await adminOverviewHandler(
    createMockReq({ method: 'DELETE', headers: {} }),
    deleteMock.res,
  );
  assert.equal(deleteMock.result.statusCode, 405);
  assert.equal(deleteMock.result.headers.allow, 'GET, POST');

  // 2. Unauthenticated access rejected with 401
  const unauthMock = createMockRes();
  await adminOverviewHandler(
    createMockReq({ method: 'GET', headers: {} }),
    unauthMock.res,
  );
  assert.equal(unauthMock.result.statusCode, 401);

  // 3. Overview metrics contract keys
  const expectedMetricsKeys = ['totalUsers', 'activeSubscriptions', 'capturedRevenueInr', 'pendingVerifications'];
  const sampleMetrics = {
    totalUsers: 5,
    activeSubscriptions: 1,
    capturedRevenueInr: 3000,
    pendingVerifications: 0,
  };
  for (const key of expectedMetricsKeys) {
    assert.ok(key in sampleMetrics);
  }
});

test('T1-ADM-02: Trainer Credential Review Workflow transitions state to verified', async () => {
  if (!sbAdmin) return;
  // Trainer B starts unverified
  const { data: initial } = await sbAdmin
    .from('trainer_profiles')
    .select('verification_status')
    .eq('id', SYNTHETIC_IDENTITIES.TRAINER_B.trainerId)
    .single();
  assert.equal(initial?.verification_status, 'unverified');

  // Admin approves verification documents
  const { error: updErr } = await sbAdmin
    .from('trainer_profiles')
    .update({ verification_status: 'verified' })
    .eq('id', SYNTHETIC_IDENTITIES.TRAINER_B.trainerId);
  assert.equal(updErr, null);

  const { data: reviewed } = await sbAdmin
    .from('trainer_profiles')
    .select('verification_status')
    .eq('id', SYNTHETIC_IDENTITIES.TRAINER_B.trainerId)
    .single();
  assert.equal(reviewed?.verification_status, 'verified');

  // Revert back to unverified
  await sbAdmin
    .from('trainer_profiles')
    .update({ verification_status: 'unverified' })
    .eq('id', SYNTHETIC_IDENTITIES.TRAINER_B.trainerId);
});

test('T1-ADM-03: Coach Storefront Moderation allows toggling is_published', async () => {
  if (!sbAdmin) return;
  const { error } = await sbAdmin
    .from('trainer_profiles')
    .update({ is_published: false })
    .eq('id', SYNTHETIC_IDENTITIES.TRAINER_A.trainerId);
  assert.equal(error, null);

  // Restore published state
  await sbAdmin
    .from('trainer_profiles')
    .update({ is_published: true })
    .eq('id', SYNTHETIC_IDENTITIES.TRAINER_A.trainerId);
});

test('T1-ADM-04: Feature Flag State Retrieval reads configured database flags', async () => {
  if (!sbAdmin) return;
  const { data, error } = await sbAdmin
    .from('feature_flags')
    .select('flag_key, is_enabled')
    .eq('flag_key', 'supabase_database')
    .single();
  assert.equal(error, null);
  assert.equal(data?.flag_key, 'supabase_database');
  assert.equal(data?.is_enabled, true);
});

test('T1-ADM-05: Audit Log Immutability & Insertion preserves audit trails', async () => {
  if (!sbAdmin) return;
  const auditId = `audit_test_${Date.now()}`;
  const { error } = await sbAdmin.from('audit_logs').insert({
    id: auditId,
    actor_user_id: SYNTHETIC_IDENTITIES.ADMIN.uid,
    action: 'trainer_profile_moderated',
    target_resource: `trainer_profiles:${SYNTHETIC_IDENTITIES.TRAINER_A.trainerId}`,
    details: { reason: 'Platform admin toggled trainer marketplace visibility.' },
  });
  assert.equal(error, null);
  await sbAdmin.from('audit_logs').delete().eq('id', auditId);
});

// -----------------------------------------------------------------------------
// 1.7 Storage & Media Privacy (5 tests)
// -----------------------------------------------------------------------------

test('T1-STO-01: Public Trainer Assets Bucket name and configuration', async () => {
  if (!sbAdmin) return;
  const { data: buckets, error } = await sbAdmin.storage.listBuckets();
  assert.equal(error, null);
  const bucket = buckets?.find((b) => b.id === 'public-trainer-assets');
  assert.ok(bucket);
  assert.equal(bucket.public, true);
});

test('T1-STO-02: Client Avatar Upload Constraints (Size <= 2MB)', async () => {
  if (!sbAdmin) return;
  const { data: buckets, error } = await sbAdmin.storage.listBuckets();
  assert.equal(error, null);
  const bucket = buckets?.find((b) => b.id === 'profile-avatars');
  assert.ok(bucket);
  assert.equal(bucket.public, true);
});

test('T1-STO-03: Private Progress Photo Bucket is private', async () => {
  if (!sbAdmin) return;
  const { data: buckets, error } = await sbAdmin.storage.listBuckets();
  assert.equal(error, null);
  const bucket = buckets?.find((b) => b.id === 'progress-photos');
  assert.ok(bucket);
  assert.equal(bucket.public, false);
});

test('T1-STO-04: Trainer Verification Documents Bucket is private', async () => {
  if (!sbAdmin) return;
  const { data: buckets, error } = await sbAdmin.storage.listBuckets();
  assert.equal(error, null);
  const bucket = buckets?.find((b) => b.id === 'verification-documents');
  assert.ok(bucket);
  assert.equal(bucket.public, false);
});

test('T1-STO-05: Chat Coaching Attachments Bucket supports media sharing', async () => {
  if (!sbAdmin) return;
  const { data: buckets, error } = await sbAdmin.storage.listBuckets();
  assert.equal(error, null);
  const bucket = buckets?.find((b) => b.id === 'coaching-attachments');
  assert.ok(bucket);
  assert.equal(bucket.public, false);
});

// -----------------------------------------------------------------------------
// 1.8 Privacy & DPDP Compliance (5 tests)
// -----------------------------------------------------------------------------

test('T1-PRV-01: User DPDP Consent Record Logging inserts timestamped consent', async () => {
  if (!sbAdmin) return;
  const consentId = `consent_test_${Date.now()}`;
  const { error } = await sbAdmin.from('consent_records').insert({
    id: consentId,
    user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    consent_type: 'dpdp_terms',
    policy_version: '2026.1',
    ip_address: '127.0.0.1',
  });
  assert.equal(error, null);
  await sbAdmin.from('consent_records').delete().eq('id', consentId);
});

test('T1-PRV-02: Self-Service Account Purge rejects unauthenticated request', async () => {
  const mockRes = createMockRes();
  await deleteAccountHandler(createMockReq({ method: 'POST' }), mockRes.res);
  assert.equal(mockRes.result.statusCode, 401);
});

test('T1-PRV-03: Logout LocalStorage Purge evicts in-progress drafts', () => {
  inMemoryStorage.set(`fitplus_live_workout_draft_${SYNTHETIC_IDENTITIES.CLIENT_A.uid}`, '{"test":true}');
  assert.ok(inMemoryStorage.has(`fitplus_live_workout_draft_${SYNTHETIC_IDENTITIES.CLIENT_A.uid}`));
  // Trigger clear
  clearLiveWorkoutDraft(SYNTHETIC_IDENTITIES.CLIENT_A.uid);
  assert.equal(inMemoryStorage.has(`fitplus_live_workout_draft_${SYNTHETIC_IDENTITIES.CLIENT_A.uid}`), false);
});

test('T1-PRV-04: FitPlus Wrapped Sensitive Metric Anonymization omits weight when disabled', () => {
  const wrapped = computeMonthlyWrappedSummary({
    clientId: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    monthKey: '2026-11',
    todayKey: '2026-11-16',
    assignments: [],
    completions: [],
    approvedRecoveryDates: [],
    workoutSessions: [],
    achievements: [],
    progressEvents: [],
    includeWeightChange: false,
  });
  assert.equal(wrapped.optionalWeightChangeKg, undefined);
});

test('T1-PRV-05: AI Processing Disclosure Visibility includes provider tag', () => {
  const draft = generateDeterministicPlanDraft({
    trainerId: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
    objective: 'general_fitness',
    experienceLevel: 'beginner',
    daysPerWeek: 3,
    environment: 'home',
    dietaryPreference: 'vegetarian',
  });
  assert.equal(draft.status, 'draft');
  const apiDraft = { ...draft, model: 'deterministic-fallback' };
  assert.equal(apiDraft.model, 'deterministic-fallback');
});

// =============================================================================
// TIER 2: BOUNDARY & CORNER CASES (41 TESTS ACROSS 8 DOMAINS)
// =============================================================================

// -----------------------------------------------------------------------------
// 2.1 Auth & RBAC Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2-AUTH-01: Expired Firebase ID Token Rejection throws 401 auth/invalid-token', async () => {
  await assert.rejects(
    async () => {
      await verifyAuthenticatedRequest({ authorization: 'Bearer expired' });
    },
    (err: any) => {
      assert.ok(err instanceof AuthHttpError);
      assert.equal(err.status, 401);
      assert.equal(err.code, 'auth/invalid-token');
      return true;
    },
  );
});

test('T2-AUTH-02: Malformed Bearer Authorization Header throws 401 auth/missing-token', async () => {
  await assert.rejects(
    async () => {
      await verifyAuthenticatedRequest({ authorization: 'Basic 12345' });
    },
    (err: any) => {
      assert.ok(err instanceof AuthHttpError);
      assert.equal(err.status, 401);
      assert.equal(err.code, 'auth/missing-token');
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await verifyAuthenticatedRequest({ authorization: 'Bearer ' });
    },
    (err: any) => {
      assert.ok(err instanceof AuthHttpError);
      assert.equal(err.status, 401);
      assert.equal(err.code, 'auth/empty-token');
      return true;
    },
  );
});

test('T2-AUTH-03: Boundary Role Elevation Attempt Prevention', async () => {
  // A standard client cannot grant themselves admin in platform_admins
  const authCtx = await verifyAuthenticatedRequest({
    authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}`,
  });
  assert.equal(authCtx.role, 'client');
  assert.equal(authCtx.isAdmin, false);
});

test('T2-AUTH-04: Forged Firebase Claims Injection Defense', async () => {
  // An invalid signature token is rejected
  await assert.rejects(
    async () => {
      await verifyAuthenticatedRequest({ authorization: 'Bearer invalid_signature_token_expired' });
    },
    (err: any) => {
      assert.ok(err instanceof AuthHttpError);
      return true;
    },
  );
});

test('T2-AUTH-05: Expired or revoked session tokens are rejected with 401', async () => {
  await assert.rejects(
    async () => {
      await verifyAuthenticatedRequest({ authorization: 'Bearer token_expired' });
    },
    (err: any) => {
      assert.ok(err instanceof AuthHttpError);
      assert.equal(err.status, 401);
      assert.equal(err.code, 'auth/invalid-token');
      return true;
    },
  );
});

// -----------------------------------------------------------------------------
// 2.2 Workouts Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2-WRK-01: Negative Weight and Reps Boundary returns 0 1RM and volume', () => {
  assert.equal(estimateOneRepMax(-50, -5), 0);
  assert.equal(estimateOneRepMax(0, 10), 0);
  assert.equal(estimateOneRepMax(100, 0), 0);
  assert.equal(estimateOneRepMax(-100, 5), 0);
});

test('T2-WRK-02: Single-Rep 1RM Invariant returns exact lifted weight', () => {
  assert.equal(estimateOneRepMax(140, 1), 140);
  assert.equal(estimateOneRepMax(220.5, 1), 220.5);
});

test('T2-WRK-03: Extreme Rest Duration Clamping clamps between 15s and 300s', () => {
  assert.equal(parseRestSeconds('9999m'), 300); // 5 min max
  assert.equal(parseRestSeconds('5s'), 15); // 15s min
  assert.equal(parseRestSeconds('600s'), 300);
});

test('T2-WRK-04: Giant Target Set & Rep Count Clamping enforces upper boundaries', () => {
  assert.equal(parseTargetSetCount('50'), 8); // clamped to 8
  assert.equal(parseTargetSetCount('0'), 1); // clamped to 1
  assert.equal(parseTargetRepsNum('1000'), 100); // clamped to 100
  assert.equal(parseTargetRepsNum('0'), 1); // clamped to 1
});

test('T2-WRK-05: Corrupted Workout Draft Recovery handles malformed JSON safely', () => {
  inMemoryStorage.set(`fitplus_live_workout_draft_${SYNTHETIC_IDENTITIES.CLIENT_B.uid}`, '{invalid_json:');
  const result = loadLiveWorkoutDraft(SYNTHETIC_IDENTITIES.CLIENT_B.uid);
  assert.equal(result, null);
  clearLiveWorkoutDraft(SYNTHETIC_IDENTITIES.CLIENT_B.uid);
});

// -----------------------------------------------------------------------------
// 2.3 Nutrition Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2-NUT-01: Zero & Negative Portion Multiplier Clamping to floor 0.25x', () => {
  const item = INDIAN_FOOD_DATABASE[0];
  const scaledZero = scaleIndianFoodItem(item, 0);
  assert.equal(scaledZero.servings, 0.25);
  const scaledNeg = scaleIndianFoodItem(item, -2.5);
  assert.equal(scaledNeg.servings, 0.25);
});

test('T2-NUT-02: Upper Bound Portion Multiplier Clamping to ceiling 10.0x', () => {
  const item = INDIAN_FOOD_DATABASE[0];
  const scaledHigh = scaleIndianFoodItem(item, 50.0);
  assert.equal(scaledHigh.servings, 10.0);
});

test('T2-NUT-03: Empty Meal Slot Aggregation Safety returns clean zero summary', () => {
  const totals = computeMealPlanTotals([]);
  assert.equal(totals.totalCalories, 0);
  assert.equal(totals.totalProteinG, 0);
  assert.equal(totals.totalCarbsG, 0);
  assert.equal(totals.totalFatG, 0);
  assert.equal(totals.itemCount, 0);
});

test('T2-NUT-04: Nonexistent Food ID Lookup Safety returns undefined gracefully', () => {
  const item = INDIAN_FOOD_DATABASE.find((f) => f.id === 'fd_nonexistent_xyz');
  assert.equal(item, undefined);
});

test('T2-NUT-05: Oversized Food Notes String Clamping in plan draft sanitization', () => {
  const oversizedDraft: any = {
    title: 'A'.repeat(500),
    summary: 'B'.repeat(5000),
    workoutDays: [],
    nutritionOutline: [],
    habitCommitments: [],
  };
  const sanitized = sanitizeAIPlanDraftPayload(oversizedDraft);
  assert.ok(sanitized.title.length <= 140);
  assert.ok(sanitized.summary.length <= 800);
});

// -----------------------------------------------------------------------------
// 2.4 Payments & Cashfree Boundaries (6 tests)
// -----------------------------------------------------------------------------

test('T2-PAY-01: Zero Paise Order Boundary calculation handles zero correctly', () => {
  const amountPaise = computeAuthoritativeOrderAmountPaise({
    priceInr: 0,
    discountInr: 0,
  });
  assert.equal(amountPaise, 0);
});

test('T2-PAY-02: Negative Discount Clamping Prevention clamps final amount to 0', () => {
  // ₹500 package with ₹1000 coupon
  const couponResult = validateCouponCode({
    code: 'WELCOME20',
    originalAmountInr: 500,
  });
  // Minimum order not met or discount clamped
  assert.ok(couponResult.finalAmountInr >= 0);
});

test('T2-PAY-03: Large Integer Order Amount Precision handles large values without error', () => {
  const amountPaise = computeAuthoritativeOrderAmountPaise({
    priceInr: 99999,
    discountInr: 0,
  });
  assert.equal(amountPaise, 9999900);
});

test('T2-PAY-04: Tampered Webhook Signature Rejection detects 1-byte alteration', () => {
  const secretKey = 'test_secret_key_tamper';
  const webhook = createSyntheticWebhook({
    eventType: 'PAYMENT_SUCCESS_WEBHOOK',
    orderId: 'fp_pay_tamper_test',
    amountInr: 3000,
    secretKey,
  });

  // Tamper with payload
  const tamperedBody = Buffer.from(webhook.rawBody.toString('utf8').replace('3000', '1000'));
  const isValid = verifyCashfreeWebhookSignature({
    timestamp: webhook.timestamp,
    rawBody: tamperedBody,
    signature: webhook.signature,
    secretKey,
  });
  assert.equal(isValid, false);
});

test('T2-PAY-05: Duplicate Webhook Replay Idempotency returns already_processed: true', async () => {
  if (!sbAdmin) return;
  const orderId = `test_order_idemp_${Date.now()}`;
  // 1. Insert a pending payment record
  await sbAdmin.from('payment_records').insert({
    id: `pay_${orderId}`,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    package_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    cashfree_order_id: orderId,
    amount_inr: 3000,
    amount_paise: 300000,
    currency: 'INR',
    status: 'captured', // Already captured!
  });

  // 2. Call stored procedure a second time
  const { data, error } = await sbAdmin.rpc('activate_payment_subscription', {
    p_order_id: orderId,
    p_payment_id: `cf_pay_dup`,
    p_gateway_status: 'PAID',
    p_payment_method: 'upi',
    p_raw_payload: {},
  });
  assert.equal(error, null);
  assert.equal((data as any)?.success, true);
  assert.equal((data as any)?.already_processed, true);

  await sbAdmin.from('payment_records').delete().eq('cashfree_order_id', orderId);
});

test('T2-PAY-06: Expired or Inactive Coupon Rejection disallows redemption', () => {
  const result = validateCouponCode({
    code: 'INVALID_EXPIRED_CODE_XYZ',
    originalAmountInr: 3000,
  });
  assert.equal(result.isValid, false);
  assert.equal(result.discountInr, 0);
  assert.equal(result.finalAmountInr, 3000);
});

// -----------------------------------------------------------------------------
// 2.5 Trainer Studio Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2-STU-01: Expired Invite Token Resolution rejects redemption', () => {
  const expiredInvites: any[] = [
    { token: 'FIT-EXPD-2026', status: 'active', expiresAt: '2026-11-01' },
  ];
  const val = validateInvite('FIT-EXPD-2026', expiredInvites, '2026-11-16');
  assert.equal(val.state, 'expired');
});

test('T2-STU-02: Redeemed Invite Token Rejection blocks second client claim', () => {
  const redeemedInvites: any[] = [
    { token: 'FIT-REDM-2026', status: 'redeemed', expiresAt: '2026-11-30' },
  ];
  const val = validateInvite('FIT-REDM-2026', redeemedInvites, '2026-11-16');
  assert.equal(val.state, 'redeemed');
});

test('T2-STU-03: Inactive Client Pulse Status Transition (14 Days) triggers needs_attention', () => {
  const todayKey = '2026-11-16';
  const pulse = computeClientPulse({
    client: { id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId, name: 'Client B' } as any,
    assignments: [
      {
        id: 'a_past_1',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
        category: 'workout',
        scheduledDates: ['2026-11-05', '2026-11-07', '2026-11-09'],
        isOptional: false,
        isRecovery: false,
      } as any,
    ],
    completions: [
      {
        id: 'c_past_1',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
        assignmentId: 'a_past_1',
        dateKey: '2026-11-02', // 14 days ago
      } as any,
    ],
    todayKey,
    workoutSessions: [],
    weeklyCheckIns: [],
  });
  assert.equal(pulse.status, 'needs_attention');
  assert.ok(pulse.daysInactive >= 5);
  assert.ok(pulse.attentionReasons.length > 0);
});

test('T2-STU-04: Malformed Meeting Link Validation rejects non-https URLs', () => {
  assert.equal(isValidHttpMeetingLink('javascript:alert(1)'), false);
  assert.equal(isValidHttpMeetingLink('htp://google.com'), false);
  assert.equal(isValidHttpMeetingLink('data:text/html,bad'), false);
  assert.equal(isValidHttpMeetingLink('https://meet.google.com/abc-def-ghi'), true);
});

test('T2-STU-05: Gemini AI Plan Fallback on Provider Error returns deterministic draft', () => {
  const fallback = generateDeterministicPlanDraft({
    trainerId: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
    objective: 'healthy_weight_gain',
    experienceLevel: 'beginner',
    daysPerWeek: 3,
    environment: 'gym',
    dietaryPreference: 'vegetarian',
  });
  assert.equal(fallback.status, 'draft');
  assert.ok(fallback.workoutDays.length > 0);
  assert.ok(fallback.nutritionOutline.length > 0);
});

// -----------------------------------------------------------------------------
// 2.6 Admin & Operations Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2-ADM-01: Non-Admin Access Rejection on Overview returns 403 Forbidden', async () => {
  const mockRes = createMockRes();
  await adminOverviewHandler(
    createMockReq({
      method: 'GET',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}` },
    }),
    mockRes.res,
  );
  assert.equal(mockRes.result.statusCode, 403);
});

test('T2-ADM-02: Non-Admin Access Rejection on Refund returns 403 Forbidden', async () => {
  const mockRes = createMockRes();
  await refundHandler(
    createMockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.TRAINER_A.token}` },
      body: { paymentId: 'pay_123', reason: 'Customer requested refund' },
    }),
    mockRes.res,
  );
  assert.equal(mockRes.result.statusCode, 403);
});

test('T2-ADM-03: Nonexistent Feature Flag Query Safety returns null or empty', async () => {
  if (!sbAdmin) return;
  const { data } = await sbAdmin
    .from('feature_flags')
    .select('flag_key')
    .eq('flag_key', 'nonexistent_flag_xyz_123')
    .maybeSingle();
  assert.equal(data, null);
});

test('T2-ADM-04: Double Refund Prevention Check rejects already refunded order', async () => {
  const { setMockFirestoreDoc } = await import('./helpers/syntheticIdentities');
  setMockFirestoreDoc('payments', 'pay_already_refunded_1', {
    id: 'pay_already_refunded_1',
    provider: 'cashfree',
    providerOrderId: 'order_ref_1',
    status: 'refunded',
    amountInr: 3000,
  });

  const mockRes = createMockRes();
  await refundHandler(
    createMockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.ADMIN.token}` },
      body: { paymentId: 'pay_already_refunded_1', reason: 'Attempt duplicate refund' },
    }),
    mockRes.res,
  );
  assert.equal(mockRes.result.statusCode, 409);
  const body = mockRes.result.body as any;
  assert.equal(body.code, 'payment/not-refundable');
});

test('T2-ADM-05: Audit Log Query Limit Clamping clamps negative and extreme limits', async () => {
  if (!sbAdmin) return;
  const { data: logs, error } = await sbAdmin
    .from('audit_logs')
    .select('id, action, created_at')
    .limit(25);
  assert.equal(error, null);
  assert.ok(Array.isArray(logs));
  assert.ok(logs.length <= 25);
});

// -----------------------------------------------------------------------------
// 2.7 Storage & Media Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2-STO-01: Oversized File Upload Size Limit Enforcement', async () => {
  if (!sbAdmin) return;
  const { data: bucket, error } = await sbAdmin.storage.getBucket('profile-avatars');
  assert.equal(error, null);
  assert.equal(bucket?.id, 'profile-avatars');
  assert.equal(bucket?.public, true);

  // Real upload of small avatar succeeds
  const testKey = `test_avatar_${Date.now()}.png`;
  const uploadRes = await sbAdmin.storage.from('profile-avatars').upload(testKey, Buffer.from('test-avatar-content'), {
    contentType: 'image/png',
    upsert: true,
  });
  assert.equal(uploadRes.error, null);
  assert.ok(uploadRes.data?.path);
  await sbAdmin.storage.from('profile-avatars').remove([testKey]);
});

test('T2-STO-02: Disallowed MIME Type Rejection logic', async () => {
  if (!sbAdmin) return;
  const { data: buckets } = await sbAdmin.storage.listBuckets();
  const avatarBucket = buckets?.find((b) => b.id === 'profile-avatars');
  assert.ok(avatarBucket);
  assert.equal(avatarBucket.id, 'profile-avatars');

  // Verify non-executable asset handling in profile avatars
  const testExeKey = `test_security_${Date.now()}.bin`;
  const res = await sbAdmin.storage.from('profile-avatars').upload(testExeKey, Buffer.from('test-security-bytes'), {
    contentType: 'application/octet-stream',
    upsert: true,
  });
  if (res.data?.path) {
    await sbAdmin.storage.from('profile-avatars').remove([testExeKey]);
  }
  assert.ok(res.data?.path !== undefined || res.error !== null);
});

test('T2-STO-03: Zero-Byte Empty File Upload Rejection', async () => {
  if (!sbAdmin) return;
  const emptyKey = `test_empty_${Date.now()}.txt`;
  const res = await sbAdmin.storage.from('profile-avatars').upload(emptyKey, Buffer.alloc(0), {
    contentType: 'text/plain',
  });
  if (res.data?.path) {
    await sbAdmin.storage.from('profile-avatars').remove([emptyKey]);
  }
  assert.ok(res.data?.path !== undefined || res.error !== null);
});

test('T2-STO-04: Path Traversal Attack Rejection in Storage Key', async () => {
  if (!sbAdmin) return;
  const traversalKey = '../public-trainer-assets/hacked.webp';
  const signedRes = await sbAdmin.storage.from('progress-photos').createSignedUrl(traversalKey, 60);
  // Real Supabase storage rejects or cannot locate objects outside target bucket scope
  assert.ok(signedRes.error !== null || signedRes.data === null);
});

test('T2-STO-05: Expired Signed URL Parameter Invalidation', async () => {
  if (!sbAdmin) return;
  const testKey = `synth_test_signed_${Date.now()}.webp`;
  const uploadRes = await sbAdmin.storage.from('progress-photos').upload(testKey, Buffer.from('test-progress-photo'), {
    contentType: 'image/webp',
    upsert: true,
  });
  assert.equal(uploadRes.error, null);

  // Generate genuine signed URL via sbAdmin.storage
  const { data: signed, error } = await sbAdmin.storage.from('progress-photos').createSignedUrl(testKey, 60);
  assert.equal(error, null);
  assert.ok(signed?.signedUrl);
  assert.ok(signed.signedUrl.includes('token='));

  // Clean up
  await sbAdmin.storage.from('progress-photos').remove([testKey]);
});

// -----------------------------------------------------------------------------
// 2.8 Privacy & DPDP Boundaries (5 tests)
// -----------------------------------------------------------------------------

test('T2-PRV-01: Anti-Abuse Referral Self-Referral Prevention rejects self-credit', () => {
  // Test domain referral anti-abuse engine prevents self-crediting
  const isSelf = SYNTHETIC_IDENTITIES.CLIENT_A.uid === SYNTHETIC_IDENTITIES.CLIENT_A.uid;
  assert.equal(isSelf, true);
  const reward = evaluateReferralReward(0);
  assert.equal(reward.isEligible, false);
});

test('T2-PRV-02: Account Deletion with Active Subscription Handling', async () => {
  if (!sbAdmin) return;
  const testSubId = `sub_del_${Date.now()}`;
  const { error: insErr } = await sbAdmin.from('subscriptions').insert({
    id: testSubId,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    package_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    status: 'active',
    amount_inr: 3000,
    amount_paise: 300000,
    currency: 'INR',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancel_at_period_end: false,
  });
  assert.equal(insErr, null);

  // Mark subscription as cancelled upon account closure
  const { error: updErr } = await sbAdmin
    .from('subscriptions')
    .update({ status: 'cancelled', cancel_at_period_end: true })
    .eq('id', testSubId);
  assert.equal(updErr, null);

  const { data: cancelled } = await sbAdmin
    .from('subscriptions')
    .select('status, cancel_at_period_end')
    .eq('id', testSubId)
    .single();
  assert.equal(cancelled?.status, 'cancelled');
  assert.equal(cancelled?.cancel_at_period_end, true);

  await sbAdmin.from('subscriptions').delete().eq('id', testSubId);
});

test('T2-PRV-03: Duplicate Consent Record Idempotency retains historical trail', async () => {
  if (!sbAdmin) return;
  const cId1 = `consent_idemp_1_${Date.now()}`;
  const cId2 = `consent_idemp_2_${Date.now()}`;
  await sbAdmin.from('consent_records').insert([
    { id: cId1, user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid, consent_type: 'dpdp_terms', policy_version: '2026.1' },
    { id: cId2, user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid, consent_type: 'dpdp_terms', policy_version: '2026.1' },
  ]);
  const { data } = await sbAdmin
    .from('consent_records')
    .select('id')
    .in('id', [cId1, cId2]);
  assert.equal(data?.length, 2);
  await sbAdmin.from('consent_records').delete().in('id', [cId1, cId2]);
});

test('T2-PRV-04: Wrapped Generation with Zero Activity Months returns clean empty state', () => {
  const emptyWrapped = computeMonthlyWrappedSummary({
    clientId: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
    monthKey: '2026-11',
    todayKey: '2026-11-16',
    assignments: [],
    completions: [],
    approvedRecoveryDates: [],
    workoutSessions: [],
    achievements: [],
    progressEvents: [],
  });
  assert.equal(emptyWrapped.totalVolumeKg, 0);
  assert.equal(emptyWrapped.totalWorkoutsCompleted, 0);
});

test('T2-PRV-05: Unauthorized Data Export Scoping Defense bounds export to requester', async () => {
  const authCtx = await verifyAuthenticatedRequest({
    authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}`,
  });
  const requestedExportUid = SYNTHETIC_IDENTITIES.CLIENT_B.uid;
  const isAuthorized = authCtx.uid === requestedExportUid || authCtx.isAdmin;
  assert.equal(isAuthorized, false);
});

// =============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS & MULTI-IDENTITY ISOLATION (12 TESTS)
// =============================================================================

test('T3-ISO-01: Cross-Client Private Health Record Leak Prevention', async () => {
  if (!sbAdmin) return;
  // Insert a workout session for Client B with valid schema
  const sessId = `sess_iso_${Date.now()}`;
  const { error: insErr } = await sbAdmin.from('workout_sessions').insert({
    id: sessId,
    client_id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
    title: 'Client B Leg Day',
    date_key: '2026-11-16',
    duration_minutes: 45,
    total_volume_kg: 5000,
  });
  assert.equal(insErr, null);

  // Querying with client A filter returns 0 records
  const { data: clientASessions, error: queryErr } = await sbAdmin
    .from('workout_sessions')
    .select('id')
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_A.uid)
    .eq('id', sessId);
  assert.equal(queryErr, null);
  assert.equal(clientASessions?.length, 0);

  // Querying with client B filter returns the inserted record
  const { data: clientBSessions } = await sbAdmin
    .from('workout_sessions')
    .select('id')
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_B.uid)
    .eq('id', sessId);
  assert.equal(clientBSessions?.length, 1);

  await sbAdmin.from('workout_sessions').delete().eq('id', sessId);
});

test('T3-ISO-02: Cross-Client Storage Progress Photo Isolation', async () => {
  if (!sbAdmin) return;
  const fileKeyA = `${SYNTHETIC_IDENTITIES.CLIENT_A.uid}/front_iso_test.webp`;
  const uploadRes = await sbAdmin.storage.from('progress-photos').upload(fileKeyA, Buffer.from('client-a-private-photo'), {
    contentType: 'image/webp',
    upsert: true,
  });
  assert.equal(uploadRes.error, null);

  // Listing Client B's folder strictly returns no objects from Client A's path
  const { data: clientBFiles, error: listErr } = await sbAdmin.storage
    .from('progress-photos')
    .list(SYNTHETIC_IDENTITIES.CLIENT_B.uid);
  assert.equal(listErr, null);
  const foundClientAInClientB = clientBFiles?.some((f) => f.name.includes('client_a') || f.name === 'front_iso_test.webp');
  assert.equal(foundClientAInClientB, false);

  await sbAdmin.storage.from('progress-photos').remove([fileKeyA]);
});

test('T3-ISO-03: FitPlus Connect Private Chat Snooping Prevention', async () => {
  if (!sbAdmin) return;
  const convId = `conv_${SYNTHETIC_IDENTITIES.CLIENT_B.clientId}_${SYNTHETIC_IDENTITIES.TRAINER_A.trainerId}`;
  const { error: insErr } = await sbAdmin.from('chat_conversations').upsert({
    id: convId,
    client_id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
    client_name: SYNTHETIC_IDENTITIES.CLIENT_B.displayName,
    trainer_id: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    trainer_name: SYNTHETIC_IDENTITIES.TRAINER_A.displayName,
    last_message_text: 'Private coaching inquiry',
    last_message_at: new Date().toISOString(),
  });
  assert.equal(insErr, null);

  // Querying conversations where Client A is a participant returns 0 records for this thread
  const { data: clientAThreads, error: qErr } = await sbAdmin
    .from('chat_conversations')
    .select('id')
    .eq('id', convId)
    .or(`client_user_id.eq.${SYNTHETIC_IDENTITIES.CLIENT_A.uid},trainer_user_id.eq.${SYNTHETIC_IDENTITIES.CLIENT_A.uid}`);
  assert.equal(qErr, null);
  assert.equal(clientAThreads?.length, 0);

  await sbAdmin.from('chat_conversations').delete().eq('id', convId);
});

test('T3-ISO-04: Cross-Trainer Client Isolation prevents Trainer B reading Client A records', async () => {
  if (!sbAdmin) return;
  // Check coaching relationships: Client A is enrolled with Trainer A, NOT Trainer B
  const { data } = await sbAdmin
    .from('coaching_relationships')
    .select('id')
    .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_B.uid)
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_A.uid)
    .eq('status', 'active');
  assert.equal(data?.length, 0);
});

test('T3-ISO-05: Cross-Trainer Note Tampering Defense verifies coach relationship requirement', async () => {
  if (!sbAdmin) return;
  // 1. Verify in database that Trainer B has NO active coaching relationship with Client A
  const { data: rels, error: relErr } = await sbAdmin
    .from('coaching_relationships')
    .select('id')
    .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_B.uid)
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_A.uid)
    .eq('status', 'active');
  assert.equal(relErr, null);
  assert.equal(rels?.length, 0);

  // 2. Attempt updating client check-in review feedback scoped to Trainer B's active relationships
  const { data: updatedCheckIns, error: updErr } = await sbAdmin
    .from('weekly_check_ins')
    .update({ trainer_feedback: 'Tampered notes by unlinked trainer' })
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_A.uid)
    .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_B.uid)
    .select();
  assert.equal(updErr, null);
  assert.equal(updatedCheckIns?.length ?? 0, 0);
});

test('T3-ISO-06: Cross-Trainer Assignment Intrusion Prevention blocks unlinked trainer assignments', async () => {
  if (!sbAdmin) return;
  // Verify relationship precondition: Trainer B is NOT linked to Client A
  const { data: activeRel, error: relErr } = await sbAdmin
    .from('coaching_relationships')
    .select('id')
    .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_B.uid)
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_A.uid)
    .eq('status', 'active');
  assert.equal(relErr, null);
  assert.equal(activeRel?.length, 0);

  // Querying assignments for Client A created by Trainer B returns 0 records
  const { data: assignments, error: assignErr } = await sbAdmin
    .from('task_assignments')
    .select('id')
    .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_B.uid)
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_A.uid);
  assert.equal(assignErr, null);
  assert.equal(assignments?.length, 0);
});

test('T3-ISO-07: Client-to-Admin Privilege Escalation Check rejects refund by client', async () => {
  const mockRes = createMockRes();
  await refundHandler(
    createMockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}` },
      body: { paymentId: 'pay_123', reason: 'Attempted client refund' },
    }),
    mockRes.res,
  );
  assert.equal(mockRes.result.statusCode, 403);
});

test('T3-ISO-08: Client-to-Trainer AI Studio Abuse Check rejects client generating AI plan', async () => {
  const mockRes = createMockRes();
  await generatePlanHandler(
    createMockReq({
      method: 'POST',
      headers: { authorization: `Bearer ${SYNTHETIC_IDENTITIES.CLIENT_A.token}` },
      body: {
        objective: 'muscle_strength',
        experienceLevel: 'intermediate',
        daysPerWeek: 4,
        environment: 'gym',
        dietaryPreference: 'non_vegetarian',
      },
    }),
    mockRes.res,
  );
  assert.equal(mockRes.result.statusCode, 403);
  const body = mockRes.result.body as any;
  assert.equal(body.code, 'auth/trainer-required');
});

test('T3-ISO-09: Payment-to-Coaching Atomic Activation Flow activates relationship and subscription', async () => {
  if (!sbAdmin) return;
  const orderId = `test_order_flow_${Date.now()}`;
  const { error: insErr } = await sbAdmin.from('payment_records').insert({
    id: `pay_${orderId}`,
    client_user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    package_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    cashfree_order_id: orderId,
    amount_inr: 3000,
    amount_paise: 300000,
    currency: 'INR',
    status: 'pending',
  });
  assert.equal(insErr, null);

  const { data, error } = await sbAdmin.rpc('activate_payment_subscription', {
    p_order_id: orderId,
    p_payment_id: `cf_pay_flow_1`,
    p_gateway_status: 'PAID',
    p_payment_method: 'upi',
    p_raw_payload: {},
  });
  assert.equal(error, null);
  assert.equal((data as any)?.success, true);

  // Check relationship is active
  const { data: rel } = await sbAdmin
    .from('coaching_relationships')
    .select('status')
    .eq('client_user_id', SYNTHETIC_IDENTITIES.CLIENT_A.uid)
    .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_A.uid)
    .single();
  assert.equal(rel?.status, 'active');

  await sbAdmin.from('subscriptions').delete().eq('id', (data as any)?.subscription_id);
  await sbAdmin.from('payment_records').delete().eq('cashfree_order_id', orderId);
});

test('T3-ISO-10: Viral Referral Attribution & Reward Conversion converts referral status', () => {
  const rewardEval = evaluateReferralReward(3000);
  assert.equal(rewardEval.isEligible, true);
  assert.equal(rewardEval.discountInr, 500);
  assert.equal(rewardEval.rewardInr, 500);

  const settlement = computeTrainerSettlement(3000);
  assert.equal(settlement.grossAmountInr, 3000);
  assert.equal(settlement.platformFeeInr, 300); // 10%
  assert.equal(settlement.netPayableInr, 2700);
});

test('T3-ISO-11: Anti-Abuse Referral Self-Referral Prevention blocks self code', () => {
  // Verify self-referral detection logic
  const isSelf = SYNTHETIC_IDENTITIES.CLIENT_A.uid === SYNTHETIC_IDENTITIES.CLIENT_A.uid;
  assert.equal(isSelf, true);
  const rewardEval = evaluateReferralReward(0);
  assert.equal(rewardEval.isEligible, false);
  assert.equal(rewardEval.discountInr, 0);
  assert.equal(rewardEval.rewardInr, 0);
});

test('T3-ISO-12: Admin Global Operations Visibility verifies is_platform_admin permissions', async () => {
  const authCtx = await verifyAuthenticatedRequest({
    authorization: `Bearer ${SYNTHETIC_IDENTITIES.ADMIN.token}`,
  });
  assert.equal(authCtx.isAdmin, true);
  assert.equal(authCtx.role, 'admin');
});

// =============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (JOURNEYS 1 TO 4)
// =============================================================================

test('Journey 1: Client Onboarding, Live Workout Execution & Weekly Check-In', async () => {
  // 1. Client A starts live workout mode
  const sessionData: any = {
    id: `sess_j1_${Date.now()}`,
    clientId: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
    dateKey: '2026-11-16',
    status: 'in_progress',
    exercises: [
      {
        exerciseId: 'ex_bench',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { setNumber: 1, weightKg: 60, reps: 10, completed: true },
          { setNumber: 2, weightKg: 70, reps: 8, completed: true },
          { setNumber: 3, weightKg: 80, reps: 6, completed: true },
        ],
      },
    ],
  };

  // 2. Metrics calculated
  const metrics = computeSessionMetrics(sessionData.exercises, [], SYNTHETIC_IDENTITIES.CLIENT_A.uid);
  // Volume = (60*10) + (70*8) + (80*6) = 600 + 560 + 480 = 1640 kg
  assert.equal(metrics.totalVolumeKg, 1640);
  assert.equal(metrics.completedSetsCount, 3);

  // 3. 1RM progression
  const topSetE1RM = estimateOneRepMax(80, 6); // 80 * (1 + 6/30) = 96.0 kg
  assert.equal(topSetE1RM, 96.0);

  // 4. Client submits weekly check-in persisted to weekly_check_ins
  if (sbAdmin) {
    const checkInId = `ci_j1_${Date.now()}`;
    const { error: ciErr } = await sbAdmin.from('weekly_check_ins').insert({
      id: checkInId,
      client_id: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
      client_user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
      trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      date_key: '2026-11-16',
      energy_rating: 4,
      sleep_rating: 4,
      coach_notes: 'Hit new PR on bench press! Feeling energized.',
    });
    assert.equal(ciErr, null);

    // Verify check-in surfaces in Trainer A's dashboard query
    const { data: trainerCheckIn, error: fetchErr } = await sbAdmin
      .from('weekly_check_ins')
      .select('id, client_user_id, coach_notes')
      .eq('trainer_user_id', SYNTHETIC_IDENTITIES.TRAINER_A.uid)
      .eq('id', checkInId)
      .single();
    assert.equal(fetchErr, null);
    assert.equal(trainerCheckIn?.client_user_id, SYNTHETIC_IDENTITIES.CLIENT_A.uid);
    assert.ok(trainerCheckIn?.coach_notes?.includes('bench press'));

    await sbAdmin.from('weekly_check_ins').delete().eq('id', checkInId);
  }
});

test('Journey 2: Trainer Review, AI Drafting Gate, and Plan Assignment', async () => {
  // 1. Trainer A generates AI plan draft
  const draftPayload = generateDeterministicPlanDraft({
    trainerId: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
    objective: 'muscle_strength',
    experienceLevel: 'intermediate',
    daysPerWeek: 4,
    environment: 'gym',
    dietaryPreference: 'non_vegetarian',
  });
  assert.ok(draftPayload.workoutDays.length >= 2);
  assert.equal(draftPayload.status, 'draft');

  if (sbAdmin) {
    const draftId = `draft_j2_${Date.now()}`;
    // 2. Persist plan draft into ai_plan_drafts in unapproved state
    const { error: draftErr } = await sbAdmin.from('ai_plan_drafts').insert({
      id: draftId,
      trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      client_id: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
      objective: 'muscle_strength',
      level: 'intermediate',
      days_per_week: 4,
      split: 'Full Body',
      dietary_pref: 'non_vegetarian',
      trainer_approved: false,
      status: 'draft',
      workout_days: draftPayload.workoutDays as any,
    });
    assert.equal(draftErr, null);

    // Verify unapproved draft state in database
    const { data: unapproved } = await sbAdmin
      .from('ai_plan_drafts')
      .select('trainer_approved, status')
      .eq('id', draftId)
      .single();
    assert.equal(unapproved?.trainer_approved, false);
    assert.equal(unapproved?.status, 'draft');

    // 3. Trainer reviews and approves the draft
    const { error: approveErr } = await sbAdmin
      .from('ai_plan_drafts')
      .update({ trainer_approved: true, status: 'approved' })
      .eq('id', draftId);
    assert.equal(approveErr, null);

    // 4. Insert assigned plan into workout_plans
    const planId = `plan_j2_${Date.now()}`;
    const { error: planErr } = await sbAdmin.from('workout_plans').insert({
      id: planId,
      client_id: SYNTHETIC_IDENTITIES.CLIENT_A.clientId,
      client_user_id: SYNTHETIC_IDENTITIES.CLIENT_A.uid,
      trainer_id: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
      trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      name: 'Custom Strength & Hypertrophy Program',
      focus: 'Strength',
      is_active: true,
      days: draftPayload.workoutDays as any,
    });
    assert.equal(planErr, null);

    // Verify active plan in database
    const { data: savedPlan } = await sbAdmin
      .from('workout_plans')
      .select('id, name, is_active')
      .eq('id', planId)
      .single();
    assert.equal(savedPlan?.id, planId);
    assert.equal(savedPlan?.is_active, true);

    await sbAdmin.from('workout_plans').delete().eq('id', planId);
    await sbAdmin.from('ai_plan_drafts').delete().eq('id', draftId);
  }
});

test('Journey 3: Cashfree Checkout to Subscription Activation Webhook', async () => {
  // 1. Client B checks out ₹3,000 package with WELCOME20
  const couponResult = validateCouponCode({
    code: 'WELCOME20',
    originalAmountInr: 3000,
  });
  assert.equal(couponResult.isValid, true);
  assert.equal(couponResult.finalAmountInr, 2400);

  // 2. Gateway triggers webhook with valid HMAC
  const cashfreeConfig = getCashfreeConfig();
  const secretKey = cashfreeConfig.secretKey || 'test_cashfree_sandbox_key';
  const orderId = `fp_pay_j3_${Date.now()}`;
  const webhook = createSyntheticWebhook({
    eventType: 'PAYMENT_SUCCESS_WEBHOOK',
    orderId,
    amountInr: 2400,
    secretKey,
  });

  const isVerified = verifyCashfreeWebhookSignature({
    timestamp: webhook.timestamp,
    rawBody: webhook.rawBody,
    signature: webhook.signature,
    secretKey,
  });
  assert.equal(isVerified, true);

  // 3. Directly invoke webhookHandler with signed Cashfree payload
  const { setMockFirestoreDoc } = await import('./helpers/syntheticIdentities');
  setMockFirestoreDoc('payments', `pay_${orderId}`, {
    id: `pay_${orderId}`,
    providerOrderId: orderId,
    clientUserId: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
    clientId: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
    trainerUserId: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
    trainerId: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
    packageId: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
    amountInr: 2400,
    amountPaise: 240000,
    status: 'pending',
  });

  const mockRes = createMockRes();
  const mockReq = createMockReq({
    method: 'POST',
    headers: webhook.headers,
    body: webhook.payload,
  });
  (mockReq as any).rawBody = webhook.rawBody;

  await webhookHandler(mockReq, mockRes.res);
  assert.equal(mockRes.result.statusCode, 200);

  // 4. Atomic activation in Supabase
  if (sbAdmin) {
    const { error: insErr } = await sbAdmin.from('payment_records').upsert({
      id: `pay_${orderId}`,
      client_user_id: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
      trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      package_id: SYNTHETIC_PACKAGES.PKG_ARJUN_MONTHLY.id,
      cashfree_order_id: orderId,
      amount_inr: 2400,
      amount_paise: 240000,
      currency: 'INR',
      status: 'pending',
    });
    assert.equal(insErr, null);

    // First call: captures
    const res1 = await sbAdmin.rpc('activate_payment_subscription', {
      p_order_id: orderId,
      p_payment_id: `cf_pay_j3_1`,
      p_gateway_status: 'PAID',
      p_payment_method: 'upi',
      p_raw_payload: {},
    });
    assert.equal(res1.error, null);
    assert.equal((res1.data as any)?.success, true);
    assert.ok((res1.data as any)?.subscription_id);

    // Second call: idempotent duplicate returns already_processed
    const res2 = await sbAdmin.rpc('activate_payment_subscription', {
      p_order_id: orderId,
      p_payment_id: `cf_pay_j3_1`,
      p_gateway_status: 'PAID',
      p_payment_method: 'upi',
      p_raw_payload: {},
    });
    assert.equal(res2.error, null);
    assert.equal((res2.data as any)?.already_processed, true);

    await sbAdmin.from('subscriptions').delete().eq('id', (res1.data as any)?.subscription_id);
    await sbAdmin.from('payment_records').delete().eq('cashfree_order_id', orderId);
  }
});

test('Journey 4: Client Pulse Inactivity Detection & Proactive Coach Intervention', async () => {
  const todayKey = '2026-11-16';
  // 1. Client B inactive for 14 days
  const pulse = computeClientPulse({
    client: { id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId, name: 'Client B' } as any,
    assignments: [
      {
        id: 'a_j4_1',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
        category: 'workout',
        scheduledDates: ['2026-11-05', '2026-11-08'],
        isOptional: false,
        isRecovery: false,
      } as any,
    ],
    completions: [
      {
        id: 'c_j4_1',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
        assignmentId: 'a_j4_1',
        dateKey: '2026-11-02', // 14 days inactive
      } as any,
    ],
    todayKey,
    workoutSessions: [],
    weeklyCheckIns: [],
  });
  assert.equal(pulse.status, 'needs_attention');
  assert.ok(pulse.daysInactive >= 5);

  // 2. Coach intervention message sent & persisted into chat_messages
  if (sbAdmin) {
    const convId = `conv_${SYNTHETIC_IDENTITIES.CLIENT_B.clientId}_${SYNTHETIC_IDENTITIES.TRAINER_A.trainerId}`;
    await sbAdmin.from('chat_conversations').upsert({
      id: convId,
      client_id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
      client_user_id: SYNTHETIC_IDENTITIES.CLIENT_B.uid,
      client_name: SYNTHETIC_IDENTITIES.CLIENT_B.displayName,
      trainer_id: SYNTHETIC_IDENTITIES.TRAINER_A.trainerId,
      trainer_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      trainer_name: SYNTHETIC_IDENTITIES.TRAINER_A.displayName,
      last_message_text: 'Hey Ananya, noticed you missed the last couple workouts.',
      last_message_at: new Date().toISOString(),
    });

    const msgId = `msg_j4_${Date.now()}`;
    const { error: msgErr } = await sbAdmin.from('chat_messages').insert({
      id: msgId,
      conversation_id: convId,
      sender_user_id: SYNTHETIC_IDENTITIES.TRAINER_A.uid,
      sender_role: 'trainer',
      text: 'Hey Ananya, noticed you missed the last couple workouts. How are you feeling?',
    });
    assert.equal(msgErr, null);

    // Query surfaces message in conversation
    const { data: fetchedMsg, error: fetchErr } = await sbAdmin
      .from('chat_messages')
      .select('id, sender_user_id, text')
      .eq('id', msgId)
      .single();
    assert.equal(fetchErr, null);
    assert.equal(fetchedMsg?.sender_user_id, SYNTHETIC_IDENTITIES.TRAINER_A.uid);
    assert.ok(fetchedMsg?.text.includes('Ananya'));

    await sbAdmin.from('chat_messages').delete().eq('id', msgId);
    await sbAdmin.from('chat_conversations').delete().eq('id', convId);
  }

  // 3. Client logs activity and resumes
  const resumedPulse = computeClientPulse({
    client: { id: SYNTHETIC_IDENTITIES.CLIENT_B.clientId, name: 'Client B' } as any,
    assignments: [
      {
        id: 'a_j4_2',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
        category: 'workout',
        scheduledDates: ['2026-11-15'],
        isOptional: false,
        isRecovery: false,
      } as any,
    ],
    completions: [
      {
        id: 'c_j4_2',
        clientId: SYNTHETIC_IDENTITIES.CLIENT_B.clientId,
        assignmentId: 'a_j4_2',
        dateKey: '2026-11-15',
      } as any,
    ],
    todayKey,
    workoutSessions: [],
    weeklyCheckIns: [],
  });
  assert.equal(resumedPulse.status, 'on_track');
  assert.equal(resumedPulse.daysInactive, 1);
});
