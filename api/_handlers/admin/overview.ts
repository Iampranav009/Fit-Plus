import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  AuthHttpError,
  verifyAuthenticatedRequest,
} from '../../_lib/firebaseAdmin.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../_lib/supabaseAdmin.js';
import { getFirestoreAdminContext } from '../../_lib/firestoreAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

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
  z.object({
    action: z.literal('set_feature_flag'),
    flagKey: z.string().min(1).max(64),
    isEnabled: z.boolean(),
  }),
]);

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

    const sb = isSupabaseAdminConfigured() ? getSupabaseAdminClient() : null;

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
      const now = new Date().toISOString();

      if (parsed.data.action === 'toggle_trainer_publish') {
        const { trainerId, isPublished } = parsed.data;
        if (sb) {
          await sb.from('trainer_profiles').update({ is_published: isPublished }).eq('id', trainerId);
          await sb.from('audit_logs').insert({
            id: logId,
            actor_user_id: authCtx.uid,
            action: isPublished ? 'trainer_published' : 'trainer_unpublished',
            target_resource: `trainer:${trainerId}`,
            details: { isPublished } as unknown as import('../../../src/types/database.types.js').Json,
          });
        }
      } else if (parsed.data.action === 'delete_review') {
        const { reviewId } = parsed.data;
        if (sb) {
          await sb.from('trainer_reviews').delete().eq('id', reviewId);
          await sb.from('audit_logs').insert({
            id: logId,
            actor_user_id: authCtx.uid,
            action: 'review_removed',
            target_resource: `review:${reviewId}`,
          });
        }
      } else if (parsed.data.action === 'set_feature_flag') {
        const { flagKey, isEnabled } = parsed.data;
        if (sb) {
          await sb.from('feature_flags').upsert({
            flag_key: flagKey,
            is_enabled: isEnabled,
            updated_at: now,
          });
          await sb.from('audit_logs').insert({
            id: logId,
            actor_user_id: authCtx.uid,
            action: 'feature_flag_updated',
            target_resource: `flag:${flagKey}`,
            details: { isEnabled } as unknown as import('../../../src/types/database.types.js').Json,
          });
        }
      }

      return res.status(200).json({ ok: true });
    }

    // GET Overview Data - Prefer Supabase
    if (sb) {
      const [
        usersRes,
        trainersRes,
        clientsRes,
        relsRes,
        subsRes,
        paymentsRes,
        verifsRes,
        reviewsRes,
        flagsRes,
      ] = await Promise.all([
        sb.from('app_users').select('*', { count: 'exact', head: true }),
        sb.from('trainer_profiles').select('*'),
        sb.from('client_profiles').select('*', { count: 'exact', head: true }),
        sb.from('coaching_relationships').select('*'),
        sb.from('subscriptions').select('*'),
        sb.from('payment_records').select('*'),
        sb.from('trainer_verification_requests').select('*'),
        sb.from('trainer_reviews').select('*').order('created_at', { ascending: false }).limit(25),
        sb.from('feature_flags').select('*'),
      ]);

      const activeRelByTrainer = new Map<string, number>();
      let activeRelationships = 0;
      (relsRes.data || []).forEach((r) => {
        if (r.status === 'active') {
          activeRelationships += 1;
          const tId = r.trainer_id;
          activeRelByTrainer.set(tId, (activeRelByTrainer.get(tId) || 0) + 1);
        }
      });

      let publishedTrainers = 0;
      let verifiedTrainers = 0;
      const trainersSummary = (trainersRes.data || []).map((t) => {
        if (t.is_published) publishedTrainers += 1;
        if (t.verification_status === 'verified') verifiedTrainers += 1;
        return {
          id: t.id,
          userId: t.user_id,
          displayName: t.display_name,
          city: t.city,
          verificationStatus: t.verification_status,
          isPublished: t.is_published,
          activeClientsCount: activeRelByTrainer.get(t.id) || 0,
        };
      });

      let activeSubscriptions = 0;
      (subsRes.data || []).forEach((s) => {
        if (s.status === 'active') activeSubscriptions += 1;
      });

      let capturedRevenueInr = 0;
      let capturedPaymentsCount = 0;
      (paymentsRes.data || []).forEach((p) => {
        if (p.status === 'captured') {
          capturedPaymentsCount += 1;
          capturedRevenueInr += Number(p.amount_inr || 0);
        }
      });

      const pendingVerifications = (verifsRes.data || []).filter((v) => v.status === 'pending').length;

      const recentReviews = (reviewsRes.data || []).map((rev) => ({
        id: rev.id,
        trainerId: rev.trainer_user_id,
        clientId: rev.client_user_id,
        clientUserId: rev.client_user_id,
        relationshipId: '',
        authorName: 'FitPlus Member',
        rating: rev.rating,
        comment: rev.review_text,
        createdAt: rev.created_at,
        updatedAt: rev.updated_at,
      }));

      return res.status(200).json({
        ok: true,
        overview: {
          totalUsers: usersRes.count ?? 0,
          totalTrainers: trainersSummary.length,
          publishedTrainers,
          verifiedTrainers,
          totalClients: clientsRes.count ?? 0,
          activeRelationships,
          activeSubscriptions,
          capturedRevenueInr,
          capturedPaymentsCount,
          pendingVerifications,
          totalReviews: recentReviews.length,
          trainersSummary,
          recentReviews,
          featureFlags: flagsRes.data || [],
        },
      });
    }

    // Fallback if Supabase unconfigured
    const { db } = getFirestoreAdminContext();
    const [usersSnap, trainersSnap, clientsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('trainers').get(),
      db.collection('clients').get(),
    ]);

    return res.status(200).json({
      ok: true,
      overview: {
        totalUsers: usersSnap.size,
        totalTrainers: trainersSnap.size,
        publishedTrainers: 0,
        verifiedTrainers: 0,
        totalClients: clientsSnap.size,
        activeRelationships: 0,
        activeSubscriptions: 0,
        capturedRevenueInr: 0,
        capturedPaymentsCount: 0,
        pendingVerifications: 0,
        totalReviews: 0,
        trainersSummary: [],
        recentReviews: [],
        featureFlags: [],
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
