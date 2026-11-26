import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Check, ChevronRight, Droplets, Plus, Share2, Sparkles } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { addDaysToKey, formatIndiaDate, getGreetingPeriod } from '../../lib/date';
import { computeNutritionTotals } from '../../data/indianFoods';
import { generateReferralCode } from '../../lib/referralEngine';
import {
  computeDayConsistency,
  computeStreakSummary,
  computeWeeklyStrip,
  isAssignmentCompletedOnDate,
} from '../../lib/streak';
import { AppShell } from '../../components/layout/AppShell';
import { ActivityRing } from '../../components/ui/ActivityRing';
import { StreakIndicator } from '../../components/ui/StreakIndicator';
import { StreakIntroModal } from '../../components/ui/StreakIntroModal';
import { StreakFlameSvg, MuscleGroupEmblem } from '../../components/ui/FitnessIllustrations';
import { TaskRow } from '../../components/ui/TaskRow';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { GlassButton } from '../../components/ui/GlassButton';
import { FloatingActionButton } from '../../components/ui/FloatingActionButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { MediaImage } from '../../components/ui/MediaImage';
import { InputField } from '../../components/ui/InputField';
import { ReferralCard } from '../../components/ui/ReferralCard';
import { SocialShareCardModal } from '../../components/ui/SocialShareCardModal';

export const TodayPage: React.FC = () => {
  const {
    store,
    todayKey,
    activeUser,
    activeClient,
    activeCoach,
    isCloudSynced,
    todayHydrationGlasses,
    setTodayHydrationGlasses,
    nutritionLogs,
    celebrateStreakToday,
    dismissStreakCelebration,
    toggleAssignmentCompletion,
    addProgressMeasurement,
    getClientApprovedRecoveryDates,
  } = useApp();
  const navigate = useNavigate();

  const [streakSheetOpen, setStreakSheetOpen] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [quickWeightOpen, setQuickWeightOpen] = useState(false);
  const [quickWeight, setQuickWeight] = useState(
    activeClient?.weightKg ? String(activeClient.weightKg) : '75.0',
  );
  const [quickNote, setQuickNote] = useState('');
  const [quickError, setQuickError] = useState('');
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);

  const waterGlasses = todayHydrationGlasses;
  const updateWater = setTodayHydrationGlasses;

  const clientAssignments = useMemo(() => {
    if (!activeClient) return [];
    return store.assignments.filter((a) => a.clientId === activeClient.id);
  }, [store.assignments, activeClient]);

  const clientCompletions = useMemo(() => {
    if (!activeClient) return [];
    return store.completions.filter((c) => c.clientId === activeClient.id);
  }, [store.completions, activeClient]);

  const approvedRecoveryDates = useMemo(() => {
    if (!activeClient) return [];
    return getClientApprovedRecoveryDates(activeClient.id);
  }, [activeClient, getClientApprovedRecoveryDates]);

  const todayTasks = useMemo(
    () => clientAssignments.filter((a) => a.scheduledDates.includes(todayKey)),
    [clientAssignments, todayKey],
  );

  const todaySummary = useMemo(
    () =>
      computeDayConsistency(
        todayKey,
        clientAssignments,
        clientCompletions,
        todayKey,
        approvedRecoveryDates,
      ),
    [todayKey, clientAssignments, clientCompletions, approvedRecoveryDates],
  );

  const yesterdaySummary = useMemo(
    () =>
      computeDayConsistency(
        addDaysToKey(todayKey, -1),
        clientAssignments,
        clientCompletions,
        todayKey,
        approvedRecoveryDates,
      ),
    [todayKey, clientAssignments, clientCompletions, approvedRecoveryDates],
  );

  const streak = useMemo(
    () =>
      computeStreakSummary(
        clientAssignments,
        clientCompletions,
        todayKey,
        120,
        approvedRecoveryDates,
      ),
    [clientAssignments, clientCompletions, todayKey, approvedRecoveryDates],
  );

  const weeklyStrip = useMemo(
    () =>
      computeWeeklyStrip(
        todayKey,
        clientAssignments,
        clientCompletions,
        approvedRecoveryDates,
      ),
    [todayKey, clientAssignments, clientCompletions, approvedRecoveryDates],
  );

  const mealPlan = useMemo(
    () => store.mealPlans.find((m) => m.clientId === activeClient?.id),
    [store.mealPlans, activeClient?.id],
  );

  const todayNutrition = useMemo(() => {
    return nutritionLogs.find(
      (l) => (!activeClient || l.clientId === activeClient.id) && l.dateKey === todayKey,
    );
  }, [nutritionLogs, activeClient, todayKey]);

  const nutritionTotals = useMemo(() => {
    return computeNutritionTotals(todayNutrition?.items || []);
  }, [todayNutrition]);

  const nextConsultation = useMemo(() => {
    if (!activeClient) return undefined;
    return store.bookings
      .filter(
        (b) =>
          b.clientId === activeClient.id &&
          (b.status === 'booked' || b.status === 'rescheduled') &&
          b.dateKey >= todayKey,
      )
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0];
  }, [store.bookings, activeClient, todayKey]);

  const completionPercent =
    todaySummary.requiredTotal === 0
      ? todaySummary.optionalCompleted > 0
        ? 100
        : 0
      : Math.round((todaySummary.requiredCompleted / todaySummary.requiredTotal) * 100);

  // Category ring metrics derived strictly from today's commitments + local hydration goal (8 glasses)
  const ringMetrics = useMemo(() => {
    const workoutTasks = todayTasks.filter((t) => t.category === 'workout');
    const workoutDone = workoutTasks.filter((t) =>
      isAssignmentCompletedOnDate(t.id, todayKey, clientCompletions),
    ).length;
    const workoutPct =
      workoutTasks.length > 0 ? Math.round((workoutDone / workoutTasks.length) * 100) : completionPercent;

    const hydrationPct = Math.min(100, Math.round((waterGlasses / 8) * 100));

    const recoveryTasks = todayTasks.filter((t) => t.category === 'recovery' || t.category === 'habit');
    const recoveryDone = recoveryTasks.filter((t) =>
      isAssignmentCompletedOnDate(t.id, todayKey, clientCompletions),
    ).length;
    const recoveryPct =
      recoveryTasks.length > 0
        ? Math.round((recoveryDone / recoveryTasks.length) * 100)
        : todaySummary.isRecoveryDay
          ? completionPercent
          : 0;

    return [
      { label: 'Training', percent: workoutPct, color: '#FF803E' },
      { label: 'Hydration', percent: hydrationPct, color: '#70C8ED' },
      { label: 'Recovery & habits', percent: recoveryPct, color: '#C1ACF9' },
    ];
  }, [todayTasks, todayKey, clientCompletions, completionPercent, waterGlasses, todaySummary.isRecoveryDay]);

  const primarySpotlight = useMemo(() => {
    return (
      todayTasks.find((t) => t.category === 'workout') ??
      todayTasks.find((t) => !isAssignmentCompletedOnDate(t.id, todayKey, clientCompletions)) ??
      todayTasks[0]
    );
  }, [todayTasks, todayKey, clientCompletions]);

  const spotlightDone = primarySpotlight
    ? isAssignmentCompletedOnDate(primarySpotlight.id, todayKey, clientCompletions)
    : false;

  const sessionIntroKey = `fitplus_streak_intro_${activeUser.id}_${todayKey}`;
  const seenIntroToday =
    typeof window !== 'undefined' && window.sessionStorage.getItem(sessionIntroKey) === '1';

  const shouldShowStreakIntro =
    !introDismissed &&
    (celebrateStreakToday || (streak.currentStreak > 0 && !seenIntroToday));

  const handleCloseStreakIntro = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(sessionIntroKey, '1');
    }
    setIntroDismissed(true);
    if (celebrateStreakToday) {
      dismissStreakCelebration();
    }
  };

  const period = getGreetingPeriod(activeUser.timezone);
  const greetingText = formatCopy(COPY.client.greetings[period], {
    firstName: activeUser.firstName,
  });

  const allDoneToday =
    todaySummary.requiredTotal > 0 &&
    todaySummary.requiredCompleted >= todaySummary.requiredTotal;

  const handleQuickWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(quickWeight);
    if (!Number.isFinite(num) || num <= 0 || num > 400) {
      setQuickError('Enter a valid positive weight in kg.');
      return;
    }
    setQuickError('');
    addProgressMeasurement({
      dateKey: todayKey,
      metricType: 'weight',
      label: 'Body weight',
      value: Math.round(num * 10) / 10,
      unit: 'kg',
      note: quickNote.trim() || undefined,
    });
    setQuickNote('');
    setQuickWeightOpen(false);
  };

  const streakHeaderButton = (
    <StreakIndicator
      count={streak.currentStreak}
      celebrate={celebrateStreakToday}
      onClick={() => setStreakSheetOpen(true)}
    />
  );

  return (
    <AppShell headerRight={streakHeaderButton} pageTitle="Today">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* 1. Personalized Greeting + Date */}
        <section>
          <p className="text-[13px] text-[#7C8393]">{formatIndiaDate(todayKey, 'long')}</p>
          <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
            {greetingText}
          </h1>
        </section>

        {/* 2. Daily ActivityRing Hero */}
        <section
          aria-label="Daily progress summary"
          className="relative min-h-[224px] rounded-[26px] surface-card overflow-hidden flex items-center"
        >
          <div className="hidden sm:block absolute inset-y-0 right-0 w-1/2 pointer-events-none">
            <MediaImage
              assetKey="todayHero"
              alt=""
              aspectClass="w-full h-full"
              imgClassName="object-cover object-right opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1C2029] via-[#1C2029]/75 to-transparent" />
          </div>

          <div className="relative z-10 w-full p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-md">
              <p className="text-[13px] font-medium text-[#FFB06B]">
                {todaySummary.isRecoveryDay
                  ? COPY.client.recoveryTitle
                  : allDoneToday
                    ? COPY.client.heroCompleteSupport
                    : COPY.client.heroSupport}
              </p>
              <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[#F5F5F7] leading-snug">
                {todaySummary.requiredTotal === 0
                  ? COPY.client.noTasksTitle
                  : allDoneToday
                    ? COPY.client.heroCompleteTitle
                    : COPY.client.heroTitle}
              </h2>
              <p className="text-[14px] text-[#A2A8B5] tabular-nums">
                {todaySummary.requiredTotal === 0
                  ? COPY.client.noTasksSupport
                  : formatCopy(COPY.client.heroProgress, {
                      completed: todaySummary.requiredCompleted,
                      total: todaySummary.requiredTotal,
                    })}
              </p>

              {/* Ring Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-[12px] text-[#A2A8B5] tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF803E]" aria-hidden="true" />
                  Training {ringMetrics[0].percent}%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#70C8ED]" aria-hidden="true" />
                  Hydration {ringMetrics[1].percent}%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C1ACF9]" aria-hidden="true" />
                  Recovery {ringMetrics[2].percent}%
                </span>
              </div>

              {yesterdaySummary.status === 'missed' && !allDoneToday ? (
                <p className="text-[13px] text-[#7C8393] mt-1">
                  {COPY.client.missedDaySupport}
                </p>
              ) : null}
            </div>

            <div className="self-center sm:self-auto">
              <ActivityRing
                percent={completionPercent}
                rings={ringMetrics}
                size={132}
                strokeWidth={9}
                centerValue={`${completionPercent}%`}
                centerCaption="today"
                label={`${completionPercent}% of today's required commitments complete`}
              />
            </div>
          </div>
        </section>

        {/* Recovery Awareness Message */}
        {todaySummary.isRecoveryDay ? (
          <section className="rounded-[18px] surface-elevated px-4 py-3.5 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#C1ACF9] shrink-0" aria-hidden="true" />
            <p className="text-[14px] text-[#A2A8B5]">
              {COPY.client.recoveryTitle} {COPY.client.recoverySupport}
            </p>
          </section>
        ) : null}

        {/* 3. Today's Primary Workout / Coaching Spotlight */}
        {primarySpotlight ? (
          <section
            aria-label="Primary commitment spotlight"
            className="rounded-[22px] surface-card p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              {primarySpotlight.category === 'workout' ? (
                <MediaImage
                  assetKey="illusDumbbell"
                  alt=""
                  aspectClass="w-14 h-14 rounded-[16px] shrink-0"
                />
              ) : (
                <MuscleGroupEmblem focus="conditioning" size={52} />
              )}
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#FFB06B]">
                  {spotlightDone ? 'Primary commitment complete' : "Today's focus"}
                </p>
                <h2 className="text-[17px] font-semibold text-[#F5F5F7] truncate">
                  {primarySpotlight.title}
                </h2>
                <p className="text-[13px] text-[#A2A8B5] tabular-nums truncate">
                  {primarySpotlight.durationMinutes} min · Due {primarySpotlight.dueTime}
                  {primarySpotlight.targetLabel ? ` · ${primarySpotlight.targetLabel}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {primarySpotlight.category === 'workout' && !spotlightDone && (
                <Link
                  to="/app/workout"
                  className="px-3.5 py-2 rounded-[12px] bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white text-[13px] font-semibold hover:brightness-105 shadow-md shadow-[#FF803E]/20 inline-flex items-center gap-1.5 transition-all"
                >
                  <span>Start Live Workout</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
              <Link
                to={`/app/tasks/${primarySpotlight.id}`}
                className="glass-control min-h-[44px] px-3.5 rounded-[12px] text-[13px] font-semibold text-[#F5F5F7] hover:border-[#FF803E]/60 inline-flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {spotlightDone ? 'Review' : 'Open'}
                <ArrowRight className="w-3.5 h-3.5 text-[#FF803E]" aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : null}

        {/* 4. Daily Task Checklist */}
        <section aria-label={COPY.client.todaysCommitments} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold text-[#F5F5F7]">
              {COPY.client.todaysCommitments}
            </h2>
            <Link
              to="/app/plan"
              className="text-[14px] font-medium text-[#FFB06B] hover:text-[#FF803E] inline-flex items-center gap-1 min-h-[44px] transition-colors"
            >
              {COPY.client.viewPlan}
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <EmptyState
              artwork="plan"
              title={COPY.client.noTasksTitle}
              description={COPY.client.noTasksSupport}
              actionLabel={COPY.client.viewPlan}
              onAction={() => navigate('/app/plan')}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {todayTasks.map((task) => {
                const done = isAssignmentCompletedOnDate(
                  task.id,
                  todayKey,
                  clientCompletions,
                );
                return (
                  <TaskRow
                    key={task.id}
                    assignment={task}
                    completed={done}
                    onToggle={() => toggleAssignmentCompletion(task.id, todayKey)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* 5. Nutrition & Hydration Overview */}
        <section
          aria-label="Nutrition and hydration overview"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="surface-card rounded-[20px] p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <MediaImage
                assetKey="illusHydration"
                alt=""
                aspectClass="w-12 h-12 rounded-[14px] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[12px] text-[#70C8ED] font-medium flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                  Daily hydration
                </p>
                <p className="text-[17px] font-semibold text-[#F5F5F7] tabular-nums mt-0.5">
                  {waterGlasses} / 8 glasses
                </p>
                <p className="text-[12px] text-[#7C8393] tabular-nums">
                  {waterGlasses * 250} ml · {isCloudSynced ? 'Synced to your FitPlus account' : 'Saved in demo preview'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => updateWater(waterGlasses - 1)}
                disabled={waterGlasses <= 0}
                aria-label="Decrease water glasses"
                className="glass-control min-h-[44px] min-w-[44px] rounded-[12px] text-[16px] font-semibold text-[#A2A8B5] hover:text-[#F5F5F7] disabled:opacity-40 cursor-pointer"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => updateWater(waterGlasses + 1)}
                disabled={waterGlasses >= 12}
                aria-label="Add 1 glass of water"
                className="min-h-[44px] min-w-[44px] rounded-[12px] bg-[#70C8ED]/18 border border-[#70C8ED]/45 text-[16px] font-semibold text-[#70C8ED] hover:bg-[#70C8ED]/28 disabled:opacity-40 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <Link
            to="/app/nutrition"
            className="surface-card rounded-[20px] p-4 sm:p-5 flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <MediaImage
                assetKey="foodBreakfast"
                alt=""
                aspectClass="w-12 h-12 rounded-[14px] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[12px] text-[#B8E66C] font-medium flex items-center gap-1">
                  <span>Daily Nutrition Diary</span>
                  {todayNutrition?.trainerFeedback ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FF803E]/20 text-[#FF803E] font-bold">
                      Coach Note
                    </span>
                  ) : null}
                </p>
                <p className="text-[15px] font-semibold text-[#F5F5F7] truncate mt-0.5">
                  {todayNutrition?.items?.length
                    ? `Est. ${nutritionTotals.calories} kcal · ${nutritionTotals.proteinG}g protein`
                    : 'Tap to log Indian meals & macros'}
                </p>
                <p className="text-[12px] text-[#7C8393] truncate">
                  {todayNutrition?.items?.length
                    ? `${todayNutrition.items.length} items logged today`
                    : 'Track dal, roti, paneer, eggs & whey'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C8393] shrink-0" aria-hidden="true" />
          </Link>
        </section>

        {/* Stage 4A: Weekly Reflection & Wrapped Spotlight */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/app/check-in"
            className="surface-card rounded-[20px] p-4 sm:p-5 flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-[14px] bg-[#B8E66C]/15 border border-[#B8E66C]/30 flex items-center justify-center text-[#B8E66C] shrink-0">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-[#B8E66C] font-semibold uppercase tracking-wider">
                  Weekly Reflection
                </p>
                <p className="text-[15px] font-bold text-white truncate mt-0.5">
                  Coach Accountability Check-in
                </p>
                <p className="text-[12px] text-[#7C8393] truncate">
                  Log energy, sleep, hunger and read weekly coach review
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C8393] shrink-0" />
          </Link>

          <Link
            to="/app/wrapped"
            className="surface-card rounded-[20px] p-4 sm:p-5 flex items-center justify-between gap-3 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-[14px] bg-[#FF803E]/15 border border-[#FF803E]/30 flex items-center justify-center text-[#FF803E] shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-[#FF803E] font-semibold uppercase tracking-wider">
                  FitPlus Wrapped
                </p>
                <p className="text-[15px] font-bold text-white truncate mt-0.5">
                  Your Monthly Training Story
                </p>
                <p className="text-[12px] text-[#7C8393] truncate">
                  View volume records & generate shareable cards
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7C8393] shrink-0" />
          </Link>
        </section>

        {/* 6. Weekly 7-Day Consistency Summary */}
        <section
          aria-label="Weekly consistency"
          className="surface-card rounded-[22px] p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[16px] font-semibold text-[#F5F5F7]">Last 7 days</h2>
            <button
              type="button"
              onClick={() => setStreakSheetOpen(true)}
              className="text-[13px] font-medium text-[#FFB06B] hover:text-[#FF803E] cursor-pointer min-h-[36px] transition-colors"
            >
              {COPY.client.howStreaksWork}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weeklyStrip.map((day) => {
              const label = formatIndiaDate(day.dateKey, 'weekday');
              const isToday = day.dateKey === todayKey;
              let dotClass = 'bg-[#252A35] border-white/10 text-[#7C8393]';
              let statusText = 'Rest / unscheduled';
              if (day.status === 'completed') {
                dotClass = 'bg-[#FF803E] border-[#FF803E] text-[#101218]';
                statusText = 'Complete';
              } else if (day.status === 'recovery_completed') {
                dotClass = 'bg-[#C1ACF9]/20 border-[#C1ACF9] text-[#C1ACF9]';
                statusText = 'Recovery complete';
              } else if (day.status === 'pending') {
                dotClass = 'bg-[#252A35] border-[#FF803E]/70 text-[#F5F5F7]';
                statusText = 'In progress today';
              } else if (day.status === 'missed') {
                dotClass = 'bg-[#101218] border-white/10 text-[#7C8393]';
                statusText = 'Incomplete';
              }

              return (
                <div
                  key={day.dateKey}
                  aria-label={`${label}: ${statusText}`}
                  className={`rounded-[14px] border py-2.5 px-1 flex flex-col items-center gap-1.5 text-center ${
                    isToday ? 'border-[#FF803E]/55 bg-[#252A35]/70' : 'border-transparent'
                  }`}
                >
                  <span className="text-[11px] text-[#7C8393] tabular-nums">
                    {label.split(' ')[0]}
                  </span>
                  <span
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-[12px] font-semibold tabular-nums ${dotClass}`}
                  >
                    {day.dateKey.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7 & 8. Active Trainer & Upcoming Consultation */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeCoach ? (
            <div className="surface-card rounded-[20px] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <MediaImage
                  assetKey={activeCoach.avatarKey}
                  alt={activeCoach.displayName}
                  aspectClass="w-12 h-12 rounded-[14px] shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[12px] text-[#7C8393]">Your coach</p>
                  <p className="text-[15px] font-semibold text-[#F5F5F7] truncate">
                    {activeCoach.displayName}
                  </p>
                  <p className="text-[12px] text-[#A2A8B5] truncate">
                    {activeCoach.specialties[0]}
                  </p>
                </div>
              </div>
              <Link
                to="/app/coach"
                className="glass-control min-h-[44px] px-3.5 py-2 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center shrink-0"
              >
                Open
              </Link>
            </div>
          ) : (
            <div className="surface-card rounded-[20px] p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] text-[#7C8393]">Coaching</p>
                <p className="text-[15px] font-semibold text-[#F5F5F7]">
                  {COPY.client.noCoachTitle}
                </p>
              </div>
              <Link
                to="/discover"
                className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#FF803E] text-[#101218] text-[13px] font-semibold inline-flex items-center shrink-0"
              >
                Explore
              </Link>
            </div>
          )}

          {nextConsultation ? (
            <div className="surface-card rounded-[20px] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-[14px] bg-[#FF803E]/14 border border-[#FF803E]/30 text-[#FF803E] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-[#7C8393]">Next consultation</p>
                  <p className="text-[15px] font-semibold text-[#F5F5F7] tabular-nums">
                    {formatIndiaDate(nextConsultation.dateKey, 'short')} · {nextConsultation.startTime}
                  </p>
                  <p className="text-[12px] text-[#A2A8B5] truncate">{nextConsultation.topic}</p>
                </div>
              </div>
              <Link
                to="/app/consultations"
                className="glass-control min-h-[44px] px-3.5 py-2 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] hover:border-white/25 inline-flex items-center shrink-0"
              >
                Details
              </Link>
            </div>
          ) : (
            <div className="surface-card rounded-[20px] p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] text-[#7C8393]">Consultations</p>
                <p className="text-[15px] font-medium text-[#A2A8B5]">
                  No consultation booked yet
                </p>
              </div>
              <Link
                to="/app/consultations"
                className="glass-control min-h-[44px] px-3.5 py-2 rounded-[12px] text-[13px] font-medium text-[#F5F5F7] inline-flex items-center shrink-0"
              >
                Schedule
              </Link>
            </div>
          )}
        </section>

      </div>

      {/* Floating Quick-Log Action Button */}
      <div className="fixed right-4 bottom-24 lg:right-8 lg:bottom-8 z-20">
        <FloatingActionButton
          label="Quick log weight check-in"
          icon={<Plus className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />}
          onClick={() => {
            setQuickWeight(activeClient?.weightKg ? String(activeClient.weightKg) : '75.0');
            setQuickError('');
            setQuickWeightOpen(true);
          }}
        />
      </div>

      {/* Quick Weight Check-in Sheet */}
      <GlassSheet
        open={quickWeightOpen}
        onClose={() => setQuickWeightOpen(false)}
        title="Quick weight check-in"
        description={`Logged for ${formatIndiaDate(todayKey, 'short')}`}
      >
        <form onSubmit={handleQuickWeightSubmit} className="flex flex-col gap-4">
          <InputField
            label="Body weight"
            unit="kg"
            inputMode="decimal"
            value={quickWeight}
            onChange={(e) => setQuickWeight(e.target.value)}
            error={quickError}
          />
          <InputField
            label="Note"
            optionalTag="Optional"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="e.g., Morning check-in"
          />
          <div className="flex gap-2.5 pt-1">
            <GlassButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setQuickWeightOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth>
              Save check-in
            </GlassButton>
          </div>
        </form>
      </GlassSheet>

      {/* Streak Details Sheet */}
      <GlassSheet
        open={streakSheetOpen}
        onClose={() => setStreakSheetOpen(false)}
        title={formatCopy(COPY.client.streakCount, { count: streak.currentStreak })}
        description={streak.countedLabel}
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[16px] surface-elevated p-4">
              <p className="text-[12px] text-[#7C8393]">Current streak</p>
              <p className="mt-1 text-[28px] font-semibold text-[#F5F5F7] tabular-nums flex items-center gap-2">
                <StreakFlameSvg size={22} active={streak.currentStreak > 0} />
                {streak.currentStreak} days
              </p>
            </div>
            <div className="rounded-[16px] surface-elevated p-4">
              <p className="text-[12px] text-[#7C8393]">{COPY.client.longestStreak}</p>
              <p className="mt-1 text-[28px] font-semibold text-[#F5F5F7] tabular-nums">
                {streak.longestStreak} days
              </p>
            </div>
          </div>

          <div className="rounded-[16px] surface-elevated p-4">
            <p className="text-[14px] font-semibold text-[#F5F5F7] mb-2">
              {COPY.client.howStreaksWork}
            </p>
            <p className="text-[14px] text-[#A2A8B5] leading-relaxed">
              {COPY.client.streakRules}
            </p>
            <p className="mt-2 text-[12px] text-[#7C8393]">
              {COPY.client.streakNote} Opening the app alone never adds to your streak.
            </p>
          </div>

          {streak.currentStreak > 0 && (
            <GlassButton
              fullWidth
              variant="primary"
              onClick={() => {
                setStreakSheetOpen(false);
                setIsShareCardOpen(true);
              }}
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share Streak Story
            </GlassButton>
          )}

          <GlassButton
            fullWidth
            variant="secondary"
            onClick={() => {
              setStreakSheetOpen(false);
              navigate('/app/progress');
            }}
          >
            {COPY.client.consistencyCalendar}
          </GlassButton>
        </div>
      </GlassSheet>

      {/* Daily Streak Intro Modal (Snapchat-inspired calm entry / completion milestone) */}
      <StreakIntroModal
        open={shouldShowStreakIntro}
        streakCount={streak.currentStreak}
        longestStreak={streak.longestStreak}
        weeklyStrip={weeklyStrip}
        todayKey={todayKey}
        isMilestone={celebrateStreakToday}
        onContinue={handleCloseStreakIntro}
      />

      {/* Stage 4C Viral Story & Share Modal */}
      <SocialShareCardModal
        isOpen={isShareCardOpen}
        onClose={() => setIsShareCardOpen(false)}
        cardData={{
          type: 'streak',
          clientName: `${activeUser.firstName} ${activeUser.lastName}`.trim(),
          trainerName: activeCoach?.displayName,
          streakDays: streak.currentStreak,
          referralCode: generateReferralCode(activeUser.firstName, activeUser.id),
        }}
      />
    </AppShell>
  );
};
