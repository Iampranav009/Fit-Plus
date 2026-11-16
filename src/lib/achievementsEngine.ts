import type {
  AchievementBadgeId,
  AchievementUnlock,
  Assignment,
  CompletionEvent,
  ProgressEvent,
  WorkoutSession,
} from '../types/domain';
import { computeHeatmapGrid, computeStreakSummary } from './streak';

export interface AchievementDefinition {
  badgeId: AchievementBadgeId;
  title: string;
  description: string;
  targetValue: number;
  category: 'workout' | 'streak' | 'consistency';
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    badgeId: 'first_workout',
    title: 'First live workout',
    description: 'Complete and save your first structured training session.',
    targetValue: 1,
    category: 'workout',
  },
  {
    badgeId: 'personal_record',
    title: 'Personal strength record',
    description: 'Set a new personal strength benchmark on any logged lift.',
    targetValue: 1,
    category: 'workout',
  },
  {
    badgeId: 'streak_7',
    title: '7-day steady streak',
    description: 'Complete all required daily commitments for 7 consecutive scheduled days.',
    targetValue: 7,
    category: 'streak',
  },
  {
    badgeId: 'consistency_10',
    title: '10 active days',
    description: 'Log 10 complete or recovery-approved days over a 12-week window.',
    targetValue: 10,
    category: 'consistency',
  },
  {
    badgeId: 'streak_14',
    title: '14-day momentum',
    description: 'Keep your commitment rhythm going for 14 consecutive eligible days.',
    targetValue: 14,
    category: 'streak',
  },
  {
    badgeId: 'consistency_30',
    title: '30 active days',
    description: 'Reach 30 completed or recovery-approved days across your training block.',
    targetValue: 30,
    category: 'consistency',
  },
  {
    badgeId: 'streak_30',
    title: '30-day discipline',
    description: 'Hold a 30-day unbroken commitment streak (with approved recovery respected).',
    targetValue: 30,
    category: 'streak',
  },
  {
    badgeId: 'streak_60',
    title: '60-day cornerstone',
    description: 'Maintain a 60-day steady training and recovery streak.',
    targetValue: 60,
    category: 'streak',
  },
  {
    badgeId: 'streak_100',
    title: '100-day century',
    description: 'Complete 100 consecutive eligible days without missing scheduled commitments.',
    targetValue: 100,
    category: 'streak',
  },
];

export interface AchievementProgressItem extends AchievementDefinition {
  unlocked: boolean;
  currentValue: number;
  progressPercent: number;
  unlockedAt?: string;
}

export function evaluateAchievementsState(params: {
  clientId: string;
  todayKey: string;
  assignments: Assignment[];
  completions: CompletionEvent[];
  approvedRecoveryDates: string[];
  workoutSessions: WorkoutSession[];
  progressEvents: ProgressEvent[];
  existingUnlocks: AchievementUnlock[];
}): {
  items: AchievementProgressItem[];
  newlyUnlocked: AchievementUnlock[];
} {
  const {
    clientId,
    todayKey,
    assignments,
    completions,
    approvedRecoveryDates,
    workoutSessions,
    progressEvents,
    existingUnlocks,
  } = params;

  const clientAssignments = assignments.filter((a) => a.clientId === clientId);
  const clientCompletions = completions.filter((c) => c.clientId === clientId);
  const streak = computeStreakSummary(
    clientAssignments,
    clientCompletions,
    todayKey,
    180,
    approvedRecoveryDates,
  );
  const heatmapDays = computeHeatmapGrid(
    todayKey,
    16,
    clientAssignments,
    clientCompletions,
    approvedRecoveryDates,
  );
  const activeDaysCount = heatmapDays.filter(
    (d) => d.status === 'completed' || d.status === 'recovery_completed',
  ).length;

  const completedWorkoutsCount =
    workoutSessions.filter((s) => s.clientId === clientId && s.status === 'completed').length +
    clientCompletions.filter((c) => {
      const asg = clientAssignments.find((a) => a.id === c.assignmentId);
      return asg?.category === 'workout';
    }).length;

  const hasPr =
    workoutSessions.some((s) => s.clientId === clientId && s.status === 'completed' && s.prCount > 0) ||
    progressEvents.filter((e) => e.clientId === clientId && e.metricType === 'strength').length >= 2;

  const unlockMap = new Map(
    existingUnlocks.filter((u) => u.clientId === clientId).map((u) => [u.badgeId, u]),
  );

  const nowIso = new Date().toISOString();
  const newlyUnlocked: AchievementUnlock[] = [];

  const items: AchievementProgressItem[] = ACHIEVEMENT_CATALOG.map((def) => {
    let currentValue = 0;
    if (def.badgeId === 'first_workout') currentValue = Math.min(1, completedWorkoutsCount);
    else if (def.badgeId === 'personal_record') currentValue = hasPr ? 1 : 0;
    else if (def.badgeId === 'consistency_10' || def.badgeId === 'consistency_30') {
      currentValue = activeDaysCount;
    } else {
      currentValue = Math.max(streak.currentStreak, streak.longestStreak);
    }

    const existing = unlockMap.get(def.badgeId);
    const qualified = currentValue >= def.targetValue;
    const unlocked = Boolean(existing) || qualified;

    if (qualified && !existing) {
      newlyUnlocked.push({
        id: `${clientId}_${def.badgeId}`,
        badgeId: def.badgeId,
        clientId,
        title: def.title,
        description: def.description,
        unlockedAt: nowIso,
        metricSnapshot: `${currentValue}/${def.targetValue}`,
      });
    }

    return {
      ...def,
      unlocked,
      currentValue,
      progressPercent: Math.min(100, Math.round((currentValue / def.targetValue) * 100)),
      unlockedAt: existing?.unlockedAt || (qualified ? nowIso : undefined),
    };
  });

  return { items, newlyUnlocked };
}
