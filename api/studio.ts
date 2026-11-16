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

  if (!isFirebaseAdminConfigured()) { res.status(200).json({ ok: true, source: 'client_fallback', state: 'unverified_server' }); return; }

  try {
    const { db } = getFirestoreAdminContext();
    const inviteSnap = await db.collection('invites').doc(rawToken).get();
    if (!inviteSnap.exists) { res.status(200).json({ ok: true, state: 'not_found' }); return; }

    const inv = inviteSnap.data()!;
    const trainerSnap = inv.trainerId ? await db.collection('trainers').doc(String(inv.trainerId)).get() : null;
    const pkgQuery = inv.trainerId ? await db.collection('packages').where('trainerId', '==', String(inv.trainerId)).where('status', '==', 'active').get() : null;

    const trainer = trainerSnap?.exists ? { id: trainerSnap.id, slug: trainerSnap.data()!.slug, displayName: trainerSnap.data()!.displayName, headline: trainerSnap.data()!.headline, city: trainerSnap.data()!.city, languages: trainerSnap.data()!.languages || [], experienceYears: trainerSnap.data()!.experienceYears || 1, avatarKey: trainerSnap.data()!.avatarKey || 'coachArjun', coverKey: trainerSnap.data()!.coverKey || 'coachCover', isVerified: Boolean(trainerSnap.data()!.verificationStatus === 'verified') } : null;
    const packages = (pkgQuery?.docs || []).map((docSnap) => { const p = docSnap.data(); return { id: docSnap.id, trainerId: p.trainerId, name: p.name, summary: p.summary, priceInr: p.priceInr, cadence: p.cadence, features: p.features || [], status: p.status }; });

    const expiresAt = String(inv.expiresAt || '');
    const todayKey = new Date().toISOString().slice(0, 10);
    let state: 'active' | 'expired' | 'redeemed' | 'revoked' = inv.status || 'active';
    if (state === 'active' && expiresAt && expiresAt.slice(0, 10) < todayKey) state = 'expired';

    res.status(200).json({ ok: true, source: 'firestore_admin', state, invite: { id: inviteSnap.id, token: inv.token || inviteSnap.id, trainerId: inv.trainerId, suggestedPackageId: inv.suggestedPackageId || undefined, status: state, expiresAt }, trainer, packages });
  } catch (error) {
    console.error('Invite resolve error:', error);
    res.status(500).json({ ok: false, error: 'Unable to resolve invitation.' });
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
  res.status(404).json({ ok: false, error: 'Studio endpoint not found.' });
}
