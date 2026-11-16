import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminContext, isFirebaseAdminConfigured } from '../../_lib/firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const rawToken = typeof req.query.token === 'string' ? req.query.token.trim().toUpperCase() : '';
  if (!rawToken || rawToken.length > 64 || !/^[A-Z0-9_\-]+$/.test(rawToken)) {
    return res.status(400).json({ ok: false, state: 'not_found', error: 'Invalid invite token format.' });
  }

  if (!isFirebaseAdminConfigured()) {
    return res.status(200).json({ ok: true, source: 'client_fallback', state: 'unverified_server' });
  }

  try {
    const { db } = getFirebaseAdminContext();
    const inviteSnap = await db.collection('invites').doc(rawToken).get();
    if (!inviteSnap.exists) {
      return res.status(200).json({ ok: true, state: 'not_found' });
    }

    const inv = inviteSnap.data()!;
    const trainerSnap = inv.trainerId
      ? await db.collection('trainers').doc(String(inv.trainerId)).get()
      : null;
    const pkgQuery = inv.trainerId
      ? await db
          .collection('packages')
          .where('trainerId', '==', String(inv.trainerId))
          .where('status', '==', 'active')
          .get()
      : null;

    const trainer = trainerSnap?.exists
      ? {
          id: trainerSnap.id,
          slug: trainerSnap.data()!.slug,
          displayName: trainerSnap.data()!.displayName,
          headline: trainerSnap.data()!.headline,
          city: trainerSnap.data()!.city,
          languages: trainerSnap.data()!.languages || [],
          experienceYears: trainerSnap.data()!.experienceYears || 1,
          avatarKey: trainerSnap.data()!.avatarKey || 'coachArjun',
          coverKey: trainerSnap.data()!.coverKey || 'coachCover',
          isVerified: Boolean(trainerSnap.data()!.verificationStatus === 'verified'),
        }
      : null;

    const packages = (pkgQuery?.docs || []).map((docSnap) => {
      const p = docSnap.data();
      return {
        id: docSnap.id,
        trainerId: p.trainerId,
        name: p.name,
        summary: p.summary,
        priceInr: p.priceInr,
        cadence: p.cadence,
        features: p.features || [],
        status: p.status,
      };
    });

    const expiresAt = String(inv.expiresAt || '');
    const todayKey = new Date().toISOString().slice(0, 10);
    let state: 'active' | 'expired' | 'redeemed' | 'revoked' = inv.status || 'active';
    if (state === 'active' && expiresAt && expiresAt.slice(0, 10) < todayKey) {
      state = 'expired';
    }

    return res.status(200).json({
      ok: true,
      source: 'firestore_admin',
      state,
      invite: {
        id: inviteSnap.id,
        token: inv.token || inviteSnap.id,
        trainerId: inv.trainerId,
        suggestedPackageId: inv.suggestedPackageId || undefined,
        status: state,
        expiresAt,
      },
      trainer,
      packages,
    });
  } catch (error) {
    console.error('Invite resolve error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to resolve invitation.' });
  }
}
