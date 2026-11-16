import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { getWeekdayIndexMonFirst } from '../../lib/date';
import { AppShell } from '../../components/layout/AppShell';
import { EmptyState } from '../../components/ui/EmptyState';
import { MediaImage } from '../../components/ui/MediaImage';
import { GlassSegmentedControl } from '../../components/ui/GlassSegmentedControl';
import { MuscleGroupEmblem } from '../../components/ui/FitnessIllustrations';

type PlanTab = 'workout' | 'nutrition' | 'habits';

const inferFocus = (title: string): 'upper' | 'lower' | 'core' | 'conditioning' => {
  const low = title.toLowerCase();
  if (low.includes('lower') || low.includes('leg') || low.includes('squat')) return 'lower';
  if (low.includes('core') || low.includes('mobility') || low.includes('recovery')) return 'core';
  if (low.includes('walk') || low.includes('cardio') || low.includes('conditioning')) return 'conditioning';
  return 'upper';
};

export const PlanPage: React.FC = () => {
  const { store, todayKey, activeClient, activeCoach } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PlanTab>('workout');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() =>
    getWeekdayIndexMonFirst(todayKey),
  );

  const workoutPlan = useMemo(
    () => store.workoutPlans.find((w) => w.clientId === activeClient?.id),
    [store.workoutPlans, activeClient?.id],
  );

  const mealPlan = useMemo(
    () => store.mealPlans.find((m) => m.clientId === activeClient?.id),
    [store.mealPlans, activeClient?.id],
  );

  const habitAssignments = useMemo(
    () =>
      store.assignments.filter(
        (a) =>
          a.clientId === activeClient?.id &&
          (a.category === 'habit' || a.category === 'recovery'),
      ),
    [store.assignments, activeClient?.id],
  );

  const currentWorkoutDay =
    workoutPlan?.days.find((d) => d.dayIndex === selectedDayIndex) ?? workoutPlan?.days[0];

  return (
    <AppShell pageTitle="Your plan">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">
              {activeCoach ? `Shared by ${activeCoach.displayName}` : 'Personal structure'}
            </p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.client.planTitle}
            </h1>
          </div>

          <GlassSegmentedControl
            ariaLabel="Plan sections"
            value={tab}
            onChange={setTab}
            size="sm"
            options={[
              { id: 'workout', label: 'Workout' },
              { id: 'nutrition', label: 'Nutrition' },
              { id: 'habits', label: 'Habits' },
            ]}
          />
        </div>

        {/* Workout Tab */}
        {tab === 'workout' ? (
          !workoutPlan ? (
            <EmptyState
              artwork="plan"
              title={COPY.client.emptyPlanTitle}
              description={COPY.client.emptyPlanSupport}
              actionLabel={activeCoach ? 'View your coach' : 'Find a trainer'}
              onAction={() => navigate(activeCoach ? '/app/coach' : '/discover')}
            />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="rounded-[22px] surface-card p-5">
                <p className="text-[12px] text-[#7C8393]">{workoutPlan.weekLabel}</p>
                <h2 className="mt-1 text-[20px] font-semibold text-[#F5F5F7]">
                  {workoutPlan.title}
                </h2>
                <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                  {workoutPlan.coachNotes}
                </p>
              </div>

              {/* Day selector */}
              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Select day of week">
                {workoutPlan.days.map((day) => {
                  const selected = day.dayIndex === selectedDayIndex;
                  return (
                    <button
                      key={day.dayIndex}
                      type="button"
                      onClick={() => setSelectedDayIndex(day.dayIndex)}
                      aria-pressed={selected}
                      className={`min-h-[48px] rounded-[14px] border text-[13px] font-semibold transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                          : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                      }`}
                    >
                      {day.dayLabel}
                    </button>
                  );
                })}
              </div>

              {currentWorkoutDay ? (
                <div className="rounded-[22px] surface-card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <MuscleGroupEmblem focus={inferFocus(currentWorkoutDay.focusTitle)} size={46} />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#FFB06B]">
                          {currentWorkoutDay.isRecoveryDay ? 'Recovery / light day' : 'Training day'}
                        </p>
                        <h3 className="text-[19px] font-semibold text-[#F5F5F7] truncate">
                          {currentWorkoutDay.focusTitle}
                        </h3>
                      </div>
                    </div>
                    <span className="text-[13px] text-[#7C8393] tabular-nums shrink-0">
                      {currentWorkoutDay.durationMinutes > 0
                        ? `${currentWorkoutDay.durationMinutes} min`
                        : 'Rest'}
                    </span>
                  </div>

                  <p className="text-[14px] text-[#A2A8B5]">{currentWorkoutDay.coachInstructions}</p>

                  {!currentWorkoutDay.isRecoveryDay && currentWorkoutDay.exercises.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/app/workout/${currentWorkoutDay.dayIndex}`)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white text-sm font-semibold hover:brightness-105 shadow-md shadow-[#FF803E]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Start Live Workout</span>
                      </button>
                    </div>
                  ) : null}

                  {currentWorkoutDay.exercises.length === 0 ? (
                    <p className="text-[14px] text-[#7C8393] py-4 border-t border-white/[0.08]">
                      No exercises scheduled on this rest day.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/[0.08] border-t border-white/[0.08]">
                      {currentWorkoutDay.exercises.map((ex, i) => (
                        <li
                          key={ex.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-[15px] font-medium text-[#F5F5F7]">
                              {i + 1}. {ex.name}
                            </p>
                            {ex.cue ? (
                              <p className="text-[12px] text-[#7C8393] mt-0.5">{ex.cue}</p>
                            ) : null}
                          </div>
                          <p className="text-[13px] text-[#A2A8B5] tabular-nums whitespace-nowrap">
                            {ex.sets} sets · {ex.reps} · Rest {ex.rest}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )
        ) : null}

        {/* Nutrition Tab */}
        {tab === 'nutrition' ? (
          !mealPlan ? (
            <EmptyState
              artwork="plan"
              title={COPY.client.emptyPlanTitle}
              description={COPY.client.emptyPlanSupport}
              actionLabel={activeCoach ? 'View your coach' : 'Find a trainer'}
              onAction={() => navigate(activeCoach ? '/app/coach' : '/discover')}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-[22px] surface-card p-5">
                <p className="text-[12px] text-[#B8E66C] font-medium capitalize">
                  {mealPlan.dietaryLabel}
                </p>
                <h2 className="mt-1 text-[20px] font-semibold text-[#F5F5F7]">{mealPlan.title}</h2>
                <p className="mt-2 text-[14px] text-[#A2A8B5]">{mealPlan.coachNotes}</p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-[20px] bg-[#B8E66C]/10 border border-[#B8E66C]/30">
                <div>
                  <p className="text-sm font-bold text-white">Daily Nutrition Diary</p>
                  <p className="text-xs text-white/60">Log today's Indian meals, estimate macros & water</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/nutrition')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#B8E66C] text-[#101218] text-xs font-bold hover:brightness-105 transition-all cursor-pointer"
                >
                  Open Diary
                </button>
              </div>

              <div className="grid gap-4">
                {mealPlan.meals.map((meal) => (
                  <article
                    key={meal.id}
                    className="rounded-[22px] surface-card overflow-hidden grid grid-cols-1 sm:grid-cols-12"
                  >
                    {meal.imageKey ? (
                      <div className="sm:col-span-4">
                        <MediaImage
                          assetKey={meal.imageKey}
                          alt={meal.title}
                          aspectClass="aspect-[4/3] sm:h-full"
                          lazy
                        />
                      </div>
                    ) : null}
                    <div
                      className={`${
                        meal.imageKey ? 'sm:col-span-8' : 'sm:col-span-12'
                      } p-5 flex flex-col gap-2`}
                    >
                      <p className="text-[12px] font-medium text-[#FFB06B]">{meal.slotLabel}</p>
                      <h3 className="text-[17px] font-semibold text-[#F5F5F7]">{meal.title}</h3>
                      <p className="text-[14px] text-[#A2A8B5]">{meal.portionNote}</p>
                      {meal.substitutions.length > 0 ? (
                        <div className="mt-2 pt-2.5 border-t border-white/[0.08]">
                          <p className="text-[12px] text-[#7C8393]">Illustrative substitutions:</p>
                          <ul className="mt-1 text-[13px] text-[#A2A8B5] list-disc list-inside space-y-0.5">
                            {meal.substitutions.map((sub) => (
                              <li key={sub}>{sub}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )
        ) : null}

        {/* Habits Tab */}
        {tab === 'habits' ? (
          habitAssignments.length === 0 ? (
            <EmptyState
              artwork="plan"
              title="No recurring habits yet"
              description="Habit and recovery commitments assigned by your coach will appear here."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {habitAssignments.map((habit) => (
                <div
                  key={habit.id}
                  className="rounded-[20px] surface-card p-5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[16px] font-semibold text-[#F5F5F7]">{habit.title}</h3>
                    <span className="text-[12px] text-[#7C8393] capitalize tabular-nums">
                      {habit.category} · {habit.durationMinutes} min
                    </span>
                  </div>
                  <p className="text-[14px] text-[#A2A8B5]">{habit.instructions}</p>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </AppShell>
  );
};
