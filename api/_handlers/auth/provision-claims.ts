import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient } from '../../_lib/supabaseAdmin.js';
import { applySecurityHeaders } from '../../_lib/security.js';
import { AuthHttpError, verifyAuthenticatedRequest } from '../../_lib/requestAuth.js';

/**
 * POST /api/auth/provision-claims
 *
 * Session bootstrap: verifies the caller's Supabase access token and returns
 * their app_users row (creating it if the signup trigger has not), read with
 * the service role so RLS can never hide it. Roles come only from the database.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const sb = getSupabaseAdminClient();

    let { data: row } = await sb.from('app_users').select('*').eq('firebase_uid', authCtx.uid).maybeSingle();

    if (!row) {
      const parts = (authCtx.name || authCtx.email.split('@')[0] || 'FitPlus Member').trim().split(/\s+/);
      const { data: created, error } = await sb
        .from('app_users')
        .upsert(
          {
            firebase_uid: authCtx.uid,
            first_name: parts[0] || 'Member',
            last_name: parts.slice(1).join(' '),
            email: authCtx.email || `${authCtx.uid}@fitplus.local`,
            role: authCtx.isAdmin ? 'admin' : 'client',
            timezone: 'Asia/Kolkata',
            onboarding_completed: false,
          },
          { onConflict: 'firebase_uid' },
        )
        .select('*')
        .single();
      if (error) {
        console.error('app_users bootstrap insert failed:', error.message);
        return res.status(500).json({ ok: false, error: 'Could not create your account record.' });
      }
      row = created;
    }

    return res.status(200).json({
      ok: true,
      claims: {
        role: 'authenticated',
        is_trainer: authCtx.role === 'trainer',
        is_admin: authCtx.isAdmin,
        user_role: authCtx.role,
      },
      bootstrap: row,
    });
  } catch (err: unknown) {
    if (err instanceof AuthHttpError) {
      return res.status(err.status).json({ ok: false, code: err.code, error: err.message });
    }
    console.error('Session bootstrap failed:', err instanceof Error ? err.message : err);
    return res.status(500).json({ ok: false, error: 'Session bootstrap failed.' });
  }
}
