import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { AnatomyMuscleSvg } from '../../components/ui/FitnessIllustrations';
import { triggerHaptic } from '../../lib/haptics';
import {
  buildInitialWorkoutExercises,
  clearLiveWorkoutDraft,
  computeSessionMetrics,
  estimateOneRepMax,
  getPreviousExerciseBest,
  loadLiveWorkoutDraft,
  saveLiveWorkoutDraft,
} from '../../lib/workoutEngine';
import { findExerciseByNameOrId } from '../../data/exerciseLibrary';
import type { WorkoutExerciseLog, WorkoutSession, WorkoutSetLog } from '../../types/domain';

export const LiveWorkoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { dayIndex: routeDayIndex } = useParams<{ dayIndex?: string }>();
  const {
    store,
    todayKey,
    activeClient,
    workoutSessions,
    allExercises,
    completeWorkoutSession,
    pushToast,
  } = useApp();

  // 1. Identify workout source from active plan or default day
  const clientPlan = useMemo(() => {
    return store.workoutPlans.find((p) => !activeClient || p.clientId === activeClient.id);
  }, [store.workoutPlans, activeClient]);

  const targetDayIndex = useMemo(() => {
    if (routeDayIndex !== undefined) {
      const parsed = parseInt(routeDayIndex, 10);
      return isNaN(parsed) ? 0 : Math.max(0, Math.min(6, parsed));
    }
    const currentDayOfWeek = new Date().getDay();
    // In plan days, 0 is Mon..Sun or standard index
    return Math.max(0, Math.min(6, currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1));
  }, [routeDayIndex]);

  const plannedDay = useMemo(() => {
    if (!clientPlan) return undefined;
    return clientPlan.days[targetDayIndex] || clientPlan.days[0];
  }, [clientPlan, targetDayIndex]);

  // 2. Session state
  const [exercises, setExercises] = useState<WorkoutExerciseLog[]>(() => {
    const draft = loadLiveWorkoutDraft(activeClient?.id || 'cl_aarav');
    if (draft && draft.exercises.length > 0) return draft.exercises;
    const effectiveDay = plannedDay || {
      dayIndex: targetDayIndex,
      dayLabel: 'Today',
      focusTitle: 'Full Body Conditioning',
      isRecoveryDay: false,
      durationMinutes: 45,
      coachInstructions: 'Perform each exercise with controlled tempo.',
      exercises: [
        { id: 'ex_incline_db_press', name: 'Incline Dumbbell Press', sets: '3', reps: '10-12', rest: '60s' },
        { id: 'ex_goblet_squat', name: 'Goblet Squat (Dumbbell or Kettlebell)', sets: '3', reps: '12', rest: '60s' },
        { id: 'ex_db_romanian_deadlift', name: 'Dumbbell Romanian Deadlift (RDL)', sets: '3', reps: '10', rest: '60s' },
        { id: 'ex_plank_forearm', name: 'Forearm Plank', sets: '3', reps: '45s', rest: '45s' },
      ],
    };
    return buildInitialWorkoutExercises(effectiveDay, allExercises, workoutSessions, activeClient?.id || 'cl_aarav');
  });

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const draft = loadLiveWorkoutDraft(activeClient?.id || 'cl_aarav');
    return draft ? (draft.durationSeconds || 0) : 0;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [workoutNotes, setWorkoutNotes] = useState(() => {
    const draft = loadLiveWorkoutDraft(activeClient?.id || 'cl_aarav');
    return draft?.notes || '';
  });
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [completedSummaryOpen, setCompletedSummaryOpen] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Re-sync if exercises was empty initially
  useEffect(() => {
    if (exercises.length === 0 && plannedDay) {
      const initial = buildInitialWorkoutExercises(plannedDay, allExercises, workoutSessions, activeClient?.id || 'cl_aarav');
      setExercises(initial);
    }
  }, [plannedDay, allExercises, workoutSessions, activeClient, exercises.length]);

  // Workout duration timer
  useEffect(() => {
    if (!isTimerRunning || completedSummaryOpen) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning, completedSummaryOpen]);

  // Rest countdown timer
  useEffect(() => {
    if (restRemaining === null || restRemaining <= 0) return;
    const interval = window.setInterval(() => {
      setRestRemaining((prev) => {
        if (prev === null || prev <= 1) {
          triggerHaptic('timer');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [restRemaining]);

  const currentExercise = exercises[currentExerciseIndex] as WorkoutExerciseLog | undefined;
  const currentDef = currentExercise ? findExerciseByNameOrId(currentExercise.exerciseName || currentExercise.exerciseId, allExercises) : undefined;

  // Previous performance lookup
  const previousBest = useMemo(() => {
    if (!currentExercise) return null;
    return getPreviousExerciseBest(currentExercise.exerciseName, currentExercise.exerciseId, workoutSessions, activeClient?.id || 'cl_aarav');
  }, [workoutSessions, currentExercise, activeClient]);

  // Metrics calculation
  const metrics = useMemo(() => {
    return computeSessionMetrics(exercises, workoutSessions, activeClient?.id || 'cl_aarav');
  }, [exercises, workoutSessions, activeClient]);

  // Auto-save draft every 5 seconds
  useEffect(() => {
    if (sessionSaved || completedSummaryOpen) return;
    const draft: WorkoutSession = {
      id: `draft_${activeClient?.id || 'cl_aarav'}`,
      clientId: activeClient?.id || 'cl_aarav',
      planId: clientPlan?.id,
      dayIndex: targetDayIndex,
      title: plannedDay?.focusTitle || 'Live Workout',
      dateKey: todayKey,
      status: 'in_progress',
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      durationSeconds: elapsedSeconds,
      totalVolumeKg: metrics.totalVolumeKg,
      completedSetsCount: metrics.completedSetsCount,
      prCount: metrics.prCount,
      exercises,
      notes: workoutNotes,
      updatedAt: new Date().toISOString(),
    };
    saveLiveWorkoutDraft(draft);
  }, [exercises, elapsedSeconds, workoutNotes, targetDayIndex, plannedDay, clientPlan, activeClient, todayKey, metrics, sessionSaved, completedSummaryOpen]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Set toggle handler
  const handleToggleSet = (exerciseIdx: number, setIdx: number) => {
    triggerHaptic('light');
    setExercises((prev) => {
      return prev.map((ex, exI) => {
        if (exI !== exerciseIdx) return ex;
        const updatedSets = ex.sets.map((set, sI) => {
          if (sI !== setIdx) return set;
          const nextCompleted = !set.completed;
          const set1RM = nextCompleted ? estimateOneRepMax(set.weightKg, set.reps) : 0;
          const isPR = Boolean(
            nextCompleted &&
            set.weightKg > 0 &&
            previousBest &&
            (set.weightKg > previousBest.bestWeightKg || set1RM > previousBest.bestEstimated1RM),
          );
          return {
            ...set,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            isPersonalRecord: isPR,
          };
        });
        return { ...ex, sets: updatedSets };
      });
    });

    // Start rest timer automatically if just completed
    const currentEx = exercises[exerciseIdx];
    const isNowCompleting = currentEx && !currentEx.sets[setIdx].completed;
    if (isNowCompleting) {
      const restSec = currentEx?.restSeconds || 60;
      setRestRemaining(restSec);
    }
  };

  const handleUpdateSet = (
    exerciseIdx: number,
    setIdx: number,
    field: 'reps' | 'weightKg',
    value: number,
  ) => {
    setExercises((prev) => {
      return prev.map((ex, exI) => {
        if (exI !== exerciseIdx) return ex;
        const updatedSets = ex.sets.map((set, sI) => {
          if (sI !== setIdx) return set;
          return { ...set, [field]: Math.max(0, value) };
        });
        return { ...ex, sets: updatedSets };
      });
    });
  };

  const handleAddSet = (exerciseIdx: number) => {
    setExercises((prev) => {
      return prev.map((ex, exI) => {
        if (exI !== exerciseIdx) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: WorkoutSetLog = {
          setNumber: ex.sets.length + 1,
          reps: lastSet ? lastSet.reps : 10,
          weightKg: lastSet ? lastSet.weightKg : 0,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      });
    });
  };

  const handleRemoveSet = (exerciseIdx: number, setIdx: number) => {
    setExercises((prev) => {
      return prev.map((ex, exI) => {
        if (exI !== exerciseIdx || ex.sets.length <= 1) return ex;
        const filtered = ex.sets.filter((_, sI) => sI !== setIdx);
        const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: renumbered };
      });
    });
  };

  // Exercise substitution
  const handleSubstituteExercise = (newDefId: string) => {
    const newDef = allExercises.find((e) => e.id === newDefId);
    if (!newDef || !currentExercise) return;
    setExercises((prev) => {
      return prev.map((ex, idx) => {
        if (idx !== currentExerciseIndex) return ex;
        return {
          ...ex,
          exerciseId: newDef.id,
          exerciseName: newDef.name,
          substitutedFromName: ex.substitutedFromName || ex.exerciseName,
        };
      });
    });
    setSubstitutionModalOpen(false);
    pushToast(`Substituted with ${newDef.name}`);
  };

  // Final session completion
  const handleFinishWorkout = () => {
    if (metrics.completedSetsCount === 0) {
      if (!window.confirm('No sets have been marked completed. Save workout anyway?')) {
        return;
      }
    }

    const sessionPayload = {
      clientId: activeClient?.id || 'cl_aarav',
      planId: clientPlan?.id,
      dayIndex: targetDayIndex,
      title: plannedDay?.focusTitle || 'Training Session',
      dateKey: todayKey,
      status: 'completed' as const,
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      totalVolumeKg: metrics.totalVolumeKg,
      completedSetsCount: metrics.completedSetsCount,
      prCount: metrics.prCount,
      exercises,
      notes: workoutNotes,
    };

    completeWorkoutSession(sessionPayload);
    clearLiveWorkoutDraft(activeClient?.id || 'cl_aarav');
    setSessionSaved(true);
    setCompletedSummaryOpen(true);
  };

  return (
    <AppShell pageTitle="Live Workout">
      <div className="max-w-3xl mx-auto flex flex-col gap-5 pb-10">
        {/* Top Control Bar: Back, Workout Title & Elapsed Timer */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Leave workout? Your progress is saved as a draft.')) {
                navigate('/app/home');
              }
            }}
            className="inline-flex items-center gap-1.5 text-sm text-[#A2A8B5] hover:text-[#F5F5F7] min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave session</span>
          </button>

          {/* Active Workout Duration & Pause */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <Clock className="w-4 h-4 text-[#FF803E]" />
            <span className="text-sm font-mono font-medium text-white tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1 rounded-full text-white/60 hover:text-white transition-colors"
              aria-label={isTimerRunning ? 'Pause timer' : 'Resume timer'}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#B8E66C]" />}
            </button>
          </div>

          <GlassButton
            size="sm"
            onClick={handleFinishWorkout}
            className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white shadow-md shadow-[#FF803E]/20"
          >
            Finish
          </GlassButton>
        </div>

        {/* Rest Countdown Timer Banner (if active) */}
        {restRemaining !== null && (
          <div className="rounded-[20px] bg-gradient-to-r from-[#252A35]/95 via-[#1C2029]/95 to-[#252A35]/95 border border-[#FF803E]/40 p-4 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF803E]/20 border border-[#FF803E]/40 flex items-center justify-center text-[#FF803E]">
                <RotateCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">Rest Timer</p>
                <p className="text-2xl font-bold font-mono text-[#FF803E] tabular-nums">
                  {formatTime(restRemaining)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRestRemaining((prev) => (prev ? Math.max(5, prev - 15) : null))}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/80 transition-colors"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => setRestRemaining((prev) => (prev ? prev + 15 : 15))}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-white/80 transition-colors"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={() => setRestRemaining(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Exercise Stepper Carousel Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {exercises.map((ex, idx) => {
            const isCurrent = idx === currentExerciseIndex;
            const completedCount = ex.sets.filter((s) => s.completed).length;
            const isAllCompleted = completedCount > 0 && completedCount === ex.sets.length;

            return (
              <button
                key={ex.exerciseId + idx}
                type="button"
                onClick={() => setCurrentExerciseIndex(idx)}
                className={`min-w-[130px] p-2.5 rounded-xl border text-left transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-[#252A35] border-[#FF803E] text-white shadow-lg'
                    : isAllCompleted
                      ? 'bg-[#1C2029]/80 border-[#B8E66C]/40 text-white/80'
                      : 'bg-[#1C2029]/60 border-white/5 text-white/50 hover:text-white/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span>#{idx + 1}</span>
                  {isAllCompleted ? (
                    <span className="text-[#B8E66C] flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                    </span>
                  ) : (
                    <span>{completedCount}/{ex.sets.length}</span>
                  )}
                </div>
                <p className="text-xs font-semibold truncate">{ex.exerciseName}</p>
              </button>
            );
          })}
        </div>

        {/* Current Active Exercise Card */}
        {currentExercise && (
          <section className="rounded-[24px] surface-card p-5 sm:p-6 border border-white/10 flex flex-col gap-5">
            {/* Header: Title, Category & Substitution Trigger */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-[#7C8393]">
                  <span>Exercise {currentExerciseIndex + 1} of {exercises.length}</span>
                  {currentDef?.difficulty && (
                    <span className="capitalize">· {currentDef.difficulty}</span>
                  )}
                  {currentExercise.substitutedFromName && (
                    <span className="text-[#FF803E] bg-[#FF803E]/10 px-2 py-0.5 rounded-md">
                      Substituted
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {currentExercise.exerciseName}
                </h2>
                <p className="text-xs text-white/60">
                  Target: {currentExercise.targetSets} sets × {currentExercise.targetReps} reps · {currentExercise.restSeconds}s rest
                </p>
              </div>

              {/* Substitution Action */}
              <button
                type="button"
                onClick={() => setSubstitutionModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 transition-colors shrink-0"
              >
                Substitute
              </button>
            </div>

            {/* Anatomical Visual & Target Muscle Overview */}
            {currentDef && (
              <div className="p-4 rounded-2xl bg-[#14171F] border border-white/5 flex flex-col sm:flex-row items-center gap-5">
                <AnatomyMuscleSvg
                  primaryMuscles={currentDef.primaryMuscles}
                  secondaryMuscles={currentDef.secondaryMuscles}
                  view="both"
                  size={120}
                  className="shrink-0"
                />
                <div className="space-y-2 text-xs text-white/70">
                  <div>
                    <span className="text-white/40 uppercase tracking-wider font-semibold">Primary Target: </span>
                    <span className="text-[#FF803E] font-medium capitalize">
                      {currentDef.primaryMuscles.join(', ') || 'General'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-wider font-semibold">Equipment: </span>
                    <span className="capitalize">{currentDef.equipment.replace('_', ' ')}</span>
                  </div>
                  {currentDef.safetyNotes && (
                    <div className="text-[11px] text-white/60 italic pt-1 border-t border-white/5">
                      Coach Note: {currentDef.safetyNotes}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Previous Session Performance Benchmark */}
            {previousBest && previousBest.bestWeightKg > 0 && (
              <div className="px-4 py-2.5 rounded-xl bg-[#252A35]/50 border border-white/5 text-xs text-white/70 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Previous best logged:</span>
                </span>
                <span className="font-mono text-white font-medium">
                  {previousBest.bestWeightKg} kg × {previousBest.bestRepsAtWeight} reps (1RM est. {previousBest.bestEstimated1RM} kg)
                </span>
              </div>
            )}

            {/* Set by Set Tracking Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-white/50 px-2 uppercase tracking-wider">
                <span className="col-span-2">Set</span>
                <span className="col-span-4 text-center">Weight (kg)</span>
                <span className="col-span-4 text-center">Reps</span>
                <span className="col-span-2 text-right">Done</span>
              </div>

              {currentExercise.sets.map((set, sIdx) => (
                <div
                  key={sIdx}
                  className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border transition-all ${
                    set.completed
                      ? 'bg-[#B8E66C]/10 border-[#B8E66C]/30 text-white'
                      : 'bg-white/5 border-white/5 text-white/80'
                  }`}
                >
                  {/* Set Number */}
                  <div className="col-span-2 flex items-center gap-1 font-mono text-sm font-semibold">
                    <span>{set.setNumber}</span>
                    {set.isPersonalRecord && (
                      <span title="Personal Record">
                        <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                      </span>
                    )}
                  </div>

                  {/* Weight Input */}
                  <div className="col-span-4 flex items-center justify-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={set.weightKg || ''}
                      placeholder="0"
                      onChange={(e) =>
                        handleUpdateSet(
                          currentExerciseIndex,
                          sIdx,
                          'weightKg',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-20 text-center py-1.5 px-2 rounded-lg bg-[#101218] border border-white/10 text-white font-mono text-sm focus:border-[#FF803E] focus:outline-none"
                    />
                  </div>

                  {/* Reps Input */}
                  <div className="col-span-4 flex items-center justify-center">
                    <input
                      type="number"
                      min="0"
                      value={set.reps || ''}
                      placeholder="0"
                      onChange={(e) =>
                        handleUpdateSet(
                          currentExerciseIndex,
                          sIdx,
                          'reps',
                          parseInt(e.target.value, 10) || 0,
                        )
                      }
                      className="w-20 text-center py-1.5 px-2 rounded-lg bg-[#101218] border border-white/10 text-white font-mono text-sm focus:border-[#FF803E] focus:outline-none"
                    />
                  </div>

                  {/* Complete Button */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSet(currentExerciseIndex, sIdx)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        set.completed
                          ? 'bg-[#B8E66C] text-[#101218] shadow-md shadow-[#B8E66C]/30'
                          : 'bg-white/10 text-white/50 hover:text-white hover:bg-white/20'
                      }`}
                      aria-label={`Mark set ${set.setNumber} completed`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    {currentExercise.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSet(currentExerciseIndex, sIdx)}
                        className="p-1 text-white/30 hover:text-red-400 transition-colors"
                        title="Remove set"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleAddSet(currentExerciseIndex)}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold text-white/70 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Set</span>
                </button>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                disabled={currentExerciseIndex === 0}
                onClick={() => setCurrentExerciseIndex((p) => Math.max(0, p - 1))}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Exercise</span>
              </button>

              <button
                type="button"
                disabled={currentExerciseIndex === exercises.length - 1}
                onClick={() => setCurrentExerciseIndex((p) => Math.min(exercises.length - 1, p + 1))}
                className="px-4 py-2 rounded-xl bg-[#FF803E]/15 hover:bg-[#FF803E]/25 text-xs font-semibold text-[#FF803E] disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
              >
                <span>Next Exercise</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* Workout Session Notes */}
        <section className="rounded-[24px] surface-card p-5 border border-white/10 space-y-3">
          <h3 className="text-sm font-semibold text-white">Workout Session Notes</h3>
          <textarea
            rows={2}
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            placeholder="How did weights feel? Any shoulder stiffness or energy notes for coach?"
            className="w-full p-3 rounded-xl bg-[#101218] border border-white/10 text-sm text-white placeholder-white/40 focus:border-[#FF803E] focus:outline-none resize-none"
          />
        </section>
      </div>

      {/* Exercise Substitution Modal */}
      {substitutionModalOpen && currentExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-[24px] surface-card p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Substitute Exercise</h3>
                <p className="text-xs text-white/60">
                  Alternatives matching primary target for {currentExercise.exerciseName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubstitutionModalOpen(false)}
                className="p-1.5 rounded-full text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {/* Approved alternatives first */}
              {allExercises
                .filter(
                  (ex) =>
                    ex.id !== currentExercise.exerciseId &&
                    (currentDef?.alternativeIds.includes(ex.id) ||
                      ex.primaryMuscles.some((m) => currentDef?.primaryMuscles.includes(m))),
                )
                .slice(0, 8)
                .map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    onClick={() => handleSubstituteExercise(alt.id)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{alt.name}</p>
                      <p className="text-xs text-white/50 capitalize">
                        {alt.equipment.replace('_', ' ')} · {alt.primaryMuscles.join(', ')}
                      </p>
                    </div>
                    <span className="text-xs text-[#FF803E] font-medium">Select</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Completion Summary Dialog */}
      {completedSummaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[28px] bg-gradient-to-b from-[#252A35] to-[#1C2029] p-6 border border-white/10 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#B8E66C]/20 border border-[#B8E66C]/40 mx-auto flex items-center justify-center text-[#B8E66C]">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">Workout Completed!</h3>
              <p className="text-xs text-white/70">
                Logged to your training diary and synced with coach.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="text-[11px] text-white/50 uppercase font-semibold">Time</p>
                <p className="text-base font-bold font-mono text-white mt-0.5">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/50 uppercase font-semibold">Volume</p>
                <p className="text-base font-bold font-mono text-[#FF803E] mt-0.5">
                  {metrics.totalVolumeKg} kg
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/50 uppercase font-semibold">Sets</p>
                <p className="text-base font-bold font-mono text-[#B8E66C] mt-0.5">
                  {metrics.completedSetsCount}
                </p>
              </div>
            </div>

            {metrics.prCount > 0 && (
              <div className="px-3 py-2 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-xs font-semibold text-[#F59E0B] flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>{metrics.prCount} Personal Record{metrics.prCount > 1 ? 's' : ''} Achieved!</span>
              </div>
            )}

            <div className="pt-2">
              <GlassButton
                fullWidth
                onClick={() => navigate('/app/progress')}
                className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white"
              >
                View Progress & Milestones
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
