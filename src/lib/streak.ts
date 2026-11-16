import type {
  Assignment,
  CompletionEvent,
  DayCompletionStatus,
  DayConsistency,
  StreakSummary,
} from '../types/domain';
import { addDaysToKey } from './date.js';

export function isAssignmentCompletedOnDate(
  assignmentId: string,
  dateKey: string,
  completions: CompletionEvent[],
): boolean {
  return completions.some((c) => c.assignmentId === assignmentId && c.dateKey === dateKey);
}

function normalizeRecoverySet(approvedRecoveryDateKeys?: string[] | Set<string>): Set<string> | undefined {
  if (!approvedRecoveryDateKeys) return undefined;
  return approvedRecoveryDateKeys instanceof Set
    ? approvedRecoveryDateKeys
    : new Set(approvedRecoveryDateKeys);
}

export function computeDayConsistency(
  dateKey: string,
  assignments: Assignment[],
  completions: CompletionEvent[],
  todayKey: string,
  approvedRecoveryDateKeys?: string[] | Set<string>,
): DayConsistency {
  const scheduled = assignments.filter((a) => a.scheduledDates.includes(dateKey));
  const required = scheduled.filter((a) => !a.isOptional);
  const optional = scheduled.filter((a) => a.isOptional);

  const completionSet = new Set(
    completions.filter((c) => c.dateKey === dateKey).map((c) => c.assignmentId),
  );

  const requiredCompleted = required.filter((a) => completionSet.has(a.id)).length;
  const optionalCompleted = optional.filter((a) => completionSet.has(a.id)).length;
  const recoverySet = normalizeRecoverySet(approvedRecoveryDateKeys);
  const trainerApprovedRecovery = Boolean(recoverySet?.has(dateKey)) && dateKey <= todayKey;
  const isRecoveryDay =
    trainerApprovedRecovery ||
    (scheduled.length > 0 &&
      scheduled.every((a) => a.isRecovery || a.isOptional) &&
      required.some((a) => a.isRecovery));

  let status: DayCompletionStatus;

  if (dateKey > todayKey) {
    status = 'future';
  } else if (trainerApprovedRecovery) {
    // Trainer-approved recovery day protects/counts toward consistency.
    status = 'recovery_completed';
  } else if (required.length === 0) {
    // Unscheduled days (or optional-only days) are neutral: never extend or break a streak.
    status = 'neutral';
  } else if (requiredCompleted >= required.length) {
    status = isRecoveryDay ? 'recovery_completed' : 'completed';
  } else if (dateKey === todayKey) {
    // Current day remains pending until completed or until the day passes.
    status = 'pending';
  } else {
    status = 'missed';
  }

  let intensity: 0 | 1 | 2 | 3 | 4 = 0;
  if (trainerApprovedRecovery) {
    intensity = 3;
  } else if (required.length > 0) {
    const ratio = requiredCompleted / required.length;
    if (ratio >= 1) intensity = isRecoveryDay ? 3 : 4;
    else if (ratio >= 0.66) intensity = 3;
    else if (ratio >= 0.34) intensity = 2;
    else if (ratio > 0 || optionalCompleted > 0) intensity = 1;
  } else if (optionalCompleted > 0) {
    intensity = 1;
  }

  return {
    dateKey,
    status,
    requiredTotal: required.length,
    requiredCompleted,
    optionalTotal: optional.length,
    optionalCompleted,
    intensity,
    isRecoveryDay,
  };
}

/**
 * Computes current and longest streak strictly from assignments, completion events,
 * and optional trainer-approved recovery days.
 * Rules:
 * - Eligible day = day with >= 1 required commitment (including recovery commitments) or trainer-approved recovery.
 * - Optional tasks do not affect streak eligibility or completion.
 * - Neutral days (0 required commitments) and future dates neither extend nor break streaks.
 * - Missed past eligible days reset the active run.
 * - Current day may remain pending without breaking yesterday's earned streak.
 */
export function computeStreakSummary(
  assignments: Assignment[],
  completions: CompletionEvent[],
  todayKey: string,
  lookbackDays = 120,
  approvedRecoveryDateKeys?: string[] | Set<string>,
): StreakSummary {
  const recoverySet = normalizeRecoverySet(approvedRecoveryDateKeys);
  const startKey = addDaysToKey(todayKey, -lookbackDays);
  const days: DayConsistency[] = [];

  for (let i = 0; i <= lookbackDays; i += 1) {
    const key = addDaysToKey(startKey, i);
    days.push(computeDayConsistency(key, assignments, completions, todayKey, recoverySet));
  }

  // Longest streak across lookback window
  let longest = 0;
  let running = 0;
  for (const day of days) {
    if (day.status === 'completed' || day.status === 'recovery_completed') {
      running += 1;
      if (running > longest) longest = running;
    } else if (day.status === 'missed') {
      running = 0;
    }
    // neutral & pending (today) do not reset longest counter during scan
  }

  // Current streak walking backwards from today
  let current = 0;
  let lastEligibleDateKey: string | undefined;
  const todayDay = days[days.length - 1];

  for (let idx = days.length - 1; idx >= 0; idx -= 1) {
    const day = days[idx];
    if (day.status === 'completed' || day.status === 'recovery_completed') {
      current += 1;
      if (!lastEligibleDateKey) lastEligibleDateKey = day.dateKey;
    } else if (day.status === 'pending' && day.dateKey === todayKey) {
      // Today hasn't ended yet; keep checking yesterday's run
      continue;
    } else if (day.status === 'neutral' || day.status === 'future') {
      // Unscheduled days are neutral
      continue;
    } else if (day.status === 'missed') {
      break;
    }
  }

  return {
    currentStreak: current,
    longestStreak: Math.max(longest, current),
    todayStatus: todayDay?.status ?? 'neutral',
    lastEligibleDateKey,
    countedLabel: 'Consecutive eligible scheduled days (recovery included; unscheduled days neutral)',
  };
}

export function computeWeeklyStrip(
  todayKey: string,
  assignments: Assignment[],
  completions: CompletionEvent[],
  approvedRecoveryDateKeys?: string[] | Set<string>,
): DayConsistency[] {
  const recoverySet = normalizeRecoverySet(approvedRecoveryDateKeys);
  const list: DayConsistency[] = [];
  for (let offset = -6; offset <= 0; offset += 1) {
    const key = addDaysToKey(todayKey, offset);
    list.push(computeDayConsistency(key, assignments, completions, todayKey, recoverySet));
  }
  return list;
}

export function computeHeatmapGrid(
  todayKey: string,
  weeks: number,
  assignments: Assignment[],
  completions: CompletionEvent[],
  approvedRecoveryDateKeys?: string[] | Set<string>,
): DayConsistency[] {
  const recoverySet = normalizeRecoverySet(approvedRecoveryDateKeys);
  const totalDays = weeks * 7;
  const startKey = addDaysToKey(todayKey, -(totalDays - 1));
  const list: DayConsistency[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const key = addDaysToKey(startKey, i);
    list.push(computeDayConsistency(key, assignments, completions, todayKey, recoverySet));
  }
  return list;
}

export function computeClientAdherencePercent(
  clientId: string,
  assignments: Assignment[],
  completions: CompletionEvent[],
  todayKey: string,
  days = 7,
  approvedRecoveryDateKeys?: string[] | Set<string>,
): number {
  const recoverySet = normalizeRecoverySet(approvedRecoveryDateKeys);
  const clientAssignments = assignments.filter((a) => a.clientId === clientId);
  const clientCompletions = completions.filter((c) => c.clientId === clientId);
  let requiredTotal = 0;
  let requiredCompleted = 0;

  for (let offset = -(days - 1); offset <= 0; offset += 1) {
    const key = addDaysToKey(todayKey, offset);
    const day = computeDayConsistency(key, clientAssignments, clientCompletions, todayKey, recoverySet);
    if (day.status === 'recovery_completed') {
      const credit = Math.max(1, day.requiredTotal);
      requiredTotal += credit;
      requiredCompleted += credit;
    } else if (key < todayKey || day.requiredCompleted > 0) {
      requiredTotal += day.requiredTotal;
      requiredCompleted += day.requiredCompleted;
    }
  }

  if (requiredTotal === 0) return 100;
  return Math.min(100, Math.round((requiredCompleted / requiredTotal) * 100));
}
