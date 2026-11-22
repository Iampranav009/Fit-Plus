import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestoreAdminContext, isFirebaseAdminConfigured } from '../../_lib/firestoreAdmin.js';
import { verifyFirebaseIdToken } from '../../_lib/firebaseAuth.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../_lib/supabaseAdmin.js';
import { applySecurityHeaders } from '../../_lib/security.js';

/**
 * POST /api/auth/provision-claims
 * 
 * Verifies the caller's Firebase ID token and provisions custom claims:
 *   - role: 'authenticated' (required by Supabase PostgreSQL RLS)
 *   - is_trainer: boolean
 *   - is_admin: boolean
 *   - user_role: 'client' | 'trainer' | 'admin'
 * 
 * Strictly ignores/rejects any role parameters provided in the request body.
 * Roles are resolved authoritatively from Supabase app_users and platform_admins.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const rawAuth = req.headers.authorization;
  if (!rawAuth || !rawAuth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing Bearer token.' });
  }

  const idToken = rawAuth.slice('Bearer '.length).trim();
  if (!idToken) {
    return res.status(401).json({ ok: false, error: 'Empty token.' });
  }

  try {
    let decoded;
    let authAdmin: any = null;
    let existingClaims: Record<string, unknown> = {};

    if (isFirebaseAdminConfigured()) {
      const { app } = getFirestoreAdminContext();
      const { getAuth } = await import('firebase-admin/auth');
      authAdmin = getAuth(app);
      decoded = await authAdmin.verifyIdToken(idToken, true);
      try {
        const userRecord = await authAdmin.getUser(decoded.uid);
        existingClaims = userRecord.customClaims || {};
      } catch {
        // proceed with empty existing claims
      }
    } else {
      decoded = await verifyFirebaseIdToken(idToken);
    }

    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();

    // Authoritative resolution of role & admin status from Supabase
    const bootstrapAdminEmail = (
      process.env.FITPLUS_ADMIN_EMAIL || 'pranavshindeji5001@gmail.com'
    ).toLowerCase();

    let isAdmin = Boolean(email) && email === bootstrapAdminEmail;
    let storedRole: string | undefined;
    let bootstrapRow: Record<string, unknown> | null = null;

    if (isSupabaseAdminConfigured()) {
      try {
        const sb = getSupabaseAdminClient();
        const [userRes, adminRes] = await Promise.all([
          sb.from('app_users').select('*').eq('firebase_uid', uid).maybeSingle(),
          sb.from('platform_admins').select('firebase_uid').eq('firebase_uid', uid).maybeSingle(),
        ]);
        if (userRes.data) {
          storedRole = userRes.data.role;
          bootstrapRow = userRes.data as Record<string, unknown>;
        }
        if (adminRes.data?.firebase_uid) {
          isAdmin = true;
        }
      } catch (sbErr) {
        console.warn('Supabase query failed during claim provisioning, falling back:', sbErr);
      }
    }

    // Fallback to Firestore if Supabase did not find the user
    if (!storedRole && isFirebaseAdminConfigured()) {
      try {
        const { db } = getFirestoreAdminContext();
        if (db) {
          const [userSnap, adminSnap] = await Promise.all([
            db.collection('users').doc(uid).get(),
            db.collection('admins').doc(uid).get(),
          ]);
          storedRole = userSnap.data()?.role;
          if (adminSnap.exists) isAdmin = true;
        }
      } catch {
        // Fallback gracefully
      }
    }

    const isTrainer = storedRole === 'trainer';
    const userRole: 'client' | 'trainer' | 'admin' = isAdmin
      ? 'admin'
      : isTrainer
        ? 'trainer'
        : 'client';

    // Create app_users row if it doesn't exist (server-side, bypasses RLS)
    if (!bootstrapRow && isSupabaseAdminConfigured()) {
      try {
        const sb = getSupabaseAdminClient();
        const displayName = decoded.name || decoded.email || 'FitPlus Member';
        const parts = String(displayName).trim().split(/\s+/);
        const { data: newRow } = await sb.from('app_users').upsert({
          firebase_uid: uid,
          first_name: parts[0] || 'Member',
          last_name: parts.slice(1).join(' ') || '',
          email: email || `${uid}@fitplus.local`,
          role: userRole,
          timezone: 'Asia/Kolkata',
          onboarding_completed: false,
        }, { onConflict: 'firebase_uid' }).select('*').single();
        if (newRow) bootstrapRow = newRow as Record<string, unknown>;
      } catch {
        // best-effort
      }
    }

    // If Firebase Admin is available to set custom claims on the user account
    if (authAdmin) {
      const alreadyCurrent =
        existingClaims.role === 'authenticated' &&
        Boolean(existingClaims.is_trainer) === isTrainer &&
        Boolean(existingClaims.is_admin) === isAdmin &&
        existingClaims.user_role === userRole;

      if (!alreadyCurrent) {
        const updatedClaims = {
          ...existingClaims,
          role: 'authenticated', // Required for Supabase PostgreSQL RLS
          is_trainer: isTrainer,
          is_admin: isAdmin,
          user_role: userRole,
        };

        await authAdmin.setCustomUserClaims(uid, updatedClaims);

        return res.status(200).json({
          ok: true,
          success: true,
          claimsUpdated: true,
          claims: {
            role: 'authenticated',
            is_trainer: isTrainer,
            is_admin: isAdmin,
            user_role: userRole,
          },
          bootstrap: bootstrapRow,
          message: 'Successfully provisioned custom claims.',
        });
      }

      return res.status(200).json({
        ok: true,
        success: true,
        claimsUpdated: false,
        claims: {
          role: 'authenticated',
          is_trainer: isTrainer,
          is_admin: isAdmin,
          user_role: userRole,
        },
        bootstrap: bootstrapRow,
        message: 'Claims already up to date.',
      });
    }

    // Return authoritative role resolved from Supabase
    return res.status(200).json({
      ok: true,
      success: true,
      claimsUpdated: false,
      claims: {
        role: 'authenticated',
        is_trainer: isTrainer,
        is_admin: isAdmin,
        user_role: userRole,
      },
      bootstrap: bootstrapRow,
      message: 'Authoritative role resolved from Supabase.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to provision claims';
    console.error('Error provisioning Firebase custom claims:', message);
    return res.status(500).json({ ok: false, error: 'Claim provisioning failed.' });
  }
}
