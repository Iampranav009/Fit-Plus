import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../_lib/firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const { app, db } = getFirebaseAdminContext();
    const uid = authCtx.uid;

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
      batch.update(d.ref, { acceptingClients: false, updatedAt: FieldValue.serverTimestamp() });
    }
    for (const d of notificationsSnap.docs) {
      batch.delete(d.ref);
    }

    const auditRef = db.collection('auditLogs').doc(`audit_del_${Date.now().toString(36)}`);
    batch.set(auditRef, {
      id: auditRef.id,
      actorUserId: uid,
      action: 'account_deleted',
      targetType: 'user',
      targetId: uid,
      summary: 'User initiated self-service account deletion.',
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    await getAuth(app).deleteUser(uid);

    return res.status(200).json({ ok: true, deletedUid: uid });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Account delete failed:', error);
    return res.status(500).json({ ok: false, error: 'Unable to delete account right now.' });
  }
}
