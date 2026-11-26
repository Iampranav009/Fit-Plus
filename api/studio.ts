/**
 * api/studio.ts
 *
 * Consolidated router for trainer studio operational endpoints. All data is
 * read and written with the Supabase service role; callers are identified by
 * their Supabase Auth access token.
 *
 * Routes handled:
 *   GET  /api/invites/resolve
 *   GET  /api/trainers/public
 *   POST /api/data/save-onboarding
 *   POST /api/data/create-invite
 *   POST /api/relationships/respond
 *   POST /api/streaks/recalculate
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AuthHttpError, verifyAuthenticatedRequest } from './_lib/requestAuth.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './_lib/supabaseAdmin.js';
import { DEFAULT_TIMEZONE, getTodayKey } from '../src/lib/date.js';
import { computeStreakSummary } from '../src/lib/streak.js';
import type { Assignment, CompletionEvent } from '../src/types/domain.js';

const SAFE_ID = /^[a-zA-Z0-9_\-]+$/;

function sendError(res: VercelResponse, error: unknown, fallback: string): void {
  if (error instanceof AuthHttpError) {
    res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ ok: false, error: fallback });
}

/** Throws on a Supabase error instead of letting a failed write pass silently. */
function must<T extends { error: { message: string } | null }>(result: T, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result;
}

/** Refuses to overwrite a row by id when it belongs to someone else. */
async function assertOwnedOrNew(table: string, id: unknown, ownerCol: string, uid: string): Promise<void> {
  if (typeof id !== 'string' || !SAFE_ID.test(id)) {
    throw new AuthHttpError(400, 'validation/invalid-id', `Invalid ${table} id.`);
  }
  const db = getSupabaseAdminClient() as unknown as SupabaseClient;
  const { data } = await db.from(table).select(ownerCol).eq('id', id).maybeSingle();
  const owner = (data as unknown as Record<string, unknown> | null)?.[ownerCol];
  if (owner !== undefined && owner !== uid) {
    throw new AuthHttpError(403, 'auth/forbidden', `That ${table} record belongs to another account.`);
  }
}

function requireDb(res: VercelResponse): boolean {
  if (isSupabaseAdminConfigured()) return true;
  res.status(503).json({ ok: false, code: 'server/admin-unconfigured', error: 'Database service credentials are not configured.' });
  return false;
}

// ─── route: GET /api/invites/resolve ─────────────────────────────────────────
async function handleInviteResolve(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  const rawToken = typeof req.query.token === 'string' ? req.query.token.trim().toUpperCase() : '';
  if (!rawToken || rawToken.length > 64 || !/^[A-Z0-9_\-]+$/.test(rawToken)) {
    res.status(400).json({ ok: false, state: 'not_found', error: 'Invalid invite token format.' }); return;
  }

  if (!isSupabaseAdminConfigured()) { res.status(200).json({ ok: true, source: 'client_fallback', state: 'unverified_server' }); return; }

  try {
    const db = getSupabaseAdminClient();
    const { data: inv } = await db.from('trainer_invites').select('*').eq('token', rawToken).maybeSingle();
    if (!inv) { res.status(200).json({ ok: true, state: 'not_found' }); return; }

    if (inv.status === 'revoked') { res.status(200).json({ ok: true, source: 'supabase_admin', state: 'revoked' }); return; }
    if (inv.status === 'redeemed') { res.status(200).json({ ok: true, source: 'supabase_admin', state: 'redeemed' }); return; }

    const todayKey = new Date().toISOString().slice(0, 10);
    const isExpired = inv.expires_at && inv.expires_at.slice(0, 10) < todayKey;
    const state = isExpired ? 'expired' : 'active';

    const [trRes, pkgRes] = await Promise.all([
      db.from('trainer_profiles').select('*').eq('user_id', inv.trainer_user_id).maybeSingle(),
      db.from('coaching_packages').select('*').eq('trainer_user_id', inv.trainer_user_id).eq('status', 'active'),
    ]);

    const tr = trRes.data;
    const trainer = tr ? { id: tr.id, slug: tr.slug, displayName: tr.display_name, headline: tr.headline, bio: tr.bio, city: tr.city, coachingMode: tr.coaching_mode, specialties: tr.specialties || [], languages: tr.languages || [], certifications: tr.certifications || [], experienceYears: tr.experience_years || 1, avatarKey: tr.avatar_key || '', coverKey: tr.cover_key || '', photoUrl: tr.photo_url || undefined, verificationStatus: tr.verification_status || 'unverified', isPublished: tr.is_published, acceptingClients: tr.accepting_clients } : null;
    const packages = (pkgRes.data || []).map((p) => ({ id: p.id, trainerId: p.trainer_id, name: p.name, summary: p.summary || '', priceInr: p.price_inr, cadence: p.cadence, features: p.features || [], status: p.status }));

    res.status(200).json({ ok: true, source: 'supabase_admin', state, invite: { id: inv.id, token: inv.token, trainerId: inv.trainer_id, clientEmailOrLabel: inv.client_email_or_label, suggestedPackageId: inv.suggested_package_id || undefined, status: state, expiresAt: inv.expires_at, createdAt: inv.created_at }, trainer, packages });
  } catch (error) {
    sendError(res, error, 'Unable to resolve invitation.');
  }
}

// ─── route: GET /api/trainers/public ─────────────────────────────────────────
async function handlePublicTrainers(_req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireDb(res)) return;
  try {
    const db = getSupabaseAdminClient();
    const [trRes, pkgRes, revRes] = await Promise.all([
      db.from('trainer_profiles').select('*').eq('accepting_clients', true).eq('is_published', true),
      db.from('coaching_packages').select('*').eq('status', 'active'),
      db.from('trainer_reviews').select('*'),
    ]);
    must(trRes, 'trainer_profiles');
    res.status(200).json({ ok: true, trainers: trRes.data || [], packages: pkgRes.data || [], reviews: revRes.data || [] });
  } catch (error) {
    sendError(res, error, 'Unable to load trainers.');
  }
}

// ─── route: POST /api/data/save-onboarding ──────────────────────────────────
async function handleSaveOnboarding(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!requireDb(res)) return;

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const uid = authCtx.uid;
    const body = (req.body || {}) as Record<string, any>;
    const userUpdate = (body.userUpdate || {}) as Record<string, unknown>;
    const db = getSupabaseAdminClient();
    // Admins keep their role whichever onboarding they complete.
    const keepAdmin = authCtx.isAdmin;

    const names = {
      first_name: String(userUpdate.first_name || 'Member').slice(0, 80),
      last_name: String(userUpdate.last_name || '').slice(0, 80),
      timezone: String(userUpdate.timezone || 'Asia/Kolkata').slice(0, 64),
    };

    if (body.type === 'trainer') {
      const { trainerProfile, starterPackage } = body;
      if (!trainerProfile) throw new AuthHttpError(400, 'validation/missing-profile', 'Trainer profile is required.');
      await assertOwnedOrNew('trainer_profiles', trainerProfile.id, 'user_id', uid);
      if (starterPackage) await assertOwnedOrNew('coaching_packages', starterPackage.id, 'trainer_user_id', uid);

      must(await db.from('app_users').update({
        ...names,
        is_adult_confirmed: true,
        onboarding_completed: true,
        role: keepAdmin ? 'admin' : 'trainer',
      }).eq('firebase_uid', uid), 'app_users');
      must(await db.from('trainer_profiles').upsert({ ...trainerProfile, user_id: uid }), 'trainer_profiles');
      if (starterPackage) {
        must(await db.from('coaching_packages').upsert({ ...starterPackage, trainer_id: trainerProfile.id, trainer_user_id: uid }), 'coaching_packages');
      }
    } else {
      const { clientProfile, starterAssignment, workoutPlan, mealPlan, initialProgress } = body;
      if (!clientProfile) throw new AuthHttpError(400, 'validation/missing-profile', 'Client profile is required.');
      await assertOwnedOrNew('client_profiles', clientProfile.id, 'user_id', uid);
      if (starterAssignment) await assertOwnedOrNew('task_assignments', starterAssignment.id, 'client_user_id', uid);
      if (workoutPlan) await assertOwnedOrNew('workout_plans', workoutPlan.id, 'client_user_id', uid);
      if (mealPlan) await assertOwnedOrNew('meal_plans', mealPlan.id, 'client_user_id', uid);
      if (initialProgress) await assertOwnedOrNew('progress_events', initialProgress.id, 'client_user_id', uid);

      const owned = { client_id: clientProfile.id, client_user_id: uid };
      must(await db.from('app_users').update({
        ...names,
        role: keepAdmin ? 'admin' : authCtx.role === 'trainer' ? 'trainer' : 'client',
        is_adult_confirmed: Boolean(userUpdate.is_adult_confirmed),
        onboarding_completed: true,
      }).eq('firebase_uid', uid), 'app_users');
      must(await db.from('client_profiles').upsert({ ...clientProfile, user_id: uid }), 'client_profiles');
      if (starterAssignment) must(await db.from('task_assignments').upsert({ ...starterAssignment, ...owned }), 'task_assignments');
      if (workoutPlan) must(await db.from('workout_plans').upsert({ ...workoutPlan, ...owned }), 'workout_plans');
      if (mealPlan) must(await db.from('meal_plans').upsert({ ...mealPlan, ...owned }), 'meal_plans');
      if (initialProgress) must(await db.from('progress_events').upsert({ ...initialProgress, ...owned }), 'progress_events');
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    sendError(res, error, 'Unable to save onboarding data.');
  }
}

// ─── route: POST /api/data/create-invite ────────────────────────────────────
const CreateInviteSchema = z.object({
  id: z.string().min(1).max(128).regex(SAFE_ID),
  token: z.string().min(4).max(64).regex(/^[A-Z0-9_\-]+$/),
  trainer_id: z.string().min(1).max(128).regex(SAFE_ID),
  client_email_or_label: z.string().max(200).default(''),
  suggested_package_id: z.string().max(128).regex(SAFE_ID).nullable().optional(),
  expires_at: z.string().min(10).max(40),
});

async function handleCreateInvite(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!requireDb(res)) return;

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = CreateInviteSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Invalid invite payload.' }); return; }
    const inv = parsed.data;
    const db = getSupabaseAdminClient();

    const { data: trainer } = await db.from('trainer_profiles').select('user_id').eq('id', inv.trainer_id).maybeSingle();
    if (!trainer || (trainer.user_id !== authCtx.uid && !authCtx.isAdmin)) {
      throw new AuthHttpError(403, 'auth/forbidden', 'You can only create invites for your own trainer profile.');
    }

    must(await db.from('trainer_invites').insert({
      id: inv.id,
      token: inv.token,
      trainer_id: inv.trainer_id,
      trainer_user_id: trainer.user_id,
      client_email_or_label: inv.client_email_or_label || 'Invited member',
      suggested_package_id: inv.suggested_package_id || null,
      status: 'active',
      expires_at: inv.expires_at,
    }), 'trainer_invites');
    res.status(200).json({ ok: true });
  } catch (error) {
    sendError(res, error, 'Unable to create invite.');
  }
}

// ─── route: POST /api/relationships/respond ───────────────────────────────────
const RespondSchema = z.object({
  relationshipId: z.string().min(1).max(128).regex(SAFE_ID),
  action: z.enum(['accept', 'decline']),
  packageId: z.string().max(128).regex(SAFE_ID).optional(),
});

async function handleRelationshipRespond(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!requireDb(res)) return;

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = RespondSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Invalid relationship response payload.' }); return; }

    const { relationshipId, action, packageId } = parsed.data;
    const db = getSupabaseAdminClient();
    const { data: rel } = await db.from('coaching_relationships').select('*').eq('id', relationshipId).maybeSingle();
    if (!rel) { res.status(404).json({ ok: false, code: 'relationship/not-found', error: 'Coaching request not found.' }); return; }
    if (rel.trainer_user_id !== authCtx.uid && !authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/forbidden', error: 'Only the invited coach can respond to this request.' }); return; }
    if (rel.status !== 'pending') { res.status(409).json({ ok: false, code: 'relationship/already-resolved', error: `This coaching request is already ${rel.status}.` }); return; }

    const { data: trainer } = await db.from('trainer_profiles').select('display_name').eq('id', rel.trainer_id).maybeSingle();
    const trainerName = trainer?.display_name || 'Your FitPlus coach';
    const nowIso = new Date().toISOString();
    const ntfId = `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    if (action === 'accept') {
      must(await db.from('coaching_relationships')
        .update({ status: 'ended', ended_at: nowIso })
        .eq('client_user_id', rel.client_user_id).eq('status', 'active').neq('id', relationshipId), 'end previous relationship');
      must(await db.from('coaching_relationships')
        .update({ status: 'active', started_at: nowIso, ...(packageId ? { package_id: packageId } : {}) })
        .eq('id', relationshipId), 'activate relationship');
      must(await db.from('client_profiles')
        .update({ active_trainer_user_id: rel.trainer_user_id })
        .eq('id', rel.client_id), 'client_profiles');
      await db.from('notifications').insert({ id: ntfId, recipient_user_id: rel.client_user_id, category: 'admin', title: 'Coaching request accepted', body: `${trainerName} accepted your coaching request. Check Today & Plan to begin.`, action_url: '/app/today' });
    } else {
      must(await db.from('coaching_relationships')
        .update({ status: 'ended', ended_at: nowIso })
        .eq('id', relationshipId), 'decline relationship');
      await db.from('notifications').insert({ id: ntfId, recipient_user_id: rel.client_user_id, category: 'admin', title: 'Coaching request update', body: `${trainerName} is unable to take new requests right now. Explore other coaches on Discover.`, action_url: '/discover' });
    }

    res.status(200).json({ ok: true, relationshipId, status: action === 'accept' ? 'active' : 'ended' });
  } catch (error) {
    sendError(res, error, 'Unable to process coaching request right now.');
  }
}

// ─── route: POST /api/streaks/recalculate ────────────────────────────────────
const RecalculateSchema = z.object({
  clientId: z.string().min(1).max(128).regex(SAFE_ID),
  recoveryDay: z.object({ dateKey: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/), approved: z.boolean() }).optional(),
});

async function handleStreakRecalculate(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!requireDb(res)) return;

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = RecalculateSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Invalid clientId or recoveryDay parameters.' }); return; }

    const { clientId, recoveryDay } = parsed.data;
    const db = getSupabaseAdminClient();
    const { data: client } = await db.from('client_profiles').select('id, user_id, active_trainer_user_id').eq('id', clientId).maybeSingle();
    if (!client) { res.status(404).json({ ok: false, code: 'client/not-found', error: 'Client not found.' }); return; }

    const clientUserId = client.user_id;
    const trainerUserId = client.active_trainer_user_id || '';
    const isClientOwner = clientUserId === authCtx.uid;
    const isActiveTrainer = Boolean(trainerUserId) && trainerUserId === authCtx.uid;
    if (!isClientOwner && !isActiveTrainer && !authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/forbidden', error: 'You do not have permission to recalculate streaks for this client.' }); return; }

    if (recoveryDay) {
      if (!isActiveTrainer && !authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/trainer-required', error: 'Only the active coach can approve or revoke recovery days.' }); return; }
      must(await db.from('daily_activity').upsert({
        id: `act_${clientUserId}_${recoveryDay.dateKey}`,
        client_id: clientId,
        client_user_id: clientUserId,
        trainer_user_id: trainerUserId || null,
        date_key: recoveryDay.dateKey,
        recovery_approved: recoveryDay.approved,
      }, { onConflict: 'client_user_id,date_key' }), 'daily_activity');
    }

    const [userRes, assignRes, complRes, actRes, streakRes] = await Promise.all([
      db.from('app_users').select('timezone').eq('firebase_uid', clientUserId).maybeSingle(),
      db.from('task_assignments').select('*').eq('client_id', clientId),
      db.from('task_completions').select('*').eq('client_id', clientId),
      db.from('daily_activity').select('date_key').eq('client_id', clientId).eq('recovery_approved', true),
      db.from('streak_records').select('id, created_at').eq('client_user_id', clientUserId).maybeSingle(),
    ]);

    const todayKey = getTodayKey(userRes.data?.timezone || DEFAULT_TIMEZONE);
    const nowIso = new Date().toISOString();
    const assignments: Assignment[] = (assignRes.data || []).map((a) => ({
      id: a.id, clientId: a.client_id, trainerId: a.trainer_id || undefined, templateId: a.template_id || undefined,
      title: a.title, category: a.category as Assignment['category'], instructions: a.instructions,
      durationMinutes: a.duration_minutes, dueTime: a.due_time, completionType: a.completion_type as Assignment['completionType'],
      targetLabel: a.target_label || undefined, scheduledDates: a.scheduled_dates || [], isOptional: a.is_optional,
      isRecovery: a.is_recovery, hasCustomOverride: a.has_custom_override, overrideNote: a.override_note || undefined,
      createdAt: a.created_at,
    }));
    const completions: CompletionEvent[] = (complRes.data || []).map((c) => ({
      id: c.id, assignmentId: c.assignment_id, clientId: c.client_id, dateKey: c.date_key,
      completedAt: c.completed_at, loggedValue: c.logged_value || undefined, notes: c.notes || undefined,
    }));
    const approvedRecoveryDateKeys = (actRes.data || []).map((d) => d.date_key);

    const summary = computeStreakSummary(assignments, completions, todayKey, 120, approvedRecoveryDateKeys);
    const streakId = streakRes.data?.id || clientId;
    must(await db.from('streak_records').upsert({
      id: streakId,
      client_id: clientId,
      client_user_id: clientUserId,
      trainer_user_id: trainerUserId || null,
      current_streak: summary.currentStreak,
      longest_streak: summary.longestStreak,
      last_completed_date_key: summary.lastEligibleDateKey || null,
    }, { onConflict: 'client_user_id' }), 'streak_records');

    res.status(200).json({
      ok: true, todayKey, summary, approvedRecoveryDateKeys,
      streak: { id: streakId, clientId, clientUserId, trainerUserId, currentStreak: summary.currentStreak, longestStreak: summary.longestStreak, lastEligibleDateKey: summary.lastEligibleDateKey || undefined, createdAt: streakRes.data?.created_at || nowIso, updatedAt: nowIso },
    });
  } catch (error) {
    sendError(res, error, 'Unable to recalculate streak right now.');
  }
}

// ─── route: GET /api/data/workspace ─────────────────────────────────────────
async function handleWorkspaceHydrate(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!requireDb(res)) return;

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const uid = authCtx.uid;
    const db = getSupabaseAdminClient();
    const isAdmin = authCtx.isAdmin;

    const [
      userRes, trainersRes, packagesRes, clientsRes, relationshipsRes,
      invitesRes, enrollmentsRes, subscriptionsRes, paymentsRes, reviewsRes,
      templatesRes, assignmentsRes, completionsRes, activitiesRes, progressRes,
      workoutPlansRes, mealPlansRes, slotsRes, bookingsRes, notificationsRes,
      aiDraftsRes, groupsRes, groupMembersRes, streaksRes, consentsRes,
      verificationRes, auditRes, exercisesRes, sessionsRes, achievementsRes,
      nutritionLogsRes, checkInsRes, conversationsRes, workoutTemplatesRes,
      nutritionTemplatesRes, scheduledRemindersRes,
    ] = await Promise.all([
      db.from('app_users').select('*').eq('firebase_uid', uid).maybeSingle(),
      db.from('trainer_profiles').select('*'),
      db.from('coaching_packages').select('*'),
      db.from('client_profiles').select('*'),
      db.from('coaching_relationships').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('trainer_invites').select('*').or(`trainer_user_id.eq.${uid},redeemed_by_user_id.eq.${uid}`),
      db.from('enrollments').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('subscriptions').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('payment_records').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('trainer_reviews').select('*'),
      db.from('task_templates').select('*').eq('trainer_user_id', uid),
      db.from('task_assignments').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('task_completions').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('daily_activity').select('*').eq('client_user_id', uid),
      db.from('progress_events').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('workout_plans').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('meal_plans').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('consultation_slots').select('*').or(`trainer_user_id.eq.${uid},booked_by_user_id.eq.${uid}`),
      db.from('consultation_bookings').select('*').or(`trainer_user_id.eq.${uid},client_user_id.eq.${uid}`),
      db.from('notifications').select('*').eq('recipient_user_id', uid),
      db.from('ai_plan_drafts').select('*').eq('trainer_user_id', uid),
      db.from('client_groups').select('*').eq('trainer_user_id', uid),
      db.from('client_group_members').select('*').or(`trainer_user_id.eq.${uid},client_user_id.eq.${uid}`),
      db.from('streak_records').select('*').eq('client_user_id', uid),
      db.from('consent_records').select('*').eq('user_id', uid),
      isAdmin
        ? db.from('trainer_verification_requests').select('*')
        : db.from('trainer_verification_requests').select('*').eq('trainer_user_id', uid),
      isAdmin
        ? db.from('audit_logs').select('*')
        : db.from('audit_logs').select('*').eq('actor_user_id', uid),
      db.from('exercise_definitions').select('*'),
      db.from('workout_sessions').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('achievement_unlocks').select('*').eq('client_user_id', uid),
      db.from('nutrition_diary_entries').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('weekly_check_ins').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('chat_conversations').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      db.from('workout_program_templates').select('*').eq('trainer_user_id', uid),
      db.from('nutrition_program_templates').select('*').eq('trainer_user_id', uid),
      db.from('scheduled_reminders').select('*').eq('recipient_user_id', uid),
    ]);

    res.status(200).json({
      ok: true,
      user: userRes.data,
      trainers: trainersRes.data || [],
      packages: packagesRes.data || [],
      clients: clientsRes.data || [],
      relationships: relationshipsRes.data || [],
      invites: invitesRes.data || [],
      enrollments: enrollmentsRes.data || [],
      subscriptions: subscriptionsRes.data || [],
      payments: paymentsRes.data || [],
      reviews: reviewsRes.data || [],
      templates: templatesRes.data || [],
      assignments: assignmentsRes.data || [],
      completions: completionsRes.data || [],
      activities: activitiesRes.data || [],
      progress: progressRes.data || [],
      workoutPlans: workoutPlansRes.data || [],
      mealPlans: mealPlansRes.data || [],
      slots: slotsRes.data || [],
      bookings: bookingsRes.data || [],
      notifications: notificationsRes.data || [],
      aiDrafts: aiDraftsRes.data || [],
      groups: groupsRes.data || [],
      groupMembers: groupMembersRes.data || [],
      streaks: streaksRes.data || [],
      consents: consentsRes.data || [],
      verifications: verificationRes.data || [],
      auditLogs: auditRes.data || [],
      exercises: exercisesRes.data || [],
      sessions: sessionsRes.data || [],
      achievements: achievementsRes.data || [],
      nutritionLogs: nutritionLogsRes.data || [],
      checkIns: checkInsRes.data || [],
      conversations: conversationsRes.data || [],
      workoutTemplates: workoutTemplatesRes.data || [],
      nutritionTemplates: nutritionTemplatesRes.data || [],
      scheduledReminders: scheduledRemindersRes.data || [],
    });
  } catch (error) {
    sendError(res, error, 'Unable to load workspace data.');
  }
}

// ─── main router ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const path = (req.url || '').split('?')[0].replace(/\/+$/, '');
  if (path.includes('/invites/') || path.endsWith('/resolve')) return handleInviteResolve(req, res);
  if (path.includes('/relationships/') || path.endsWith('/respond')) return handleRelationshipRespond(req, res);
  if (path.includes('/streaks/') || path.endsWith('/recalculate')) return handleStreakRecalculate(req, res);
  if (path.includes('/trainers/public')) return handlePublicTrainers(req, res);
  if (path.includes('/data/save-onboarding')) return handleSaveOnboarding(req, res);
  if (path.includes('/data/create-invite')) return handleCreateInvite(req, res);
  if (path.includes('/data/workspace')) return handleWorkspaceHydrate(req, res);
  res.status(404).json({ ok: false, error: 'Studio endpoint not found.' });
}
