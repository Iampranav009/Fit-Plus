/**
 * api/account.ts
 *
 * Consolidated router for account management endpoints.
 * Replaces 2 separate functions with 1.
 *
 * Routes handled:
 *   POST /api/account/delete
 *   GET  /api/account/export
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from './_lib/firebaseAdmin.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './_lib/supabaseAdmin.js';
import { applySecurityHeaders, sanitizeErrorMessage } from './_lib/security.js';

// ─── route: POST /api/account/delete ─────────────────────────────────────────
async function handleDelete(req: VercelRequest, res: VercelResponse): Promise<void> {
  applySecurityHeaders(res);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const { app, db } = getFirebaseAdminContext();
    const uid = authCtx.uid;

    if (isSupabaseAdminConfigured()) {
      const sb = getSupabaseAdminClient();
      for (const bucket of ['profile-avatars', 'progress-photos', 'verification-documents', 'public-trainer-assets']) {
        try {
          const { data: files } = await sb.storage.from(bucket).list(uid);
          if (files?.length) await sb.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
        } catch (storageErr) { console.warn(`Storage cleanup failed for bucket ${bucket}:`, storageErr); }
      }
      try {
        await Promise.allSettled([
          sb.from('scheduled_reminders').delete().eq('recipient_user_id', uid),
          sb.from('notifications').delete().eq('recipient_user_id', uid),
          sb.from('daily_activity').delete().eq('client_user_id', uid),
          sb.from('streak_records').delete().eq('client_user_id', uid),
          sb.from('achievement_unlocks').delete().eq('client_user_id', uid),
          sb.from('progress_events').delete().eq('client_user_id', uid),
          sb.from('weekly_check_ins').delete().eq('client_user_id', uid),
          sb.from('nutrition_diary_entries').delete().eq('client_user_id', uid),
          sb.from('workout_sessions').delete().eq('client_user_id', uid),
          sb.from('chat_messages').delete().eq('sender_user_id', uid),
          sb.from('client_group_members').delete().eq('client_user_id', uid),
          sb.from('client_group_members').delete().eq('trainer_user_id', uid),
          sb.from('client_groups').delete().eq('trainer_user_id', uid),
          sb.from('consultation_bookings').delete().or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
          sb.from('consultation_slots').delete().eq('trainer_user_id', uid),
          sb.from('coaching_relationships').delete().or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
          sb.from('trainer_invites').delete().eq('trainer_user_id', uid),
          sb.from('trainer_verification_requests').delete().eq('trainer_user_id', uid),
          sb.from('trainer_reviews').delete().or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
          sb.from('consent_records').delete().eq('user_id', uid),
          sb.from('client_profiles').delete().eq('user_id', uid),
          sb.from('trainer_profiles').delete().eq('user_id', uid),
        ]);
        await sb.from('audit_logs').insert({ id: `audit_del_${Date.now().toString(36)}`, actor_user_id: null, action: 'account_deleted', target_resource: `user:${uid}`, details: { summary: 'User initiated self-service account deletion (DPDP compliance).' } });
        await sb.from('app_users').delete().eq('firebase_uid', uid);
      } catch (dbErr) { console.error('Supabase PostgreSQL record purge error:', dbErr); }
    }

    if (db) {
      try {
        const batch = db.batch();
        batch.delete(db.collection('users').doc(uid).collection('private').doc('contact'));
        batch.delete(db.collection('users').doc(uid));
        const [clientsSnap, trainersSnap, notificationsSnap] = await Promise.all([
          db.collection('clients').where('userId', '==', uid).get(),
          db.collection('trainers').where('userId', '==', uid).get(),
          db.collection('notifications').where('recipientUserId', '==', uid).get(),
        ]);
        for (const d of clientsSnap.docs) batch.delete(d.ref);
        for (const d of trainersSnap.docs) batch.delete(d.ref);
        for (const d of notificationsSnap.docs) batch.delete(d.ref);
        await batch.commit();
      } catch (fsErr) { console.warn('Firestore fallback cleanup skipped:', fsErr); }
    }

    const { getAuth } = await import('firebase-admin/auth');
    await getAuth(app).deleteUser(uid);
    res.status(200).json({ ok: true, deletedUid: uid });
  } catch (error) {
    if (error instanceof AuthHttpError) { res.status(error.status).json({ ok: false, code: error.code, error: error.message }); return; }
    console.error('Account delete failed:', error);
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(error, 'Unable to delete account right now.') });
  }
}

// ─── route: GET /api/account/export ──────────────────────────────────────────
async function handleExport(req: VercelRequest, res: VercelResponse): Promise<void> {
  applySecurityHeaders(res);
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const uid = authCtx.uid;
    if (!isSupabaseAdminConfigured()) { res.status(503).json({ ok: false, error: 'Database service unavailable' }); return; }

    const sb = getSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const [userRes, clientProfileRes, trainerProfileRes, workoutsRes, nutritionRes, checkInsRes, progressRes, paymentsRes, conversationsRes, messagesRes, consentsRes, dailyMetricsRes] = await Promise.all([
      sb.from('app_users').select('*').eq('firebase_uid', uid).maybeSingle(),
      sb.from('client_profiles').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('trainer_profiles').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('workout_sessions').select('*').eq('client_user_id', uid),
      sb.from('nutrition_diary_entries').select('*').eq('client_user_id', uid),
      sb.from('weekly_check_ins').select('*').eq('client_user_id', uid),
      sb.from('progress_events').select('*').eq('client_user_id', uid),
      sb.from('payment_records').select('*').eq('client_user_id', uid),
      sb.from('chat_conversations').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
      sb.from('chat_messages').select('*').eq('sender_user_id', uid),
      sb.from('consent_records').select('*').eq('user_id', uid),
      sb.from('daily_activity').select('*').eq('client_user_id', uid),
    ]);

    const exportBundle = {
      compliance: 'Digital Personal Data Protection Act (DPDP), 2023',
      exported_at: nowIso, exportedAt: nowIso,
      profile: { account: userRes.data || { firebase_uid: uid, email: authCtx.email }, client: clientProfileRes.data || null, trainer: trainerProfileRes.data || null },
      workouts: workoutsRes.data || [], nutrition: nutritionRes.data || [], checkins: checkInsRes.data || [],
      messages: messagesRes.data || [], consents: consentsRes.data || [], daily_metrics: dailyMetricsRes.data || [],
      progress_events: progressRes.data || [], payments: paymentsRes.data || [], conversations: conversationsRes.data || [],
      account: userRes.data || { firebase_uid: uid, email: authCtx.email },
      healthAndFitness: { workoutSessions: workoutsRes.data || [], nutritionLogs: nutritionRes.data || [], weeklyCheckIns: checkInsRes.data || [], progressMetrics: progressRes.data || [] },
      financialRecords: paymentsRes.data || [], conversationsSummary: conversationsRes.data || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="fitplus_data_export_${uid}.json"`);
    res.status(200).json({ ok: true, data: exportBundle });
  } catch (error) {
    if (error instanceof AuthHttpError) { res.status(error.status).json({ ok: false, code: error.code, error: error.message }); return; }
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(error, 'Failed to export account data') });
  }
}

// ─── main router ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const path = (req.url || '').split('?')[0].replace(/\/+$/, '');
  if (path.endsWith('/delete')) return handleDelete(req, res);
  if (path.endsWith('/export')) return handleExport(req, res);
  res.status(404).json({ ok: false, error: 'Account endpoint not found.' });
}
