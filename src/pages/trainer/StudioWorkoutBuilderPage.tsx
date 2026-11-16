import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Save,
  Check,
  Search,
  X,
  Clock,
  Flame,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import type {
  VisualWorkoutDayPlan,
  VisualWorkoutExerciseItem,
  WorkoutProgramTemplate,
  MuscleGroup,
} from '../../types/domain';
import { BUILTIN_EXERCISES } from '../../data/exerciseLibrary';
import { calculateVisualWorkoutDayMetrics } from '../../lib/coachingBuildersEngine';

export const StudioWorkoutBuilderPage: React.FC = () => {
  const {
    saveWorkoutTemplate,
    allExercises,
    linkedClientsForActiveTrainer,
    pushToast,
    store,
  } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState('New 4-Day Strength & Hypertrophy Program');
  const [description, setDescription] = useState('Comprehensive progressive overload program designed for lean muscle gain.');
  const [category, setCategory] = useState('Hypertrophy');
  const [weekCount, setWeekCount] = useState(6);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const [days, setDays] = useState<VisualWorkoutDayPlan[]>([
    {
      dayIndex: 0,
      dayLabel: 'Day 1',
      focusTitle: 'Upper Body Power & Hypertrophy',
      isRecoveryDay: false,
      durationMinutes: 55,
      coachInstructions: 'Warm up shoulders and rotators. Focus on controlled eccentric tempo.',
      exercises: [
        {
          id: 'ex_item_1',
          exerciseId: 'ex_incline_db_press',
          name: 'Incline Dumbbell Bench Press',
          targetSets: 4,
          targetReps: '8-10 reps',
          restSeconds: 90,
          weightTargetKg: 20,
          coachNotes: 'Control the descent for 2 seconds. Keep shoulder blades pinched.',
        },
        {
          id: 'ex_item_2',
          exerciseId: 'ex_seated_cable_row',
          name: 'Seated Cable Row',
          targetSets: 4,
          targetReps: '10-12 reps',
          restSeconds: 75,
          coachNotes: 'Squeeze back at full contraction.',
        },
      ],
    },
    {
      dayIndex: 1,
      dayLabel: 'Day 2',
      focusTitle: 'Lower Body Strength & Core',
      isRecoveryDay: false,
      durationMinutes: 50,
      coachInstructions: 'Break at knees and hips together. Maintain braced core.',
      exercises: [
        {
          id: 'ex_item_3',
          exerciseId: 'ex_goblet_squat',
          name: 'Goblet Squat',
          targetSets: 4,
          targetReps: '10-12 reps',
          restSeconds: 90,
          weightTargetKg: 24,
        },
      ],
    },
  ]);

  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPromptGoal, setAiPromptGoal] = useState('Intermediate upper body strength block with dumbbell and cable movements');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const activeDay = days[activeDayIndex] || days[0];
  const dayMetrics = calculateVisualWorkoutDayMetrics(activeDay);

  const updateActiveDay = (updates: Partial<VisualWorkoutDayPlan>) => {
    setDays((prev) =>
      prev.map((d, idx) => (idx === activeDayIndex ? { ...d, ...updates } : d))
    );
  };

  const handleAddDay = () => {
    const nextIndex = days.length;
    const newDay: VisualWorkoutDayPlan = {
      dayIndex: nextIndex,
      dayLabel: `Day ${nextIndex + 1}`,
      focusTitle: 'Full Body Conditioning',
      isRecoveryDay: false,
      durationMinutes: 45,
      coachInstructions: 'Focus on breathing and movement quality.',
      exercises: [],
    };
    setDays((prev) => [...prev, newDay]);
    setActiveDayIndex(nextIndex);
  };

  const handleDeleteDay = (indexToDelete: number) => {
    if (days.length <= 1) {
      alert('A program template must contain at least 1 day.');
      return;
    }
    const filtered = days.filter((_, idx) => idx !== indexToDelete);
    const reindexed = filtered.map((d, i) => ({ ...d, dayIndex: i, dayLabel: `Day ${i + 1}` }));
    setDays(reindexed);
    setActiveDayIndex(Math.max(0, activeDayIndex - 1));
  };

  const handleAddExerciseToDay = (exerciseDef: (typeof allExercises)[0]) => {
    const newItem: VisualWorkoutExerciseItem = {
      id: `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      exerciseId: exerciseDef.id,
      name: exerciseDef.name,
      targetSets: 3,
      targetReps: '10-12 reps',
      restSeconds: 75,
      weightTargetKg: undefined,
      coachNotes: exerciseDef.safetyNotes || '',
    };
    updateActiveDay({
      exercises: [...activeDay.exercises, newItem],
    });
    setIsExercisePickerOpen(false);
  };

  const handleUpdateExercise = (
    exerciseItemId: string,
    updates: Partial<VisualWorkoutExerciseItem>
  ) => {
    updateActiveDay({
      exercises: activeDay.exercises.map((ex) =>
        ex.id === exerciseItemId ? { ...ex, ...updates } : ex
      ),
    });
  };

  const handleDeleteExercise = (exerciseItemId: string) => {
    updateActiveDay({
      exercises: activeDay.exercises.filter((ex) => ex.id !== exerciseItemId),
    });
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeDay.exercises.length) return;
    const reordered = [...activeDay.exercises];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    updateActiveDay({ exercises: reordered });
  };

  const handleSaveTemplate = () => {
    if (!title.trim()) {
      alert('Please provide a program title');
      return;
    }
    saveWorkoutTemplate({
      trainerId: 'trn_arjun',
      title: title.trim(),
      description: description.trim(),
      category,
      tags: [category, `${weekCount} Weeks`, 'Studio'],
      weekCount,
      days,
    });
    pushToast('Program template saved successfully!');
  };

  const handleGenerateAiDay = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      // Deterministic high-quality generation
      const sampleGeneratedExercises: VisualWorkoutExerciseItem[] = [
        {
          id: `ai_ex_${Date.now()}_1`,
          exerciseId: 'ex_incline_db_press',
          name: 'Incline Dumbbell Bench Press',
          targetSets: 4,
          targetReps: '8-10 reps',
          restSeconds: 90,
          weightTargetKg: 18,
          coachNotes: 'Pause for 1 second at full chest stretch.',
        },
        {
          id: `ai_ex_${Date.now()}_2`,
          exerciseId: 'ex_seated_cable_row',
          name: 'Seated Cable Row',
          targetSets: 4,
          targetReps: '10-12 reps',
          restSeconds: 75,
          coachNotes: 'Neutral grip handle; drive elbows back past ribs.',
        },
        {
          id: `ai_ex_${Date.now()}_3`,
          exerciseId: 'ex_lateral_raise',
          name: 'Dumbbell Lateral Raise',
          targetSets: 3,
          targetReps: '12-15 reps',
          restSeconds: 60,
          coachNotes: 'Strict tempo, no hip swinging.',
        },
      ];

      updateActiveDay({
        focusTitle: 'AI-Crafted Upper Body Strength Block',
        durationMinutes: 50,
        coachInstructions: 'Generated with Gemini AI for progressive upper body hypertrophy.',
        exercises: sampleGeneratedExercises,
      });

      setIsGeneratingAi(false);
      setIsAiModalOpen(false);
      pushToast('AI exercises drafted into current day!');
    }, 1200);
  };

  const filteredCatalog = allExercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.primaryMuscles.some((m) => m.toLowerCase().includes(exerciseSearch.toLowerCase()));
    const matchesMuscle =
      selectedMuscleFilter === 'all' || ex.primaryMuscles.includes(selectedMuscleFilter as MuscleGroup);
    return matchesSearch && matchesMuscle;
  });

  return (
    <AppShell pageTitle="Workout Studio Builder">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/studio/templates')}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/5 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#FF803E]" />
                <h1 className="text-xl font-bold text-white tracking-tight">Workout Studio Builder</h1>
              </div>
              <p className="text-xs text-white/50">Build, calibrate, and save multi-week exercise programs</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Draft with AI</span>
            </button>

            <button
              onClick={handleSaveTemplate}
              className="px-4 py-2 rounded-xl bg-gradient-to-tr from-[#FF803E] to-[#FF9B5E] text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-[#FF803E]/20 hover:scale-[1.02] transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Template</span>
            </button>
          </div>
        </div>

        {/* Program Top Meta Inputs */}
        <div className="p-5 rounded-2xl bg-[#14171F]/80 border border-white/5 backdrop-blur-xl grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Program Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FF803E]/60 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF803E]/60 transition-colors"
            >
              <option value="Hypertrophy">Hypertrophy</option>
              <option value="Strength">Strength</option>
              <option value="Fat Loss">Fat Loss</option>
              <option value="Endurance">Endurance</option>
              <option value="Mobility">Mobility</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Duration (Weeks)
            </label>
            <input
              type="number"
              min={1}
              max={16}
              value={weekCount}
              onChange={(e) => setWeekCount(Number(e.target.value))}
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF803E]/60 transition-colors"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Coach Program Overview
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 4-day split balancing progressive push/pull volume with adequate recovery."
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#FF803E]/60 transition-colors"
            />
          </div>
        </div>

        {/* Day Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {days.map((d, index) => (
            <button
              key={d.dayIndex}
              onClick={() => setActiveDayIndex(index)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                activeDayIndex === index
                  ? 'bg-[#FF803E]/15 border-[#FF803E] text-white shadow-sm'
                  : 'bg-[#14171F] border-white/5 text-white/60 hover:text-white hover:border-white/10'
              }`}
            >
              <span>{d.dayLabel}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/70">
                {d.exercises.length}
              </span>
            </button>
          ))}

          <button
            onClick={handleAddDay}
            className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Day</span>
          </button>
        </div>

        {/* Active Day Configuration Panel */}
        <div className="p-6 rounded-2xl bg-[#14171F]/80 border border-white/5 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                  Day Focus Title
                </label>
                <input
                  type="text"
                  value={activeDay.focusTitle}
                  onChange={(e) => updateActiveDay({ focusTitle: e.target.value })}
                  className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF803E]/60 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                  Est. Duration (Mins)
                </label>
                <input
                  type="number"
                  value={activeDay.durationMinutes}
                  onChange={(e) => updateActiveDay({ durationMinutes: Number(e.target.value) })}
                  className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF803E]/60 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                  <input
                    type="checkbox"
                    checked={activeDay.isRecoveryDay}
                    onChange={(e) => updateActiveDay({ isRecoveryDay: e.target.checked })}
                    className="accent-[#FF803E] rounded w-4 h-4"
                  />
                  <span>Recovery Day</span>
                </label>

                {days.length > 1 && (
                  <button
                    onClick={() => handleDeleteDay(activeDayIndex)}
                    className="text-xs text-rose-400/80 hover:text-rose-400 transition-colors ml-auto flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Day</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Day Metrics Quick Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FF803E]/10 flex items-center justify-center text-[#FF803E]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block">Exercises</span>
                <span className="text-xs font-semibold text-white">{dayMetrics.exerciseCount} items</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block">Total Sets</span>
                <span className="text-xs font-semibold text-white">{dayMetrics.totalSets} working sets</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block">Estimated Session</span>
                <span className="text-xs font-semibold text-white">~{dayMetrics.estimatedMinutes} mins</span>
              </div>
            </div>
          </div>

          {/* Exercise Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">
                Exercise Sequence ({activeDay.exercises.length})
              </h3>
              <button
                onClick={() => setIsExercisePickerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF803E]" />
                <span>Add Exercise</span>
              </button>
            </div>

            {activeDay.exercises.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-white/40 text-xs">
                No exercises added to {activeDay.dayLabel} yet. Click "Add Exercise" or "Draft with AI".
              </div>
            ) : (
              activeDay.exercises.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[#1C2029]/80 border border-white/5 hover:border-white/10 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-white/5 text-white/50 text-[11px] font-mono flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveExercise(index, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                        className="p-1 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveExercise(index, 'down')}
                        disabled={index === activeDay.exercises.length - 1}
                        title="Move Down"
                        className="p-1 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExercise(item.id)}
                        title="Remove"
                        className="p-1 rounded-lg text-rose-400/60 hover:text-rose-400 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Param Inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Target Sets</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={item.targetSets || 3}
                        onChange={(e) =>
                          handleUpdateExercise(item.id, { targetSets: Number(e.target.value) })
                        }
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#FF803E]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Rep Scheme</label>
                      <input
                        type="text"
                        value={item.targetReps || '10-12 reps'}
                        onChange={(e) =>
                          handleUpdateExercise(item.id, { targetReps: e.target.value })
                        }
                        placeholder="e.g. 8-10 reps"
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#FF803E]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Rest Interval (s)</label>
                      <input
                        type="number"
                        step={15}
                        value={item.restSeconds || 60}
                        onChange={(e) =>
                          handleUpdateExercise(item.id, { restSeconds: Number(e.target.value) })
                        }
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#FF803E]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-white/40 block mb-1">Target Weight (kg)</label>
                      <input
                        type="number"
                        value={item.weightTargetKg || ''}
                        onChange={(e) =>
                          handleUpdateExercise(item.id, {
                            weightTargetKg: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="Optional"
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#FF803E]"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-4">
                      <input
                        type="text"
                        value={item.coachNotes || ''}
                        onChange={(e) =>
                          handleUpdateExercise(item.id, { coachNotes: e.target.value })
                        }
                        placeholder="Coach technique cue (e.g. 2-sec eccentric pause at chest)"
                        className="w-full bg-[#101218] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-[#FF803E]"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Exercise Picker Modal */}
        {isExercisePickerOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-[#14171F] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-[#FF803E]" />
                  <h3 className="text-base font-semibold text-white">Select Exercise</h3>
                </div>
                <button
                  onClick={() => setIsExercisePickerOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Muscle Filters */}
              <div className="py-3 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search exercise by name or muscle..."
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    className="w-full bg-[#1C2029] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF803E]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(['all', 'chest', 'back', 'shoulders', 'quads', 'core'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMuscleFilter(m)}
                      className={`px-3 py-1 rounded-lg text-xs capitalize whitespace-nowrap transition-colors ${
                        selectedMuscleFilter === m
                          ? 'bg-[#FF803E] text-white font-semibold'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise Items Scroll */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {filteredCatalog.map((ex) => (
                  <div
                    key={ex.id}
                    className="py-3 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <span className="text-xs font-semibold text-white block">{ex.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#FF803E] font-medium capitalize">
                          {ex.primaryMuscles.join(', ')}
                        </span>
                        <span className="text-[10px] text-white/40">·</span>
                        <span className="text-[10px] text-white/50 capitalize">{ex.equipment}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddExerciseToDay(ex)}
                      className="px-3 py-1.5 rounded-lg bg-[#FF803E]/10 hover:bg-[#FF803E] text-[#FF803E] hover:text-white text-xs font-semibold transition-all"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gemini AI Copilot Modal */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-[#14171F] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Gemini AI Plan Drafter</h3>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <label className="text-xs font-semibold text-white/70 block">
                  Describe day goals or exercise constraints:
                </label>
                <textarea
                  rows={3}
                  value={aiPromptGoal}
                  onChange={(e) => setAiPromptGoal(e.target.value)}
                  className="w-full bg-[#1C2029] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition-colors"
                />
                <p className="text-[11px] text-white/40">
                  Gemini drafts target sets, reps, rest intervals, and cues optimized for Indian clients.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateAiDay}
                  disabled={isGeneratingAi}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
                >
                  {isGeneratingAi ? (
                    <span>Generating...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Draft Day Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
