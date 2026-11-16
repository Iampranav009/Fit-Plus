import type {
  AchievementUnlock,
  Assignment,
  CompletionEvent,
  ProgressEvent,
  WorkoutSession,
  WrappedMonthlySummary,
} from '../types/domain';
import { computeDayConsistency, computeStreakSummary } from './streak';

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function getAvailableMonthKeys(todayKey: string, count = 4): string[] {
  const [y, m] = todayKey.slice(0, 7).split('-').map(Number);
  if (!y || !m) return [todayKey.slice(0, 7)];
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    keys.push(`${yy}-${mm}`);
  }
  return keys;
}

export function computeMonthlyWrappedSummary(params: {
  clientId: string;
  monthKey: string;
  todayKey: string;
  assignments: Assignment[];
  completions: CompletionEvent[];
  approvedRecoveryDates: string[];
  workoutSessions: WorkoutSession[];
  achievements: AchievementUnlock[];
  progressEvents: ProgressEvent[];
  includeWeightChange?: boolean;
}): WrappedMonthlySummary {
  const {
    clientId,
    monthKey,
    todayKey,
    assignments,
    completions,
    approvedRecoveryDates,
    workoutSessions,
    achievements,
    progressEvents,
    includeWeightChange = false,
  } = params;

  const clientAssignments = assignments.filter((a) => a.clientId === clientId);
  const clientCompletions = completions.filter(
    (c) => c.clientId === clientId && c.dateKey.startsWith(monthKey),
  );
  const monthSessions = workoutSessions.filter(
    (s) => s.clientId === clientId && s.status === 'completed' && s.dateKey.startsWith(monthKey),
  );

  // Count distinct workout sessions from live sessions + workout commitment completions not covered by a live session
  const sessionAssignmentDates = new Set(
    monthSessions.map((s) => `${s.assignmentId || ''}_${s.dateKey}`),
  );
  const extraWorkoutCompletions = clientCompletions.filter((c) => {
    const asg = clientAssignments.find((a) => a.id === c.assignmentId);
    if (!asg || asg.category !== 'workout') return false;
    return !sessionAssignmentDates.has(`${c.assignmentId}_${c.dateKey}`);
  });

  const workoutsCompleted = monthSessions.length + extraWorkoutCompletions.length;
  const sessionMinutes = monthSessions.reduce(
    (sum, s) => sum + Math.max(1, Math.round(s.durationSeconds / 60)),
    0,
  );
  const extraMinutes = extraWorkoutCompletions.reduce((sum, c) => {
    const asg = clientAssignments.find((a) => a.id === c.assignmentId);
    return sum + (asg?.durationMinutes || 35);
  }, 0);
  const totalTrainingMinutes = sessionMinutes + extraMinutes;
  const totalVolumeKg = monthSessions.reduce((sum, s) => sum + (s.totalVolumeKg || 0), 0);
  const prsAchieved = monthSessions.reduce((sum, s) => sum + (s.prCount || 0), 0);

  // Top exercise by completed sets in month
  const exerciseSets = new Map<string, number>();
  for (const s of monthSessions) {
    for (const ex of s.exercises) {
      const done = ex.sets.filter((st) => st.completed).length;
      if (done > 0) {
        exerciseSets.set(ex.exerciseName, (exerciseSets.get(ex.exerciseName) || 0) + done);
      }
    }
  }
  let topExercise: string | undefined;
  let topSets = 0;
  for (const [name, cnt] of exerciseSets.entries()) {
    if (cnt > topSets) {
      topSets = cnt;
      topExercise = name;
    }
  }

  // Monthly consistency across all dates in month up to todayKey
  const [yy, mm] = monthKey.split('-').map(Number);
  const daysInMonth = yy && mm ? new Date(Date.UTC(yy, mm, 0)).getUTCDate() : 30;
  let scheduledDays = 0;
  let completedDays = 0;
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateKey = `${monthKey}-${String(d).padStart(2, '0')}`;
    if (dateKey > todayKey) break;
    const consistency = computeDayConsistency(
      dateKey,
      clientAssignments,
      completions.filter((c) => c.clientId === clientId),
      todayKey,
      approvedRecoveryDates,
    );
    if (consistency.requiredTotal > 0) {
      scheduledDays += 1;
      if (consistency.status === 'completed' || consistency.status === 'recovery_completed') {
        completedDays += 1;
      }
    }
  }
  const consistencyPercent =
    scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : 0;

  const streak = computeStreakSummary(
    clientAssignments,
    completions.filter((c) => c.clientId === clientId),
    todayKey,
    120,
    approvedRecoveryDates,
  );

  const achievementsEarned = achievements.filter(
    (a) => a.clientId === clientId && a.unlockedAt.startsWith(monthKey),
  ).length;

  let optionalWeightChangeKg: number | undefined;
  if (includeWeightChange) {
    const weights = progressEvents
      .filter((p) => p.clientId === clientId && p.metricType === 'weight' && p.dateKey.startsWith(monthKey))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    if (weights.length >= 2) {
      optionalWeightChangeKg =
        Math.round((weights[weights.length - 1].value - weights[0].value) * 10) / 10;
    }
  }

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    workoutsCompleted,
    totalWorkoutsCompleted: workoutsCompleted,
    totalTrainingMinutes,
    totalVolumeKg,
    consistencyPercent,
    longestStreakDays: streak.longestStreak,
    prsAchieved,
    commitmentsCompleted: clientCompletions.length,
    achievementsEarned,
    topExercise,
    optionalWeightChangeKg,
  };
}

export function renderWrappedCardToDataUrl(params: {
  summary: WrappedMonthlySummary;
  memberFirstName: string;
  format: 'story_9_16' | 'post_4_5';
  includeWeightChange: boolean;
  highlightNote?: string;
}): string | null {
  if (typeof document === 'undefined') return null;
  const { summary, memberFirstName, format, includeWeightChange, highlightNote } = params;
  const width = 1080;
  const height = format === 'story_9_16' ? 1920 : 1350;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deep nocturnal liquid-glass backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090B10');
  bgGrad.addColorStop(0.5, '#101218');
  bgGrad.addColorStop(1, '#181C24');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient orange radial glow
  const radial = ctx.createRadialGradient(width * 0.8, height * 0.16, 40, width * 0.8, height * 0.16, 620);
  radial.addColorStop(0, 'rgba(255, 128, 62, 0.28)');
  radial.addColorStop(1, 'rgba(255, 128, 62, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  // Brand header
  ctx.fillStyle = '#FF803E';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  ctx.fillText('FITPLUS WRAPPED', 84, 130);

  ctx.fillStyle = '#F5F5F7';
  ctx.font = '700 74px Inter, system-ui, sans-serif';
  ctx.fillText(summary.monthLabel, 84, 224);

  ctx.fillStyle = '#A2A8B5';
  ctx.font = '500 34px Inter, system-ui, sans-serif';
  ctx.fillText(`${memberFirstName}'s monthly training & habit recap`, 84, 282);

  // Metric tiles (2x2 grid)
  const tiles = [
    { label: 'Workouts finished', value: String(summary.workoutsCompleted), accent: '#FF803E' },
    { label: 'Training minutes', value: `${summary.totalTrainingMinutes}m`, accent: '#70C8ED' },
    { label: 'Monthly consistency', value: `${summary.consistencyPercent}%`, accent: '#B8E66C' },
    { label: 'Best streak', value: `${summary.longestStreakDays} days`, accent: '#C1ACF9' },
  ];

  const cardW = 434;
  const cardH = format === 'story_9_16' ? 280 : 210;
  const startY = format === 'story_9_16' ? 390 : 350;
  const gap = 44;

  tiles.forEach((tile, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 84 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    ctx.fillStyle = 'rgba(28, 32, 41, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 36);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#A2A8B5';
    ctx.font = '500 28px Inter, system-ui, sans-serif';
    ctx.fillText(tile.label, x + 36, y + 72);

    ctx.fillStyle = tile.accent;
    ctx.font = '700 84px Inter, system-ui, sans-serif';
    ctx.fillText(tile.value, x + 36, y + (format === 'story_9_16' ? 190 : 162));
  });

  // Secondary highlights strip
  const footerCardY = startY + 2 * (cardH + gap) + 20;
  ctx.fillStyle = 'rgba(37, 42, 53, 0.85)';
  ctx.beginPath();
  ctx.roundRect(84, footerCardY, width - 168, format === 'story_9_16' ? 330 : 220, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.stroke();

  ctx.fillStyle = '#F5F5F7';
  ctx.font = '600 32px Inter, system-ui, sans-serif';
  ctx.fillText(`Commitments logged: ${summary.commitmentsCompleted}`, 124, footerCardY + 80);
  ctx.fillText(
    summary.totalVolumeKg > 0
      ? `Total lifted volume: ${summary.totalVolumeKg.toLocaleString('en-IN')} kg`
      : `PRs achieved: ${summary.prsAchieved}`,
    124,
    footerCardY + 142,
  );

  let nextY = footerCardY + 204;
  if (includeWeightChange && summary.optionalWeightChangeKg !== undefined) {
    const sign = summary.optionalWeightChangeKg > 0 ? '+' : '';
    ctx.fillStyle = '#B8E66C';
    ctx.fillText(
      `Weight change (opted in): ${sign}${summary.optionalWeightChangeKg} kg`,
      124,
      nextY,
    );
    nextY += 56;
  } else if (highlightNote && highlightNote.trim()) {
    ctx.fillStyle = '#FFB06B';
    ctx.font = '500 28px Inter, system-ui, sans-serif';
    ctx.fillText(highlightNote.trim().slice(0, 56), 124, nextY);
  }

  ctx.fillStyle = '#7C8393';
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  ctx.fillText('Coached on FitPlus · Built on authentic activity', 84, height - 88);

  return canvas.toDataURL('image/png');
}
