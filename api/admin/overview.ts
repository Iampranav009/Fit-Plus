import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../_lib/firebaseAdmin.js';

const ModerationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('toggle_trainer_publish'),
    trainerId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
    isPublished: z.boolean(),
  }),
  z.object({
    action: z.literal('delete_review'),
    reviewId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  }),
]);

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    if (!authCtx.isAdmin) {
      return res.status(403).json({
        ok: false,
        code: 'auth/admin-required',
        error: 'Platform administrator access is required.',
      });
    }

    const { db } = getFirebaseAdminContext();

    if (req.method === 'POST') {
      const parsed = ModerationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          code: 'validation/invalid-input',
          error: 'Invalid moderation action payload.',
        });
      }

      const logId = `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const batch = db.batch();

      if (parsed.data.action === 'toggle_trainer_publish') {
        const { trainerId, isPublished } = parsed.data;
        const trainerRef = db.collection('trainers').doc(trainerId);
        const snap = await trainerRef.get();
        if (!snap.exists) {
          return res.status(404).json({ ok: false, error: 'Trainer profile not found.' });
        }
        batch.update(trainerRef, {
          isPublished,
          updatedAt: FieldValue.serverTimestamp(),
        });
        batch.set(db.collection('auditLogs').doc(logId), {
          id: logId,
          actorUserId: authCtx.uid,
          action: isPublished ? 'trainer_published' : 'trainer_unpublished',
          targetType: 'trainer',
          targetId: trainerId,
          summary: `${isPublished ? 'Published' : 'Unpublished'} coach storefront ${String(snap.data()?.displayName || trainerId)}.`,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const { reviewId } = parsed.data;
        const reviewRef = db.collection('reviews').doc(reviewId);
        const snap = await reviewRef.get();
        if (!snap.exists) {
          return res.status(404).json({ ok: false, error: 'Review not found.' });
        }
        batch.delete(reviewRef);
        batch.set(db.collection('auditLogs').doc(logId), {
          id: logId,
          actorUserId: authCtx.uid,
          action: 'review_removed',
          targetType: 'review',
          targetId: reviewId,
          summary: `Removed client review ${reviewId} for trainer ${String(snap.data()?.trainerId || '')}.`,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      return res.status(200).json({ ok: true });
    }

    const [
      usersSnap,
      trainersSnap,
      clientsSnap,
      relsSnap,
      subsSnap,
      paymentsSnap,
      verifsSnap,
      reviewsSnap,
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('trainers').get(),
      db.collection('clients').get(),
      db.collection('relationships').get(),
      db.collection('subscriptions').get(),
      db.collection('payments').get(),
      db.collection('verificationRequests').get(),
      db.collection('reviews').get(),
    ]);

    const activeRelByTrainer = new Map<string, number>();
    let activeRelationships = 0;
    relsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'active') {
        activeRelationships += 1;
        const tId = String(data.trainerId || '');
        activeRelByTrainer.set(tId, (activeRelByTrainer.get(tId) || 0) + 1);
      }
    });

    let publishedTrainers = 0;
    let verifiedTrainers = 0;
    const trainersSummary = trainersSnap.docs.map((doc) => {
      const d = doc.data();
      const isPublished = d.isPublished !== false;
      const verificationStatus: 'unverified' | 'pending' | 'verified' =
        d.verificationStatus === 'verified' || d.verificationStatus === 'pending'
          ? d.verificationStatus
          : 'unverified';
      if (isPublished) publishedTrainers += 1;
      if (verificationStatus === 'verified') verifiedTrainers += 1;
      return {
        id: doc.id,
        userId: String(d.userId || ''),
        displayName: String(d.displayName || 'Coach'),
        city: String(d.city || ''),
        verificationStatus,
        isPublished,
        activeClientsCount: activeRelByTrainer.get(doc.id) || 0,
      };
    });

    let activeSubscriptions = 0;
    subsSnap.docs.forEach((doc) => {
      if (doc.data().status === 'active') activeSubscriptions += 1;
    });

    let capturedRevenueInr = 0;
    let capturedPaymentsCount = 0;
    paymentsSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.status === 'captured') {
        capturedPaymentsCount += 1;
        capturedRevenueInr += Number(d.amountInr || 0);
      }
    });

    const pendingVerifications = verifsSnap.docs.filter((d) => d.data().status === 'pending').length;

    const recentReviews = reviewsSnap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          trainerId: String(d.trainerId || ''),
          clientId: String(d.clientId || ''),
          clientUserId: String(d.clientUserId || ''),
          relationshipId: String(d.relationshipId || ''),
          authorName: String(d.authorName || 'FitPlus Member'),
          rating: Number(d.rating || 5),
          comment: String(d.comment || ''),
          createdAt: toIso(d.createdAt),
          updatedAt: toIso(d.updatedAt),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 25);

    return res.status(200).json({
      ok: true,
      overview: {
        totalUsers: usersSnap.size,
        totalTrainers: trainersSnap.size,
        publishedTrainers,
        verifiedTrainers,
        totalClients: clientsSnap.size,
        activeRelationships,
        activeSubscriptions,
        capturedRevenueInr,
        capturedPaymentsCount,
        pendingVerifications,
        totalReviews: reviewsSnap.size,
        trainersSummary,
        recentReviews,
      },
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Admin overview error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to load admin overview.' });
  }
}
