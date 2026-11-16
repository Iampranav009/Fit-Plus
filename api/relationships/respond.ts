import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../_lib/firebaseAdmin.js';

const RespondSchema = z.object({
  relationshipId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  action: z.enum(['accept', 'decline']),
  packageId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = RespondSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'validation/invalid-input',
        error: 'Invalid relationship response payload.',
      });
    }

    const { relationshipId, action, packageId } = parsed.data;
    const { db } = getFirebaseAdminContext();

    const relRef = db.collection('relationships').doc(relationshipId);
    const relSnap = await relRef.get();
    if (!relSnap.exists) {
      return res.status(404).json({ ok: false, code: 'relationship/not-found', error: 'Coaching request not found.' });
    }

    const rel = relSnap.data()!;
    if (rel.trainerUserId !== authCtx.uid && !authCtx.isAdmin) {
      return res.status(403).json({
        ok: false,
        code: 'auth/forbidden',
        error: 'Only the invited coach can respond to this request.',
      });
    }

    if (rel.status !== 'pending') {
      return res.status(409).json({
        ok: false,
        code: 'relationship/already-resolved',
        error: `This coaching request is already ${rel.status}.`,
      });
    }

    const clientId = String(rel.clientId);
    const clientRef = db.collection('clients').doc(clientId);
    const [clientSnap, trainerSnap] = await Promise.all([
      clientRef.get(),
      db.collection('trainers').doc(String(rel.trainerId)).get(),
    ]);

    if (!clientSnap.exists) {
      return res.status(404).json({ ok: false, code: 'client/not-found', error: 'Client profile not found.' });
    }

    const trainerDisplayName = String(trainerSnap.data()?.displayName || 'Your FitPlus coach');
    const nowIso = new Date().toISOString();
    const batch = db.batch();

    if (action === 'accept') {
      const existingActiveRelId = String(clientSnap.data()?.activeRelationshipId || '');
      if (existingActiveRelId && existingActiveRelId !== relationshipId) {
        batch.update(db.collection('relationships').doc(existingActiveRelId), {
          status: 'ended',
          endedAt: nowIso,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      batch.update(relRef, {
        status: 'active',
        ...(packageId ? { packageId } : {}),
        startedAt: nowIso,
        updatedAt: FieldValue.serverTimestamp(),
      });

      batch.update(clientRef, {
        activeTrainerUserId: String(rel.trainerUserId),
        activeRelationshipId: relationshipId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const ntfId = `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      batch.set(db.collection('notifications').doc(ntfId), {
        id: ntfId,
        recipientUserId: String(rel.clientUserId),
        senderUserId: authCtx.uid,
        title: 'Coaching request accepted',
        body: `${trainerDisplayName} accepted your coaching request. Check Today & Plan to begin.`,
        category: 'invite',
        read: false,
        actionRoute: '/app/today',
        relatedClientId: clientId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      batch.update(relRef, {
        status: 'ended',
        endedAt: nowIso,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const ntfId = `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      batch.set(db.collection('notifications').doc(ntfId), {
        id: ntfId,
        recipientUserId: String(rel.clientUserId),
        senderUserId: authCtx.uid,
        title: 'Coaching request update',
        body: `${trainerDisplayName} is unable to take new requests right now. Explore other coaches on Discover.`,
        category: 'invite',
        read: false,
        actionRoute: '/discover',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return res.status(200).json({
      ok: true,
      relationshipId,
      status: action === 'accept' ? 'active' : 'ended',
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Relationship respond error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to process coaching request right now.' });
  }
}
