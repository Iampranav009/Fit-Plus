import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../_lib/firebaseAdmin.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../_lib/supabaseAdmin.js';
import { applySecurityHeaders, sanitizeErrorMessage } from '../_lib/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const { app, db } = getFirebaseAdminContext();
    const uid = authCtx.uid;

    // 1. Purge Supabase Storage files
    if (isSupabaseAdminConfigured()) {
      const sb = getSupabaseAdminClient();
      const userBuckets = [
        'profile-avatars',
        'progress-photos',
        'verification-documents',
        'public-trainer-assets',
      ];

      for (const bucket of userBuckets) {
        try {
          const { data: files } = await sb.storage.from(bucket).list(uid);
          if (files && files.length > 0) {
            const paths = files.map((f) => `${uid}/${f.name}`);
            await sb.storage.from(bucket).remove(paths);
          }
        } catch (storageErr) {
          console.warn(`Storage cleanup failed for bucket ${bucket}:`, storageErr);
        }
      }

      // 2. Explicitly purge all relational records across Supabase tables
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

        // Insert compliance audit log
        await sb.from('audit_logs').insert({
          id: `audit_del_${Date.now().toString(36)}`,
          actor_user_id: null,
          action: 'account_deleted',
          target_resource: `user:${uid}`,
          details: { summary: 'User initiated self-service account deletion (DPDP compliance).' },
        });

        // Finally delete from app_users
        await sb.from('app_users').delete().eq('firebase_uid', uid);
      } catch (dbErr) {
        console.error('Supabase PostgreSQL record purge error:', dbErr);
      }
    }

    // 3. Fallback/Dual-write cleanup for cold Firestore records if configured
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

        for (const d of clientsSnap.docs) {
          batch.delete(d.ref);
        }
        for (const d of trainersSnap.docs) {
          batch.delete(d.ref);
        }
        for (const d of notificationsSnap.docs) {
          batch.delete(d.ref);
        }

        await batch.commit();
      } catch (fsErr) {
        console.warn('Firestore fallback cleanup skipped:', fsErr);
      }
    }

    // 4. Delete user from Firebase Auth
    const { getAuth } = await import('firebase-admin/auth');
    await getAuth(app).deleteUser(uid);

    return res.status(200).json({ ok: true, deletedUid: uid });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Account delete failed:', error);
    const message = sanitizeErrorMessage(error, 'Unable to delete account right now.');
    return res.status(500).json({ ok: false, error: message });
  }
}
