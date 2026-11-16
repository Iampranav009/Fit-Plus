import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../../_lib/firebaseAdmin.js';
import { DEFAULT_TIMEZONE, getTodayKey } from '../../../src/lib/date.js';
import { computeStreakSummary } from '../../../src/lib/streak.js';
import type { Assignment, CompletionEvent } from '../../../src/types/domain.js';

const RecalculateSchema = z.object({
  clientId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/),
  recoveryDay: z
    .object({
      dateKey: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
      approved: z.boolean(),
    })
    .optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    const parsed = RecalculateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'validation/invalid-input',
        error: 'Invalid clientId or recoveryDay parameters.',
      });
    }

    const { clientId, recoveryDay } = parsed.data;
    const { db } = getFirebaseAdminContext();

    const clientSnap = await db.collection('clients').doc(clientId).get();
    if (!clientSnap.exists) {
      return res.status(404).json({ ok: false, code: 'client/not-found', error: 'Client not found.' });
    }

    const clientData = clientSnap.data()!;
    const isClientOwner = clientData.userId === authCtx.uid;
    const isActiveTrainer = clientData.activeTrainerUserId === authCtx.uid;

    if (!isClientOwner && !isActiveTrainer && !authCtx.isAdmin) {
      return res.status(403).json({
        ok: false,
        code: 'auth/forbidden',
        error: 'You do not have permission to recalculate streaks for this client.',
      });
    }

    if (recoveryDay) {
      if (!isActiveTrainer && !authCtx.isAdmin) {
        return res.status(403).json({
          ok: false,
          code: 'auth/trainer-required',
          error: 'Only the active coach can approve or revoke recovery days.',
        });
      }

      const activityId = `${clientId}_${recoveryDay.dateKey}`;
      const activityRef = db.collection('dailyActivity').doc(activityId);
      const existingAct = await activityRef.get();
      if (existingAct.exists) {
        await activityRef.update({
          recoveryApproved: recoveryDay.approved,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await activityRef.set({
          id: activityId,
          clientId,
          clientUserId: String(clientData.userId || ''),
          trainerUserId: String(clientData.activeTrainerUserId || authCtx.uid),
          dateKey: recoveryDay.dateKey,
          hydrationGlasses: 0,
          recoveryApproved: recoveryDay.approved,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    const [userSnap, assignmentsSnap, completionsSnap, activitySnap, streakSnap] = await Promise.all([
      db.collection('users').doc(String(clientData.userId)).get(),
      db.collection('assignments').where('clientId', '==', clientId).get(),
      db.collection('completions').where('clientId', '==', clientId).get(),
      db.collection('dailyActivity').where('clientId', '==', clientId).get(),
      db.collection('streaks').doc(clientId).get(),
    ]);

    const timezone = String(userSnap.data()?.timezone || DEFAULT_TIMEZONE);
    const todayKey = getTodayKey(timezone);

    const assignments: Assignment[] = assignmentsSnap.docs.map((d) => {
      const raw = d.data();
      return {
        id: d.id,
        clientId: String(raw.clientId || clientId),
        trainerId: raw.trainerId ? String(raw.trainerId) : undefined,
        templateId: raw.templateId ? String(raw.templateId) : undefined,
        title: String(raw.title || 'Commitment'),
        category: raw.category || 'workout',
        instructions: String(raw.instructions || ''),
        durationMinutes: Number(raw.durationMinutes || 0),
        dueTime: String(raw.dueTime || '09:00'),
        completionType: raw.completionType || 'checkbox',
        targetLabel: raw.targetLabel ? String(raw.targetLabel) : undefined,
        scheduledDates: Array.isArray(raw.scheduledDates) ? raw.scheduledDates.map(String) : [],
        isOptional: Boolean(raw.isOptional),
        isRecovery: Boolean(raw.isRecovery),
        hasCustomOverride: Boolean(raw.hasCustomOverride),
        overrideNote: raw.overrideNote ? String(raw.overrideNote) : undefined,
        createdAt: new Date().toISOString(),
      };
    });

    const completions: CompletionEvent[] = completionsSnap.docs.map((d) => {
      const raw = d.data();
      return {
        id: d.id,
        assignmentId: String(raw.assignmentId || ''),
        clientId: String(raw.clientId || clientId),
        dateKey: String(raw.dateKey || todayKey),
        completedAt: String(raw.completedAt || new Date().toISOString()),
        loggedValue: raw.loggedValue ? String(raw.loggedValue) : undefined,
        notes: raw.notes ? String(raw.notes) : undefined,
      };
    });

    const approvedRecoveryDateKeys = activitySnap.docs
      .filter((d) => Boolean(d.data().recoveryApproved))
      .map((d) => String(d.data().dateKey || ''));

    const summary = computeStreakSummary(
      assignments,
      completions,
      todayKey,
      120,
      approvedRecoveryDateKeys,
    );

    const streakRef = db.collection('streaks').doc(clientId);
    const basePayload = {
      id: clientId,
      clientId,
      clientUserId: String(clientData.userId || ''),
      trainerUserId: String(clientData.activeTrainerUserId || ''),
      currentStreak: summary.currentStreak,
      longestStreak: summary.longestStreak,
      lastEligibleDateKey: summary.lastEligibleDateKey || '',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (streakSnap.exists) {
      await streakRef.update(basePayload);
    } else {
      await streakRef.set({
        ...basePayload,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const nowIso = new Date().toISOString();
    return res.status(200).json({
      ok: true,
      todayKey,
      summary,
      approvedRecoveryDateKeys,
      streak: {
        id: clientId,
        clientId,
        clientUserId: basePayload.clientUserId,
        trainerUserId: basePayload.trainerUserId,
        currentStreak: summary.currentStreak,
        longestStreak: summary.longestStreak,
        lastEligibleDateKey: summary.lastEligibleDateKey || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error('Streak recalculation error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to recalculate streak right now.' });
  }
}
