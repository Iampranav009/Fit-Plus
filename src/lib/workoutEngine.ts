import type {
  ExerciseDefinition,
  WorkoutDayPlan,
  WorkoutExerciseLog,
  WorkoutSession,
  WorkoutSetLog,
} from '../types/domain';
import { findExerciseByNameOrId } from '../data/exerciseLibrary';

const DRAFT_STORAGE_PREFIX = 'fitplus_live_workout_draft_';

export function parseRestSeconds(restStr: string): number {
  const clean = (restStr || '').trim().toLowerCase();
  if (!clean || clean === '-') return 45;
  const numMatch = clean.match(/(\d+)/);
  if (!numMatch) return 60;
  const val = Number(numMatch[1]);
  if (clean.includes('m') && !clean.includes('ms')) {
    return Math.min(300, Math.max(15, val * 60));
  }
  return Math.min(300, Math.max(15, val));
}

export function parseTargetSetCount(setsStr: string): number {
  const num = Number(String(setsStr || '').match(/\d+/)?.[0] || 3);
  return Math.min(8, Math.max(1, Number.isFinite(num) ? num : 3));
}

export function parseTargetRepsNum(repsStr: string): number {
  const num = Number(String(repsStr || '').match(/\d+/)?.[0] || 10);
  return Math.min(100, Math.max(1, Number.isFinite(num) ? num : 10));
}

export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function getPreviousExerciseBest(
  exerciseName: string,
  exerciseId: string,
  pastSessions: WorkoutSession[],
  clientId: string,
): {
  bestWeightKg: number;
  bestRepsAtWeight: number;
  bestEstimated1RM: number;
  lastSessionDate?: string;
  lastSetsSummary?: string;
} {
  let bestWeightKg = 0;
  let bestRepsAtWeight = 0;
  let bestEstimated1RM = 0;
  let lastSessionDate: string | undefined;
  let lastSetsSummary: string | undefined;

  const clientCompleted = pastSessions
    .filter((s) => s.clientId === clientId && s.status === 'completed')
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const targetLower = exerciseName.trim().toLowerCase();
  for (const session of clientCompleted) {
    const match = session.exercises.find(
      (ex) =>
        ex.exerciseId === exerciseId ||
        ex.exerciseName.trim().toLowerCase() === targetLower,
    );
    if (!match) continue;
    const completedSets = match.sets.filter((st) => st.completed);
    if (!completedSets.length) continue;

    if (!lastSessionDate) {
      lastSessionDate = session.dateKey;
      lastSetsSummary = completedSets
        .map((st) => (st.weightKg > 0 ? `${st.weightKg}kg × ${st.reps}` : `${st.reps} reps`))
        .join(', ');
    }

    for (const st of completedSets) {
      if (st.weightKg > bestWeightKg) {
        bestWeightKg = st.weightKg;
        bestRepsAtWeight = st.reps;
      }
      const e1rm = estimateOneRepMax(st.weightKg, st.reps);
      if (e1rm > bestEstimated1RM) {
        bestEstimated1RM = e1rm;
      }
    }
  }

  return {
    bestWeightKg,
    bestRepsAtWeight,
    bestEstimated1RM,
    lastSessionDate,
    lastSetsSummary,
  };
}

export function buildInitialWorkoutExercises(
  dayPlan: WorkoutDayPlan,
  catalog: ExerciseDefinition[],
  pastSessions: WorkoutSession[],
  clientId: string,
): WorkoutExerciseLog[] {
  return dayPlan.exercises.map((item) => {
    const matched = findExerciseByNameOrId(item.name, catalog);
    const exerciseId = matched?.id || item.id;
    const prev = getPreviousExerciseBest(item.name, exerciseId, pastSessions, clientId);
    const setCount = parseTargetSetCount(item.sets);
    const defaultReps = parseTargetRepsNum(item.reps);
    const defaultWeight = prev.bestWeightKg > 0 ? prev.bestWeightKg : 0;

    const sets: WorkoutSetLog[] = Array.from({ length: setCount }, (_, idx) => ({
      setNumber: idx + 1,
      reps: defaultReps,
      weightKg: defaultWeight,
      completed: false,
      isPersonalRecord: false,
    }));

    return {
      exerciseId,
      exerciseName: item.name,
      targetSets: item.sets,
      targetReps: item.reps,
      restSeconds: parseRestSeconds(item.rest),
      sets,
      notes: item.cue,
    };
  });
}

export function computeSessionMetrics(
  exercises: WorkoutExerciseLog[],
  pastSessions: WorkoutSession[],
  clientId: string,
  excludeSessionId?: string,
): {
  totalVolumeKg: number;
  completedSetsCount: number;
  prCount: number;
  exercisesWithPRs: WorkoutExerciseLog[];
} {
  let totalVolumeKg = 0;
  let completedSetsCount = 0;
  let prCount = 0;
  const filteredPast = pastSessions.filter((s) => s.id !== excludeSessionId);

  const exercisesWithPRs = exercises.map((ex) => {
    const prev = getPreviousExerciseBest(ex.exerciseName, ex.exerciseId, filteredPast, clientId);
    let hasHistory = Boolean(prev.lastSessionDate);
    let runningBest1RM = prev.bestEstimated1RM;
    let runningBestWeight = prev.bestWeightKg;

    const nextSets = ex.sets.map((st) => {
      if (!st.completed) {
        return { ...st, isPersonalRecord: false };
      }
      completedSetsCount += 1;
      const safeWeight = Math.max(0, Number(st.weightKg) || 0);
      const safeReps = Math.max(0, Number(st.reps) || 0);
      totalVolumeKg += safeWeight * safeReps;

      const e1rm = estimateOneRepMax(safeWeight, safeReps);
      let isPR = false;
      if (hasHistory && safeWeight > 0 && (e1rm > runningBest1RM || safeWeight > runningBestWeight)) {
        isPR = true;
        prCount += 1;
        runningBest1RM = Math.max(runningBest1RM, e1rm);
        runningBestWeight = Math.max(runningBestWeight, safeWeight);
      } else if (!hasHistory && safeWeight > 0) {
        // First time logging this lift establishes baseline (counts as baseline milestone, not endless PR spam)
        runningBest1RM = Math.max(runningBest1RM, e1rm);
        runningBestWeight = Math.max(runningBestWeight, safeWeight);
        hasHistory = true;
      }
      return { ...st, isPersonalRecord: isPR };
    });

    return { ...ex, sets: nextSets };
  });

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    completedSetsCount,
    prCount,
    exercisesWithPRs,
  };
}

export function saveLiveWorkoutDraft(session: WorkoutSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${session.clientId}`, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadLiveWorkoutDraft(clientId: string): WorkoutSession | null {
  if (typeof window === 'undefined' || !clientId) return null;
  try {
    const raw = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${clientId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutSession;
    if (!parsed || !Array.isArray(parsed.exercises) || parsed.status === 'completed') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLiveWorkoutDraft(clientId: string): void {
  if (typeof window === 'undefined' || !clientId) return;
  try {
    window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${clientId}`);
  } catch {
    // Ignore
  }
}
