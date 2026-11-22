/**
 * api/studio.ts
 *
 * Consolidated router for trainer studio operational endpoints.
 * Replaces 3 separate functions with 1.
 *
 * Routes handled:
 *   GET  /api/invites/resolve
 *   POST /api/relationships/respond
 *   POST /api/streaks/recalculate
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from './_lib/firebaseAdmin.js';
import { getFirestoreAdminContext, isFirebaseAdminConfigured } from './_lib/firestoreAdmin.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './_lib/supabaseAdmin.js';
import { verifyFirebaseIdToken } from './_lib/firebaseAuth.js';
import { DEFAULT_TIMEZONE, getTodayKey } from '../src/lib/date.js';
import { computeStreakSummary } from '../src/lib/streak.js';
import type { Assignment, CompletionEvent } from '../src/types/domain.js';

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
    console.error('Invite resolve error:', error);
    res.status(500).json({ ok: false, error: 'Unable to resolve invitation.' });
  }
}

// ─── route: GET /api/trainers/public ─────────────────────────────────────────
async function handlePublicTrainers(_req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!isSupabaseAdminConfigured()) { res.status(200).json({ ok: true, trainers: [], packages: [], reviews: [] }); return; }

  try {
    const db = getSupabaseAdminClient();
    const [trRes, pkgRes, revRes] = await Promise.all([
      db.from('trainer_profiles').select('*').eq('accepting_clients', true).eq('is_published', true),
      db.from('coaching_packages').select('*').eq('status', 'active'),
      db.from('trainer_reviews').select('*'),
    ]);
    res.status(200).json({ ok: true, trainers: trRes.data || [], packages: pkgRes.data || [], reviews: revRes.data || [] });
  } catch (error) {
    console.error('Public trainers error:', error);
    res.status(500).json({ ok: false, error: 'Unable to load trainers.' });
  }
}

// ─── route: POST /api/data/save-onboarding ──────────────────────────────────
async function handleSaveOnboarding(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!isSupabaseAdminConfigured()) { res.status(503).json({ ok: false, error: 'Database not configured.' }); return; }

  const rawAuth = req.headers.authorization;
  if (!rawAuth?.startsWith('Bearer ')) { res.status(401).json({ ok: false, error: 'Missing token.' }); return; }
  const idToken = rawAuth.slice(7).trim();

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const uid = decoded.uid;
    const body = req.body || {};
    const db = getSupabaseAdminClient();

    if (body.type === 'trainer') {
      const { userUpdate, trainerProfile, starterPackage } = body;
      await db.from('app_users').update({
        first_name: userUpdate.first_name,
        last_name: userUpdate.last_name || '',
        timezone: userUpdate.timezone || 'Asia/Kolkata',
        is_adult_confirmed: true,
        onboarding_completed: true,
        role: userUpdate.role || 'trainer',
      }).eq('firebase_uid', uid);

      if (trainerProfile) {
        await db.from('trainer_profiles').upsert(trainerProfile);
      }
      if (starterPackage) {
        await db.from('coaching_packages').upsert(starterPackage);
      }
    } else {
      const { userUpdate, clientProfile, starterAssignment, workoutPlan, mealPlan, initialProgress } = body;
      await db.from('app_users').update({
        first_name: userUpdate.first_name,
        last_name: userUpdate.last_name || '',
        role: 'client',
        timezone: userUpdate.timezone || 'Asia/Kolkata',
        is_adult_confirmed: Boolean(userUpdate.is_adult_confirmed),
        onboarding_completed: true,
      }).eq('firebase_uid', uid);

      if (clientProfile) await db.from('client_profiles').upsert(clientProfile);
      if (starterAssignment) await db.from('task_assignments').upsert(starterAssignment);
      if (workoutPlan) await db.from('workout_plans').upsert(workoutPlan);
      if (mealPlan) await db.from('meal_plans').upsert(mealPlan);
      if (initialProgress) await db.from('progress_events').upsert(initialProgress);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Save onboarding error:', error);
    res.status(500).json({ ok: false, error: 'Unable to save onboarding data.' });
  }
}

// ─── route: POST /api/data/create-invite ────────────────────────────────────
async function handleCreateInvite(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }
  if (!isSupabaseAdminConfigured()) { res.status(503).json({ ok: false, error: 'Database not configured.' }); return; }

  const rawAuth = req.headers.authorization;
  if (!rawAuth?.startsWith('Bearer ')) { res.status(401).json({ ok: false, error: 'Missing token.' }); return; }
  const idToken = rawAuth.slice(7).trim();

  try {
    await verifyFirebaseIdToken(idToken);
    const db = getSupabaseAdminClient();
    const invite = req.body;
    await db.from('trainer_invites').insert({
      id: invite.id,
      token: invite.token,
      trainer_id: invite.trainer_id,
      trainer_user_id: invite.trainer_user_id,
      client_email_or_label: invite.client_email_or_label,
      suggested_package_id: invite.suggested_package_id || null,
      status: 'active',
      expires_at: invite.expires_at,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ ok: false, error: 'Unable to create invite.' });
  }
}

// ─── route: POST /api/relationships/respond ───────────────────────────────────
const RespondSchema = z.object({
  relationshipId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  action: z.enum(['accept', 'decline']),
  packageId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
});

async function handleRelationshipRespond(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = RespondSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Invalid relationship response payload.' }); return; }

    const { relationshipId, action, packageId } = parsed.data;
    const { db } = getFirebaseAdminContext();
    const relRef = db.collection('relationships').doc(relationshipId);
    const relSnap = await relRef.get();
    if (!relSnap.exists) { res.status(404).json({ ok: false, code: 'relationship/not-found', error: 'Coaching request not found.' }); return; }

    const rel = relSnap.data()!;
    if (rel.trainerUserId !== authCtx.uid && !authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/forbidden', error: 'Only the invited coach can respond to this request.' }); return; }
    if (rel.status !== 'pending') { res.status(409).json({ ok: false, code: 'relationship/already-resolved', error: `This coaching request is already ${rel.status}.` }); return; }

    const clientId = String(rel.clientId);
    const [clientSnap, trainerSnap] = await Promise.all([db.collection('clients').doc(clientId).get(), db.collection('trainers').doc(String(rel.trainerId)).get()]);
    if (!clientSnap.exists) { res.status(404).json({ ok: false, code: 'client/not-found', error: 'Client profile not found.' }); return; }

    const trainerDisplayName = String(trainerSnap.data()?.displayName || 'Your FitPlus coach');
    const nowIso = new Date().toISOString();
    const batch = db.batch();
    const ntfId = `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    if (action === 'accept') {
      const existingActiveRelId = String(clientSnap.data()?.activeRelationshipId || '');
      if (existingActiveRelId && existingActiveRelId !== relationshipId) batch.update(db.collection('relationships').doc(existingActiveRelId), { status: 'ended', endedAt: nowIso, updatedAt: FieldValue.serverTimestamp() });
      batch.update(relRef, { status: 'active', ...(packageId ? { packageId } : {}), startedAt: nowIso, updatedAt: FieldValue.serverTimestamp() });
      batch.update(db.collection('clients').doc(clientId), { activeTrainerUserId: String(rel.trainerUserId), activeRelationshipId: relationshipId, updatedAt: FieldValue.serverTimestamp() });
      batch.set(db.collection('notifications').doc(ntfId), { id: ntfId, recipientUserId: String(rel.clientUserId), senderUserId: authCtx.uid, title: 'Coaching request accepted', body: `${trainerDisplayName} accepted your coaching request. Check Today & Plan to begin.`, category: 'invite', read: false, actionRoute: '/app/today', relatedClientId: clientId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    } else {
      batch.update(relRef, { status: 'ended', endedAt: nowIso, updatedAt: FieldValue.serverTimestamp() });
      batch.set(db.collection('notifications').doc(ntfId), { id: ntfId, recipientUserId: String(rel.clientUserId), senderUserId: authCtx.uid, title: 'Coaching request update', body: `${trainerDisplayName} is unable to take new requests right now. Explore other coaches on Discover.`, category: 'invite', read: false, actionRoute: '/discover', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
    res.status(200).json({ ok: true, relationshipId, status: action === 'accept' ? 'active' : 'ended' });
  } catch (error) {
    if (error instanceof AuthHttpError) { res.status(error.status).json({ ok: false, code: error.code, error: error.message }); return; }
    console.error('Relationship respond error:', error);
    res.status(500).json({ ok: false, error: 'Unable to process coaching request right now.' });
  }
}

// ─── route: POST /api/streaks/recalculate ────────────────────────────────────
const RecalculateSchema = z.object({
  clientId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  recoveryDay: z.object({ dateKey: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/), approved: z.boolean() }).optional(),
});

async function handleStreakRecalculate(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = RecalculateSchema.safeParse(req.body ?? {});
    if (!parsed.success) { res.status(400).json({ ok: false, code: 'validation/invalid-input', error: 'Invalid clientId or recoveryDay parameters.' }); return; }

    const { clientId, recoveryDay } = parsed.data;
    const { db } = getFirebaseAdminContext();
    const clientSnap = await db.collection('clients').doc(clientId).get();
    if (!clientSnap.exists) { res.status(404).json({ ok: false, code: 'client/not-found', error: 'Client not found.' }); return; }

    const clientData = clientSnap.data()!;
    const isClientOwner = clientData.userId === authCtx.uid;
    const isActiveTrainer = clientData.activeTrainerUserId === authCtx.uid;
    if (!isClientOwner && !isActiveTrainer && !authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/forbidden', error: 'You do not have permission to recalculate streaks for this client.' }); return; }

    if (recoveryDay) {
      if (!isActiveTrainer && !authCtx.isAdmin) { res.status(403).json({ ok: false, code: 'auth/trainer-required', error: 'Only the active coach can approve or revoke recovery days.' }); return; }
      const activityId = `${clientId}_${recoveryDay.dateKey}`;
      const activityRef = db.collection('dailyActivity').doc(activityId);
      const existingAct = await activityRef.get();
      if (existingAct.exists) {
        await activityRef.update({ recoveryApproved: recoveryDay.approved, updatedAt: FieldValue.serverTimestamp() });
      } else {
        await activityRef.set({ id: activityId, clientId, clientUserId: String(clientData.userId || ''), trainerUserId: String(clientData.activeTrainerUserId || authCtx.uid), dateKey: recoveryDay.dateKey, hydrationGlasses: 0, recoveryApproved: recoveryDay.approved, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      }
    }

    const [userSnap, assignmentsSnap, completionsSnap, activitySnap, streakSnap] = await Promise.all([
      db.collection('users').doc(String(clientData.userId)).get(),
      db.collection('assignments').where('clientId', '==', clientId).get(),
      db.collection('completions').where('clientId', '==', clientId).get(),
      db.collection('dailyActivity').where('clientId', '==', clientId).get(),
      db.collection('streaks').doc(clientId).get(),
    ]);

    const timezone = String(userSnap.data()?.timezone || DEFAULT_TIMEZONE);
    const todayKey = getTodayKey(timezone);

    const assignments: Assignment[] = assignmentsSnap.docs.map((d) => { const raw = d.data(); return { id: d.id, clientId: String(raw.clientId || clientId), trainerId: raw.trainerId ? String(raw.trainerId) : undefined, templateId: raw.templateId ? String(raw.templateId) : undefined, title: String(raw.title || 'Commitment'), category: raw.category || 'workout', instructions: String(raw.instructions || ''), durationMinutes: Number(raw.durationMinutes || 0), dueTime: String(raw.dueTime || '09:00'), completionType: raw.completionType || 'checkbox', targetLabel: raw.targetLabel ? String(raw.targetLabel) : undefined, scheduledDates: Array.isArray(raw.scheduledDates) ? raw.scheduledDates.map(String) : [], isOptional: Boolean(raw.isOptional), isRecovery: Boolean(raw.isRecovery), hasCustomOverride: Boolean(raw.hasCustomOverride), overrideNote: raw.overrideNote ? String(raw.overrideNote) : undefined, createdAt: new Date().toISOString() }; });
    const completions: CompletionEvent[] = completionsSnap.docs.map((d) => { const raw = d.data(); return { id: d.id, assignmentId: String(raw.assignmentId || ''), clientId: String(raw.clientId || clientId), dateKey: String(raw.dateKey || todayKey), completedAt: String(raw.completedAt || new Date().toISOString()), loggedValue: raw.loggedValue ? String(raw.loggedValue) : undefined, notes: raw.notes ? String(raw.notes) : undefined }; });
    const approvedRecoveryDateKeys = activitySnap.docs.filter((d) => Boolean(d.data().recoveryApproved)).map((d) => String(d.data().dateKey || ''));

    const summary = computeStreakSummary(assignments, completions, todayKey, 120, approvedRecoveryDateKeys);
    const streakRef = db.collection('streaks').doc(clientId);
    const basePayload = { id: clientId, clientId, clientUserId: String(clientData.userId || ''), trainerUserId: String(clientData.activeTrainerUserId || ''), currentStreak: summary.currentStreak, longestStreak: summary.longestStreak, lastEligibleDateKey: summary.lastEligibleDateKey || '', updatedAt: FieldValue.serverTimestamp() };

    if (streakSnap.exists) { await streakRef.update(basePayload); } else { await streakRef.set({ ...basePayload, createdAt: FieldValue.serverTimestamp() }); }

    const nowIso = new Date().toISOString();
    res.status(200).json({ ok: true, todayKey, summary, approvedRecoveryDateKeys, streak: { id: clientId, clientId, clientUserId: basePayload.clientUserId, trainerUserId: basePayload.trainerUserId, currentStreak: summary.currentStreak, longestStreak: summary.longestStreak, lastEligibleDateKey: summary.lastEligibleDateKey || undefined, createdAt: nowIso, updatedAt: nowIso } });
  } catch (error) {
    if (error instanceof AuthHttpError) { res.status(error.status).json({ ok: false, code: error.code, error: error.message }); return; }
    console.error('Streak recalculation error:', error);
    res.status(500).json({ ok: false, error: 'Unable to recalculate streak right now.' });
  }
}

// ─── main router ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const path = (req.url || '').split('?')[0].replace(/\/+$/, '');
  if (path.includes('/invites/') || path.endsWith('/resolve')) return handleInviteResolve(req, res);
  if (path.includes('/relationships/') || path.endsWith('/respond')) return handleRelationshipRespond(req, res);
  if (path.includes('/streaks/') || path.endsWith('/recalculate')) return handleStreakRecalculate(req, res);
  if (path.includes('/trainers/public') || path.endsWith('/trainers-public')) return handlePublicTrainers(req, res);
  if (path.includes('/data/save-onboarding') || path.endsWith('/save-onboarding')) return handleSaveOnboarding(req, res);
  if (path.includes('/data/create-invite') || path.endsWith('/create-invite')) return handleCreateInvite(req, res);
  res.status(404).json({ ok: false, error: 'Studio endpoint not found.' });
}
