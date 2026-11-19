import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const rawToken = typeof req.query.token === 'string' ? req.query.token.trim().toUpperCase() : '';
  if (!rawToken || rawToken.length > 64 || !/^[A-Z0-9_\-]+$/.test(rawToken)) {
    return res.status(400).json({ ok: false, state: 'not_found', error: 'Invalid invite token format.' });
  }

  if (!isSupabaseAdminConfigured()) {
    return res.status(200).json({ ok: true, source: 'client_fallback', state: 'unverified_server' });
  }

  try {
    const db = getSupabaseAdminClient();

    const { data: inv } = await db
      .from('trainer_invites')
      .select('*')
      .eq('token', rawToken)
      .maybeSingle();

    if (!inv) {
      return res.status(200).json({ ok: true, state: 'not_found' });
    }

    if (inv.status === 'revoked') {
      return res.status(200).json({ ok: true, source: 'supabase_admin', state: 'revoked' });
    }
    if (inv.status === 'redeemed') {
      return res.status(200).json({ ok: true, source: 'supabase_admin', state: 'redeemed' });
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const isExpired = inv.expires_at && inv.expires_at.slice(0, 10) < todayKey;
    const state = isExpired ? 'expired' : 'active';

    const [trRes, pkgRes] = await Promise.all([
      db.from('trainer_profiles').select('*').eq('user_id', inv.trainer_user_id).maybeSingle(),
      db.from('coaching_packages').select('*').eq('trainer_user_id', inv.trainer_user_id).eq('status', 'active'),
    ]);

    const tr = trRes.data;
    const trainer = tr
      ? {
          id: tr.id,
          slug: tr.slug,
          displayName: tr.display_name,
          headline: tr.headline,
          bio: tr.bio,
          city: tr.city,
          coachingMode: tr.coaching_mode,
          specialties: tr.specialties || [],
          languages: tr.languages || [],
          certifications: tr.certifications || [],
          experienceYears: tr.experience_years || 1,
          avatarKey: tr.avatar_key || '',
          coverKey: tr.cover_key || '',
          photoUrl: tr.photo_url || undefined,
          verificationStatus: tr.verification_status || 'unverified',
          isDemoVerified: tr.is_demo_verified || false,
          isPublished: tr.is_published,
          acceptingClients: tr.accepting_clients,
          whatsappBusinessE164: tr.whatsapp_business_e164 || undefined,
        }
      : null;

    const packages = (pkgRes.data || []).map((p) => ({
      id: p.id,
      trainerId: p.trainer_id,
      name: p.name,
      summary: p.summary || '',
      priceInr: p.price_inr,
      cadence: p.cadence,
      features: p.features || [],
      status: p.status,
    }));

    return res.status(200).json({
      ok: true,
      source: 'supabase_admin',
      state,
      invite: {
        id: inv.id,
        token: inv.token,
        trainerId: inv.trainer_id,
        clientEmailOrLabel: inv.client_email_or_label,
        suggestedPackageId: inv.suggested_package_id || undefined,
        status: state,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      },
      trainer,
      packages,
    });
  } catch (error) {
    console.error('Invite resolve error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to resolve invitation.' });
  }
}
