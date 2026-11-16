import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import {
  AuthHttpError,
  verifyAuthenticatedRequest,
} from '../../_lib/firebaseAdmin.js';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../_lib/supabaseAdmin.js';
import { applySecurityHeaders, checkRateLimit, sanitizeErrorMessage } from '../../_lib/security.js';
import {
  generateDeterministicPlanDraft,
  sanitizeAIPlanDraftPayload,
} from '../../../src/lib/engines.js';
import type {
  AIPlanDraft,
  DietaryPreference,
  ExperienceLevel,
  GoalFocus,
  TrainingEnvironment,
} from '../../../src/types/domain.js';

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_REQUESTS_PER_DAY = 50;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res);

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

    const rateLimit = checkRateLimit(`ai:${authCtx.uid}`, MAX_REQUESTS_PER_MINUTE, 60 * 1000);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        ok: false,
        code: 'rate-limit/exceeded',
        error: 'Too many plan generation requests. Please slow down.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
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
    const cleanConstraints = (input.constraints.trim() || 'Standard progressive overload').slice(0, 800);
    const resolvedTrainerId = input.trainerId || `tr_${authCtx.uid}`;

    let actualModel = MODEL_NAME;
    let parsedJson: Record<string, unknown> | null = null;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Act as an elite sports scientist and registered dietitian designing a coaching program for FitPlus India.
Client Profile:
- Goal: ${input.objective}
- Experience: ${input.experienceLevel}
- Days/week: ${input.daysPerWeek}
- Location: ${input.environment}
- Diet: ${input.dietaryPreference}
- Custom constraints: ${cleanConstraints}

Generate a comprehensive workout outline, Indian-friendly nutrition outline, and key habit commitments.`;

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                workoutDays: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      dayLabel: { type: Type.STRING },
                      focus: { type: Type.STRING },
                      sampleSession: { type: Type.STRING },
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

    const draftId = `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const generationId = `aigen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Persist draft in Supabase PostgreSQL
    if (isSupabaseAdminConfigured()) {
      try {
        const supabaseAdmin = getSupabaseAdminClient();
        await supabaseAdmin.from('ai_plan_drafts').insert({
          id: draftId,
          trainer_user_id: authCtx.uid,
          client_id: input.clientId || '',
          objective: input.objective,
          level: input.experienceLevel,
          days_per_week: input.daysPerWeek,
          split: 'Custom Split',
          dietary_pref: input.dietaryPreference,
          target_calories: 2000,
          target_protein_g: 120,
          workout_days: sanitized.workoutDays as unknown as import('../../../src/types/database.types.js').Json,
          meal_slots: sanitized.nutritionOutline as unknown as import('../../../src/types/database.types.js').Json,
          trainer_approved: false,
          status: 'draft',
        });
      } catch (dbErr) {
        console.warn('Supabase draft persist warning:', dbErr);
      }
    }

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
      remainingDailyQuota: MAX_REQUESTS_PER_DAY - 1,
    });
  } catch (error) {
    if (error instanceof AuthHttpError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    const message = sanitizeErrorMessage(error, 'Unable to generate coaching plan right now.');
    console.error('AI plan generation failed:', error);
    return res.status(500).json({
      ok: false,
      code: 'ai/provider-error',
      error: message,
    });
  }
}
