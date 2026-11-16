import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  AuthHttpError,
  getFirebaseAdminContext,
  verifyAuthenticatedRequest,
} from '../_lib/firebaseAdmin.js';
import {
  generateDeterministicPlanDraft,
  sanitizeAIPlanDraftPayload,
} from '../../src/lib/engines.js';
import type {
  AIPlanDraft,
  DietaryPreference,
  ExperienceLevel,
  GoalFocus,
  TrainingEnvironment,
} from '../../src/types/domain.js';

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_DAY = 30;

const GeneratePlanSchema = z.object({
  objective: z.enum([
    'weight_management',
    'healthy_weight_gain',
    'muscle_strength',
    'general_fitness',
    'exploring',
  ]),
  experienceLevel: z.enum(['beginner', 'intermediate', 'experienced']),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  environment: z.enum(['gym', 'home', 'outdoors']),
  dietaryPreference: z.enum([
    'vegetarian',
    'vegan',
    'non_vegetarian',
    'other',
    'prefer_not_to_say',
  ]),
  constraints: z.string().max(800).optional().default(''),
  clientId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
  trainerId: z.string().max(128).regex(/^[a-zA-Z0-9_\-]+$/).optional(),
});

function toMillis(val: unknown): number {
  if (!val) return 0;
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof val === 'string') {
    const t = Date.parse(val);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authCtx = await verifyAuthenticatedRequest(req.headers);
    if (authCtx.role !== 'trainer' && authCtx.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        code: 'auth/trainer-required',
        error: 'Only verified trainer accounts can generate AI coaching plans.',
      });
    }

    const parsed = GeneratePlanSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'validation/invalid-input',
        error: 'Invalid plan generation parameters.',
        details: parsed.error.flatten(),
      });
    }

    const input = parsed.data;
    const { db } = getFirebaseAdminContext();

    // Enforce rate limits using aiGenerations ledger (single-field query, JS window filter)
    const nowMs = Date.now();
    const oneMinuteAgo = nowMs - 60_000;
    const oneDayAgo = nowMs - 86_400_000;

    const genSnap = await db
      .collection('aiGenerations')
      .where('trainerUserId', '==', authCtx.uid)
      .get();

    let countLastMinute = 0;
    let countLastDay = 0;
    for (const docSnap of genSnap.docs) {
      const createdMs = toMillis(docSnap.data().createdAt);
      if (createdMs >= oneMinuteAgo) countLastMinute += 1;
      if (createdMs >= oneDayAgo) countLastDay += 1;
    }

    if (countLastMinute >= MAX_REQUESTS_PER_MINUTE) {
      return res.status(429).json({
        ok: false,
        code: 'ai/rate-limited',
        error: 'Too many plan generation requests this minute. Please wait 60 seconds and try again.',
        remainingDailyQuota: Math.max(0, MAX_REQUESTS_PER_DAY - countLastDay),
      });
    }

    if (countLastDay >= MAX_REQUESTS_PER_DAY) {
      return res.status(429).json({
        ok: false,
        code: 'ai/daily-quota-exceeded',
        error: 'Daily AI plan generation limit reached (30/day). You can still build plans manually or retry tomorrow.',
        remainingDailyQuota: 0,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        ok: false,
        code: 'ai/key-missing',
        error: 'Server AI plan generation is unavailable because GEMINI_API_KEY is not configured.',
      });
    }

    // Resolve trainer profile
    let resolvedTrainerId = input.trainerId || '';
    if (resolvedTrainerId) {
      const tDoc = await db.collection('trainers').doc(resolvedTrainerId).get();
      if (!tDoc.exists || (tDoc.data()?.userId !== authCtx.uid && !authCtx.isAdmin)) {
        resolvedTrainerId = '';
      }
    }
    if (!resolvedTrainerId) {
      const tQuery = await db.collection('trainers').where('userId', '==', authCtx.uid).limit(1).get();
      resolvedTrainerId = tQuery.docs[0]?.id || `trn_${authCtx.uid}`;
    }

    // Optional non-PII client context if clientId provided & trainer owns relationship
    let clientTrainingContext = '';
    if (input.clientId) {
      const clientSnap = await db.collection('clients').doc(input.clientId).get();
      const clientData = clientSnap.data();
      if (
        clientSnap.exists &&
        clientData &&
        (clientData.activeTrainerUserId === authCtx.uid || authCtx.isAdmin)
      ) {
        const parts: string[] = [];
        if (typeof clientData.age === 'number') parts.push(`Age: ${clientData.age}`);
        if (typeof clientData.heightCm === 'number') parts.push(`Height: ${clientData.heightCm} cm`);
        if (typeof clientData.weightKg === 'number') parts.push(`Weight: ${clientData.weightKg} kg`);
        if (typeof clientData.targetWeightKg === 'number') parts.push(`Target Weight: ${clientData.targetWeightKg} kg`);
        if (Array.isArray(clientData.equipment) && clientData.equipment.length > 0) {
          parts.push(`Equipment: ${clientData.equipment.slice(0, 10).join(', ')}`);
        }
        if (clientData.foodAllergies) parts.push(`Allergies: ${String(clientData.foodAllergies).slice(0, 200)}`);
        if (clientData.healthLimitations) parts.push(`Limitations: ${String(clientData.healthLimitations).slice(0, 250)}`);
        if (clientData.dietaryNotes) parts.push(`Dietary notes: ${String(clientData.dietaryNotes).slice(0, 200)}`);
        if (parts.length > 0) {
          clientTrainingContext = `\nClient training parameters (non-PII): ${parts.join(' | ')}`;
        }
      }
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = [
      'Draft an actionable 7-day India-first personal fitness coaching plan outline for a certified coach to review and edit before assigning.',
      `Primary objective: ${input.objective}`,
      `Client experience level: ${input.experienceLevel}`,
      `Training days per week: ${input.daysPerWeek} active days and ${7 - input.daysPerWeek} recovery/mobility days`,
      `Training environment: ${input.environment}`,
      `Dietary preference: ${input.dietaryPreference}`,
      `Trainer constraints & notes: ${input.constraints.trim() || 'None specified'}`,
      clientTrainingContext,
      'Requirements:',
      '- Include 7 workoutDays (Mon..Sun), clearly marking recovery/mobility days.',
      '- Include 4–6 practical Indian home nutritionOutline entries (culturally familiar foods like poha, dal, roti/phulka, paneer, curd, eggs/chicken only if non_vegetarian, metric grams/katori portions).',
      '- Include 3–5 habitCommitments (steps, water in litres, sleep, weekly check-in).',
      '- Use metric units only (kg, cm, litres, km). Keep every item concise and realistic.',
    ]
      .filter(Boolean)
      .join('\n');

    let parsedJson: Record<string, unknown> | null = null;
    let actualModel = MODEL_NAME;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a careful fitness coaching assistant helping certified Indian fitness trainers build safe, sustainable workout and nutrition drafts. Never diagnose medical conditions, never prescribe clinical treatments or extreme caloric restriction, and never recommend banned or unsafe performance substances. Respond strictly in JSON matching the requested schema.',
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short plan title under 120 characters' },
              summary: { type: Type.STRING, description: 'Concise coaching overview under 600 characters' },
              workoutDays: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayLabel: { type: Type.STRING, description: 'e.g. Mon, Tue, Wed' },
                    focus: { type: Type.STRING, description: 'Training focus or Active Recovery' },
                    sampleSession: { type: Type.STRING, description: 'Exercises, duration, sets/reps cue' },
                  },
                  required: ['dayLabel', 'focus', 'sampleSession'],
                },
              },
              nutritionOutline: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              habitCommitments: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'summary', 'workoutDays', 'nutritionOutline', 'habitCommitments'],
          },
        },
      });

      const rawText = response.text;
      if (rawText) {
        parsedJson = JSON.parse(rawText) as Record<string, unknown>;
      }
    } catch (aiErr) {
      console.warn('Gemini model call failed, activating deterministic plan engine:', aiErr);
    }

    let sanitized: ReturnType<typeof sanitizeAIPlanDraftPayload>;
    if (parsedJson) {
      sanitized = sanitizeAIPlanDraftPayload(parsedJson);
    } else {
      actualModel = 'deterministic-fallback';
      const fallbackDraft = generateDeterministicPlanDraft({
        trainerId: resolvedTrainerId,
        objective: input.objective as GoalFocus,
        experienceLevel: input.experienceLevel as ExperienceLevel,
        daysPerWeek: input.daysPerWeek,
        environment: input.environment as TrainingEnvironment,
        dietaryPreference: input.dietaryPreference as DietaryPreference,
        constraints: input.constraints,
      });
      sanitized = {
        title: fallbackDraft.title,
        summary: fallbackDraft.summary,
        workoutDays: fallbackDraft.workoutDays,
        nutritionOutline: fallbackDraft.nutritionOutline,
        habitCommitments: fallbackDraft.habitCommitments,
      };
    }
    const generationId = `aigen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const draftId = `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();
    const cleanConstraints = (input.constraints.trim() || 'Standard progression').slice(0, 800);

    // Write aiGenerations ledger & aiDrafts doc (strictly respecting firestore.rules keys().hasOnly)
    const batch = db.batch();
    batch.set(db.collection('aiGenerations').doc(generationId), {
      id: generationId,
      trainerId: resolvedTrainerId,
      trainerUserId: authCtx.uid,
      clientId: input.clientId || '',
      model: actualModel,
      status: 'succeeded',
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection('aiDrafts').doc(draftId), {
      id: draftId,
      trainerId: resolvedTrainerId,
      trainerUserId: authCtx.uid,
      objective: input.objective,
      experienceLevel: input.experienceLevel,
      daysPerWeek: input.daysPerWeek,
      environment: input.environment,
      dietaryPreference: input.dietaryPreference,
      constraints: cleanConstraints,
      title: sanitized.title,
      summary: sanitized.summary,
      workoutDays: sanitized.workoutDays,
      nutritionOutline: sanitized.nutritionOutline,
      habitCommitments: sanitized.habitCommitments,
      status: 'draft',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    const draft: AIPlanDraft = {
      id: draftId,
      trainerId: resolvedTrainerId,
      objective: input.objective as GoalFocus,
      experienceLevel: input.experienceLevel as ExperienceLevel,
      daysPerWeek: input.daysPerWeek,
      environment: input.environment as TrainingEnvironment,
      dietaryPreference: input.dietaryPreference as DietaryPreference,
      constraints: cleanConstraints,
      title: sanitized.title,
      summary: sanitized.summary,
      workoutDays: sanitized.workoutDays,
      nutritionOutline: sanitized.nutritionOutline,
      habitCommitments: sanitized.habitCommitments,
      status: 'draft',
      model: actualModel,
      generationId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return res.status(200).json({
      ok: true,
      draft,
      generationId,
      model: actualModel,
      remainingDailyQuota: Math.max(0, MAX_REQUESTS_PER_DAY - (countLastDay + 1)),
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    const status =
      typeof (error as { status?: number }).status === 'number'
        ? (error as { status: number }).status
        : 500;
    const message =
      error instanceof Error ? error.message : 'Unable to generate coaching plan right now.';
    console.error('AI plan generation failed:', error);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      code: 'ai/provider-error',
      error: message,
    });
  }
}
