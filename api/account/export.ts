import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthHttpError, verifyAuthenticatedRequest } from '../_lib/firebaseAdmin.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../_lib/supabaseAdmin.js';

/**
 * GET /api/account/export
 * DPDP Act 2023 Compliant Personal Data Portability Endpoint
 * Exports all user data strictly bounded to the authenticated caller's identity.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const uid = authCtx.uid;

    if (!isSupabaseAdminConfigured()) {
      return res.status(503).json({ ok: false, error: 'Database service unavailable' });
    }

    const sb = getSupabaseAdminClient();

    const [
      userRes,
      clientProfileRes,
      trainerProfileRes,
      workoutsRes,
      nutritionRes,
      checkInsRes,
      progressRes,
      paymentsRes,
      conversationsRes,
    ] = await Promise.all([
      sb.from('app_users').select('*').eq('firebase_uid', uid).maybeSingle(),
      sb.from('client_profiles').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('trainer_profiles').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('workout_sessions').select('*').eq('client_user_id', uid),
      sb.from('nutrition_diary_entries').select('*').eq('client_user_id', uid),
      sb.from('weekly_check_ins').select('*').eq('client_user_id', uid),
      sb.from('progress_events').select('*').eq('client_user_id', uid),
      sb.from('payment_records').select('*').eq('client_user_id', uid),
      sb.from('chat_conversations').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    ]);

    const exportBundle = {
      compliance: 'Digital Personal Data Protection Act (DPDP), 2023',
      exportedAt: new Date().toISOString(),
      account: userRes.data || { firebase_uid: uid, email: authCtx.email },
      profile: {
        client: clientProfileRes.data || null,
        trainer: trainerProfileRes.data || null,
      },
      healthAndFitness: {
        workoutSessions: workoutsRes.data || [],
        nutritionLogs: nutritionRes.data || [],
        weeklyCheckIns: checkInsRes.data || [],
        progressMetrics: progressRes.data || [],
      },
      financialRecords: paymentsRes.data || [],
      conversationsSummary: conversationsRes.data || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="fitplus_data_export_${uid}.json"`);
    return res.status(200).json({ ok: true, data: exportBundle });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Failed to export account data';
    return res.status(500).json({ ok: false, error: message });
  }
}
