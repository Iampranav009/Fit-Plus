import type {
  AIPlanDraft,
  Assignment,
  Booking,
  CoachingRelationship,
  CompletionType,
  ConsultationSlot,
  DietaryPreference,
  Enrollment,
  ExperienceLevel,
  GoalFocus,
  Invite,
  Notification,
  Package,
  TaskCategory,
  TaskTemplate,
  TrainingEnvironment,
} from '../types/domain';
import { addDaysToKey, generateDateRangeKeys } from './date.js';

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-4)}`;
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCryptoInviteToken(prefix = 'FIT'): string {
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let code = '';
  for (let i = 0; i < bytes.length; i += 1) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'FIT';
  return `${cleanPrefix}-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

export interface BulkAssignInput {
  trainerId: string;
  clientIds: string[];
  template?: TaskTemplate;
  customTask?: {
    title: string;
    category: TaskCategory;
    instructions: string;
    durationMinutes: number;
    completionType: CompletionType;
    targetLabel?: string;
    isRecovery: boolean;
    isOptional: boolean;
  };
  startDateKey: string;
  recurrenceDays: number; // e.g., 1 (single day), 3, 7, 14
  dueTime: string;
  skipDuplicates: boolean;
  existingAssignments: Assignment[];
}

export interface BulkAssignResult {
  created: Assignment[];
  skippedClientIds: string[];
  notifications: Notification[];
  clientUserIdMap: Record<string, string>;
}

export function buildBulkAssignments(
  input: BulkAssignInput,
  clientUserIdMap: Record<string, string>,
): { created: Assignment[]; skippedClientIds: string[]; notifications: Notification[] } {
  const source = input.template
    ? {
        title: input.template.title,
        category: input.template.category,
        instructions: input.template.instructions,
        durationMinutes: input.template.durationMinutes,
        completionType: input.template.completionType,
        targetLabel: input.template.targetLabel,
        isRecovery: input.template.isRecoveryDefault,
        isOptional: input.template.isOptionalDefault,
      }
    : input.customTask;

  if (!source) {
    return { created: [], skippedClientIds: [], notifications: [] };
  }

  const targetDates = generateDateRangeKeys(input.startDateKey, Math.max(1, input.recurrenceDays));
  const created: Assignment[] = [];
  const skippedClientIds: string[] = [];
  const notifications: Notification[] = [];

  for (const clientId of input.clientIds) {
    // Duplicate check: same client, same templateId or same normalized title, and overlapping dates
    const hasDuplicate =
      input.skipDuplicates &&
      input.existingAssignments.some((existing) => {
        if (existing.clientId !== clientId) return false;
        const sameSource =
          (input.template && existing.templateId === input.template.id) ||
          existing.title.trim().toLowerCase() === source.title.trim().toLowerCase();
        if (!sameSource) return false;
        return existing.scheduledDates.some((d) => targetDates.includes(d));
      });

    if (hasDuplicate) {
      skippedClientIds.push(clientId);
      continue;
    }

    const assignment: Assignment = {
      id: uid('asg'),
      clientId,
      trainerId: input.trainerId,
      templateId: input.template?.id,
      title: source.title.trim(),
      category: source.category,
      instructions: source.instructions.trim(),
      durationMinutes: source.durationMinutes,
      dueTime: input.dueTime,
      completionType: source.completionType,
      targetLabel: source.targetLabel,
      scheduledDates: targetDates,
      isOptional: source.isOptional,
      isRecovery: source.isRecovery,
      hasCustomOverride: false,
      createdAt: new Date().toISOString(),
    };

    created.push(assignment);

    const recipientUserId = clientUserIdMap[clientId];
    if (recipientUserId) {
      notifications.push({
        id: uid('ntf'),
        recipientUserId,
        title: 'New commitment assigned',
        body: `${source.title} scheduled from ${input.startDateKey}.`,
        category: 'assignment',
        read: false,
        actionRoute: `/app/tasks/${assignment.id}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { created, skippedClientIds, notifications };
}

export type InviteValidationResult =
  | { state: 'valid'; invite: Invite }
  | { state: 'expired'; invite: Invite }
  | { state: 'redeemed'; invite: Invite }
  | { state: 'revoked'; invite: Invite }
  | { state: 'not_found' };

export function validateInvite(token: string, invites: Invite[], todayKey: string): InviteValidationResult {
  const normalized = token.trim().toUpperCase();
  const invite = invites.find((i) => i.token.toUpperCase() === normalized);
  if (!invite) return { state: 'not_found' };
  if (invite.status === 'revoked') return { state: 'revoked', invite };
  if (invite.status === 'redeemed') return { state: 'redeemed', invite };
  if (invite.status === 'expired' || invite.expiresAt.slice(0, 10) < todayKey) {
    return { state: 'expired', invite };
  }
  return { state: 'valid', invite };
}

export function createDemoEnrollmentState(params: {
  clientId: string;
  trainerId: string;
  pkg: Package;
  existingRelationships: CoachingRelationship[];
  existingEnrollments: Enrollment[];
}): {
  relationships: CoachingRelationship[];
  enrollments: Enrollment[];
} {
  const now = new Date().toISOString();
  // End any previous active relationship for this client in demo
  const relationships: CoachingRelationship[] = params.existingRelationships.map((r) =>
    r.clientId === params.clientId && r.status === 'active'
      ? { ...r, status: 'ended', endedAt: now }
      : r,
  );
  relationships.push({
    id: uid('rel'),
    trainerId: params.trainerId,
    clientId: params.clientId,
    packageId: params.pkg.id,
    status: 'active',
    startedAt: now,
  });

  const enrollments: Enrollment[] = params.existingEnrollments.map((e) =>
    e.clientId === params.clientId && e.status === 'active'
      ? { ...e, status: 'ended', endedAt: now }
      : e,
  );
  enrollments.push({
    id: uid('enr'),
    clientId: params.clientId,
    trainerId: params.trainerId,
    packageId: params.pkg.id,
    status: 'active',
    isDemoCheckout: true,
    enrolledAt: now,
  });

  return { relationships, enrollments };
}

export function attemptBookConsultationSlot(params: {
  slotId: string;
  clientId: string;
  topic: string;
  slots: ConsultationSlot[];
  bookings: Booking[];
}): { ok: true; slots: ConsultationSlot[]; booking: Booking } | { ok: false; reason: 'unavailable' | 'duplicate' } {
  const slot = params.slots.find((s) => s.id === params.slotId);
  if (!slot || slot.status !== 'available') {
    return { ok: false, reason: 'unavailable' };
  }

  const alreadyBooked = params.bookings.some(
    (b) => b.slotId === params.slotId && (b.status === 'booked' || b.status === 'rescheduled'),
  );
  if (alreadyBooked) {
    return { ok: false, reason: 'duplicate' };
  }

  const now = new Date().toISOString();
  const booking: Booking = {
    id: uid('bk'),
    slotId: slot.id,
    trainerId: slot.trainerId,
    clientId: params.clientId,
    dateKey: slot.dateKey,
    startTime: slot.startTime,
    endTime: slot.endTime,
    timezone: slot.timezone,
    topic: params.topic.trim() || 'Goal & plan check-in',
    status: 'booked',
    createdAt: now,
    updatedAt: now,
  };

  const slots = params.slots.map((s) => (s.id === slot.id ? { ...s, status: 'booked' as const } : s));
  return { ok: true, slots, booking };
}

export function rescheduleConsultationBooking(params: {
  bookingId: string;
  newSlotId: string;
  slots: ConsultationSlot[];
  bookings: Booking[];
}): { ok: true; slots: ConsultationSlot[]; bookings: Booking[] } | { ok: false; reason: string } {
  const existing = params.bookings.find((b) => b.id === params.bookingId);
  const targetSlot = params.slots.find((s) => s.id === params.newSlotId);
  if (!existing || !targetSlot || targetSlot.status !== 'available') {
    return { ok: false, reason: 'That slot is no longer available.' };
  }

  const now = new Date().toISOString();
  const slots = params.slots.map((s) => {
    if (s.id === existing.slotId) return { ...s, status: 'available' as const };
    if (s.id === targetSlot.id) return { ...s, status: 'booked' as const };
    return s;
  });

  const bookings = params.bookings.map((b) =>
    b.id === existing.id
      ? {
          ...b,
          slotId: targetSlot.id,
          dateKey: targetSlot.dateKey,
          startTime: targetSlot.startTime,
          endTime: targetSlot.endTime,
          timezone: targetSlot.timezone,
          status: 'rescheduled' as const,
          updatedAt: now,
        }
      : b,
  );

  return { ok: true, slots, bookings };
}

export function generateDeterministicPlanDraft(params: {
  trainerId: string;
  objective: GoalFocus;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  environment: TrainingEnvironment;
  dietaryPreference: DietaryPreference;
  constraints: string;
}): AIPlanDraft {
  const focusMap: Record<GoalFocus, string> = {
    weight_management: 'Sustainable Fat Loss & Metabolic Conditioning',
    healthy_weight_gain: 'Progressive Lean Mass & Calorie Surplus',
    muscle_strength: 'Foundational Strength & Hypertrophy',
    general_fitness: 'Balanced Strength, Stamina & Mobility',
    exploring: '4-Week Consistency & Movement Foundation',
  };

  const envCue =
    params.environment === 'home'
      ? 'dumbbells, resistance bands and bodyweight progressions'
      : params.environment === 'outdoors'
        ? 'park intervals, brisk incline walks and bodyweight circuits'
        : 'barbell/dumbbell compounds and controlled cable accessories';

  const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const workoutDays: { dayLabel: string; focus: string; sampleSession: string }[] = [];
  const activeCount = Math.max(2, Math.min(6, params.daysPerWeek));

  for (let i = 0; i < daysList.length; i += 1) {
    if (i < activeCount) {
      const splitName =
        i % 3 === 0
          ? 'Lower Body & Core Stability'
          : i % 3 === 1
            ? 'Upper Push / Pull Control'
            : 'Full-Body Conditioning & Carry';
      workoutDays.push({
        dayLabel: daysList[i],
        focus: splitName,
        sampleSession: `40 min ${params.experienceLevel} session using ${envCue}`,
      });
    } else {
      workoutDays.push({
        dayLabel: daysList[i],
        focus: 'Active Recovery & Mobility',
        sampleSession: '20 min evening walk + hip/thoracic mobility flow',
      });
    }
  }

  const nutritionOutline =
    params.dietaryPreference === 'vegetarian' || params.dietaryPreference === 'vegan'
      ? [
          'Breakfast: Poha or moong dal chilla with roasted peanuts / tofu bhurji',
          'Lunch: 2 phulkas, thick yellow dal or rajma, seasonal sabzi, cucumber salad',
          'Evening: Roasted chana / soaked almonds + fruit',
          'Dinner: Paneer or soya-chunk stir-fry with millet roti or khichdi',
        ]
      : [
          'Breakfast: Vegetable omelette or paneer/egg bhurji with 2 multigrain toasts',
          'Lunch: 2 rotis, dal, grilled chicken or curd + seasonal sabzi',
          'Evening: Greek curd / buttermilk + fruit',
          'Dinner: Light grilled protein or dal-rice bowl with sautéed greens',
        ];

  const habitCommitments = [
    '7,500–8,500 daily steps across work breaks and evening walk',
    '2.5L water intake before 8:00 PM',
    'Sunday evening 5-minute check-in & adherence reflection',
  ];

  const now = new Date().toISOString();
  return {
    id: uid('draft'),
    trainerId: params.trainerId,
    objective: params.objective,
    experienceLevel: params.experienceLevel,
    daysPerWeek: params.daysPerWeek,
    environment: params.environment,
    dietaryPreference: params.dietaryPreference,
    constraints: params.constraints.trim() || 'No specific joint restrictions noted',
    title: `${focusMap[params.objective]} (${params.daysPerWeek}d/wk)`,
    summary: `Deterministic sample draft tailored for ${params.experienceLevel} training (${params.environment}) with ${params.dietaryPreference.replace('_', ' ')} Indian home meals. Constraint check: ${params.constraints.trim() || 'standard progression'}.`,
    workoutDays,
    nutritionOutline,
    habitCommitments,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function sanitizeAIPlanDraftPayload(raw: {
  title?: unknown;
  summary?: unknown;
  workoutDays?: unknown;
  nutritionOutline?: unknown;
  habitCommitments?: unknown;
}): Pick<AIPlanDraft, 'title' | 'summary' | 'workoutDays' | 'nutritionOutline' | 'habitCommitments'> {
  const safeStr = (val: unknown, maxLen: number, fallback = ''): string => {
    const s = typeof val === 'string' ? val.trim() : '';
    return (s || fallback).slice(0, maxLen);
  };

  const title = safeStr(raw.title, 140, 'Custom Coaching Plan Draft');
  const summary = safeStr(
    raw.summary,
    800,
    'Structured India-first coaching draft ready for trainer review and customization.',
  );

  const rawDays = Array.isArray(raw.workoutDays) ? raw.workoutDays : [];
  const workoutDays = rawDays
    .slice(0, 7)
    .map((entry, idx) => {
      const obj = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      return {
        dayLabel: safeStr(obj.dayLabel, 40, `Day ${idx + 1}`),
        focus: safeStr(obj.focus, 120, 'Balanced Training'),
        sampleSession: safeStr(obj.sampleSession, 240, '40 min coached movement & mobility'),
      };
    });

  const rawNutrition = Array.isArray(raw.nutritionOutline) ? raw.nutritionOutline : [];
  const nutritionOutline = rawNutrition
    .map((item) => safeStr(item, 240))
    .filter(Boolean)
    .slice(0, 10);

  const rawHabits = Array.isArray(raw.habitCommitments) ? raw.habitCommitments : [];
  const habitCommitments = rawHabits
    .map((item) => safeStr(item, 240))
    .filter(Boolean)
    .slice(0, 10);

  return {
    title,
    summary,
    workoutDays:
      workoutDays.length > 0
        ? workoutDays
        : [{ dayLabel: 'Mon', focus: 'Foundation Movement', sampleSession: '35 min guided full-body flow' }],
    nutritionOutline:
      nutritionOutline.length > 0
        ? nutritionOutline
        : ['Balanced Indian home meals anchored around protein, dal/curd, sabzi, and hydration.'],
    habitCommitments:
      habitCommitments.length > 0
        ? habitCommitments
        : ['8,000 daily steps across work breaks', '2.5L water intake daily'],
  };
}

export function generateDefaultClientPlans(params: {
  clientId: string;
  trainerId?: string;
  goal: GoalFocus;
  dietaryPreference: DietaryPreference;
}) {
  const now = new Date().toISOString();
  const workoutPlan = {
    id: uid('wplan'),
    clientId: params.clientId,
    trainerId: params.trainerId,
    title:
      params.goal === 'muscle_strength'
        ? 'Strength & Lean Foundation'
        : 'Everyday Energy & Consistency',
    weekLabel: 'Week 1',
    coachNotes: 'Keep 2 reps in reserve on primary lifts and prioritise crisp form.',
    days: [
      {
        dayIndex: 0,
        dayLabel: 'Mon',
        focusTitle: 'Upper Body Push & Pull',
        isRecoveryDay: false,
        durationMinutes: 45,
        coachInstructions: 'Warm up shoulders for 6 minutes before working sets.',
        exercises: [
          { id: uid('ex'), name: 'Dumbbell Floor / Bench Press', sets: '3', reps: '10', rest: '90s' },
          { id: uid('ex'), name: 'Single-Arm Dumbbell Row', sets: '3', reps: '10 / side', rest: '75s' },
          { id: uid('ex'), name: 'Overhead Pike or DB Press', sets: '3', reps: '12', rest: '60s' },
        ],
      },
      {
        dayIndex: 1,
        dayLabel: 'Tue',
        focusTitle: 'Active Walk & Mobility',
        isRecoveryDay: true,
        durationMinutes: 25,
        coachInstructions: 'Keep heart rate conversational. Focus on hip & ankle range.',
        exercises: [
          { id: uid('ex'), name: 'Brisk Outdoor Walk', sets: '1', reps: '20 min', rest: '-' },
          { id: uid('ex'), name: '90/90 Hip Switches & Thoracic Openers', sets: '2', reps: '8 / side', rest: '30s' },
        ],
      },
      {
        dayIndex: 2,
        dayLabel: 'Wed',
        focusTitle: 'Lower Body & Core',
        isRecoveryDay: false,
        durationMinutes: 45,
        coachInstructions: 'Control the lowering tempo to 3 seconds on goblet squats.',
        exercises: [
          { id: uid('ex'), name: 'Goblet Squat', sets: '4', reps: '10', rest: '90s' },
          { id: uid('ex'), name: 'Romanian Deadlift', sets: '3', reps: '12', rest: '90s' },
          { id: uid('ex'), name: 'Dead Bug Core Hold', sets: '3', reps: '10 / side', rest: '45s' },
        ],
      },
    ],
    updatedAt: now,
  };

  const mealPlan = {
    id: uid('mplan'),
    clientId: params.clientId,
    trainerId: params.trainerId,
    title: 'Everyday Indian Home Nutrition',
    dietaryLabel: params.dietaryPreference.replace('_', ' '),
    coachNotes: 'Illustrative portion structure using common home kitchen staples.',
    meals: [
      {
        id: uid('meal'),
        slotLabel: 'Breakfast · 8:30 AM',
        title: 'Kanda Poha with Peas & Peanuts',
        portionNote: '1 medium katori poha + lemon + roasted peanuts',
        substitutions: ['2 moong dal chillas with mint chutney', 'Vegetable upma + 1 glass buttermilk'],
        imageKey: 'foodBreakfast',
      },
      {
        id: uid('meal'),
        slotLabel: 'Lunch · 1:30 PM',
        title: '2 Phulkas, Yellow Tadka Dal & Seasonal Sabzi',
        portionNote: '1 katori thick dal + 1 katori sabzi + cucumber kachumber',
        substitutions: ['1 cup steamed rice + rajma + salad', '2 jowar bhakris + palak paneer'],
        imageKey: 'foodLunch',
      },
    ],
    updatedAt: now,
  };

  return { workoutPlan, mealPlan };
}

export function getNextFutureDateKey(todayKey: string, offsetDays: number): string {
  return addDaysToKey(todayKey, offsetDays);
}
