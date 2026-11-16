import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen,
  Dumbbell,
  Filter,
  Info,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { AnatomyMuscleSvg } from '../../components/ui/FitnessIllustrations';
import { filterExercises, MUSCLE_LABELS } from '../../data/exerciseLibrary';
import type {
  ExerciseDefinition,
  ExerciseEnvironment,
  ExerciseEquipment,
  ExperienceLevel,
  MuscleGroup,
} from '../../types/domain';

export const ExerciseLibraryPage: React.FC = () => {
  const location = useLocation();
  const { allExercises, activeTrainer, saveCustomExercise, deleteCustomExercise } = useApp();

  const isTrainerStudio = location.pathname.startsWith('/studio');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedEnvironment, setSelectedEnvironment] = useState<ExerciseEnvironment | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<ExerciseEquipment | 'all'>('all');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);

  // Custom Exercise Modal State (Trainer only)
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEnvironment, setCustomEnvironment] = useState<ExerciseEnvironment>('both');
  const [customEquipment, setCustomEquipment] = useState<ExerciseEquipment>('dumbbells');
  const [customDifficulty, setCustomDifficulty] = useState<ExperienceLevel>('intermediate');
  const [customPrimaryMuscles, setCustomPrimaryMuscles] = useState<MuscleGroup[]>(['chest']);
  const [customSecondaryMuscles, setCustomSecondaryMuscles] = useState<MuscleGroup[]>(['triceps']);
  const [customInstructions, setCustomInstructions] = useState('');
  const [customMistakes, setCustomMistakes] = useState('');
  const [customSafetyNotes, setCustomSafetyNotes] = useState('');

  const filtered = useMemo(() => {
    return filterExercises(allExercises, {
      search: searchQuery,
      muscle: selectedMuscle,
      environment: selectedEnvironment,
      equipment: selectedEquipment,
    });
  }, [allExercises, searchQuery, selectedMuscle, selectedEnvironment, selectedEquipment]);

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    saveCustomExercise({
      name: customName.trim(),
      category: 'strength',
      environment: customEnvironment,
      equipment: customEquipment,
      difficulty: customDifficulty,
      primaryMuscles: customPrimaryMuscles,
      secondaryMuscles: customSecondaryMuscles,
      instructions: customInstructions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      commonMistakes: customMistakes
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      safetyNotes: customSafetyNotes.trim(),
      alternativeIds: [],
    });

    setCustomModalOpen(false);
    // Reset form
    setCustomName('');
    setCustomInstructions('');
    setCustomMistakes('');
    setCustomSafetyNotes('');
  };

  const muscleFilterOptions: Array<{ key: MuscleGroup | 'all'; label: string }> = [
    { key: 'all', label: 'All Targets' },
    { key: 'chest', label: 'Chest' },
    { key: 'back', label: 'Back' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'triceps', label: 'Triceps' },
    { key: 'core', label: 'Core' },
    { key: 'quads', label: 'Quads' },
    { key: 'hamstrings', label: 'Hamstrings' },
    { key: 'glutes', label: 'Glutes' },
  ];

  return (
    <AppShell pageTitle="Exercise Library">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header & Trainer Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>India-Accessible Library · 30+ Exercises</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
              {isTrainerStudio ? 'Curate & Build Exercise Catalog' : 'Exercise & Form Directory'}
            </h1>
            <p className="text-sm text-white/60 mt-1 max-w-xl">
              Anatomical targeting, biomechanical cues, common mistakes and certified alternatives for gym, home, and bodyweight training.
            </p>
          </div>

          {(isTrainerStudio || activeTrainer) && (
            <GlassButton
              onClick={() => setCustomModalOpen(true)}
              className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Custom Exercise</span>
            </GlassButton>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="rounded-[22px] surface-card p-4 border border-white/10 flex flex-col gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercise by name or muscle (e.g., Incline DB Press, Squat, Glute Bridge)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101218] border border-white/10 text-sm text-white placeholder-white/40 focus:border-[#FF803E] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Muscle Group Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {muscleFilterOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedMuscle(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedMuscle === opt.key
                    ? 'bg-[#FF803E] text-white font-semibold'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Environment & Equipment Quick Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <select
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value as any)}
              className="py-1.5 px-2.5 rounded-lg bg-[#101218] border border-white/10 text-white/80 focus:border-[#FF803E] focus:outline-none"
            >
              <option value="all">Any Setup</option>
              <option value="gym">Gym Equipment</option>
              <option value="home">Home Friendly</option>
              <option value="both">Both / Portable</option>
            </select>

            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value as any)}
              className="py-1.5 px-2.5 rounded-lg bg-[#101218] border border-white/10 text-white/80 focus:border-[#FF803E] focus:outline-none"
            >
              <option value="all">Any Equipment</option>
              <option value="bodyweight">Bodyweight Only</option>
              <option value="dumbbells">Dumbbells</option>
              <option value="barbell">Barbell</option>
              <option value="cable">Cable Machine</option>
              <option value="resistance_band">Resistance Band</option>
            </select>
          </div>
        </div>

        {/* Exercise Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exercise) => {
            const isCustom = Boolean(exercise.isCustom);
            return (
              <div
                key={exercise.id}
                onClick={() => setSelectedExercise(exercise)}
                className="group rounded-[20px] surface-card p-4 border border-white/10 hover:border-[#FF803E]/50 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-md hover:shadow-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#FF803E] uppercase tracking-wider">
                      {exercise.category} · {exercise.difficulty}
                    </span>
                    {isCustom && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FF803E]/20 text-[#FF803E] text-[10px] font-bold uppercase">
                        Custom
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#FF803E] transition-colors leading-snug">
                    {exercise.name}
                  </h3>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/60">
                  <span className="capitalize">{exercise.equipment.replace('_', ' ')}</span>
                  <span className="capitalize text-white/80 font-medium">
                    {exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <p className="text-lg font-semibold text-white">No exercises match your search filters.</p>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedMuscle('all');
                setSelectedEnvironment('all');
                setSelectedEquipment('all');
              }}
            >
              Reset Filters
            </GlassButton>
          </div>
        )}
      </div>

      {/* Detailed Exercise Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-[28px] surface-card p-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
                  <span>{selectedExercise.category}</span>
                  <span>·</span>
                  <span className="capitalize">{selectedExercise.difficulty}</span>
                  {selectedExercise.isCustom && <span>· Custom Exercise</span>}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {selectedExercise.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="p-1.5 rounded-full text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anatomical Targeting Visualization */}
            <div className="p-4 rounded-2xl bg-[#14171F] border border-white/5 flex flex-col sm:flex-row items-center gap-6">
              <AnatomyMuscleSvg
                primaryMuscles={selectedExercise.primaryMuscles}
                secondaryMuscles={selectedExercise.secondaryMuscles}
                view="both"
                size={140}
                className="shrink-0"
              />
              <div className="space-y-2 text-xs text-white/70 w-full">
                <div>
                  <p className="text-white/40 uppercase tracking-wider font-semibold text-[11px]">Primary Muscles</p>
                  <p className="text-[#FF803E] font-medium text-sm capitalize">
                    {selectedExercise.primaryMuscles.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
                  </p>
                </div>
                {selectedExercise.secondaryMuscles.length > 0 && (
                  <div>
                    <p className="text-white/40 uppercase tracking-wider font-semibold text-[11px]">Secondary Support</p>
                    <p className="text-white/90 font-medium capitalize">
                      {selectedExercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m] || m).join(', ')}
                    </p>
                  </div>
                )}
                <div className="flex gap-4 pt-1 border-t border-white/5">
                  <div>
                    <span className="text-white/40">Environment: </span>
                    <span className="capitalize text-white/90">{selectedExercise.environment}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Equipment: </span>
                    <span className="capitalize text-white/90">{selectedExercise.equipment.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                Execution Steps
              </h4>
              <ol className="space-y-1.5 list-decimal list-inside text-sm text-white/80 leading-relaxed">
                {selectedExercise.instructions.map((step, idx) => (
                  <li key={idx} className="pl-1">
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Common Mistakes */}
            {selectedExercise.commonMistakes.length > 0 && (
              <div className="space-y-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200/90">
                <p className="font-semibold uppercase tracking-wider text-red-300">
                  Common Mistakes to Avoid
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {selectedExercise.commonMistakes.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety Cues */}
            {selectedExercise.safetyNotes && (
              <div className="space-y-1 p-3.5 rounded-xl bg-[#FF803E]/10 border border-[#FF803E]/20 text-xs text-[#FFB06B]">
                <p className="font-semibold uppercase tracking-wider">Safety Cue</p>
                <p>{selectedExercise.safetyNotes}</p>
              </div>
            )}

            {/* Approved Alternatives */}
            {selectedExercise.alternativeIds.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Trainer Approved Alternatives
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedExercise.alternativeIds.map((altId) => {
                    const alt = allExercises.find((e) => e.id === altId);
                    if (!alt) return null;
                    return (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => setSelectedExercise(alt)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white transition-colors"
                      >
                        {alt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trainer Delete Action if Custom */}
            {selectedExercise.isCustom && (isTrainerStudio || activeTrainer) && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete custom exercise "${selectedExercise.name}"?`)) {
                      deleteCustomExercise(selectedExercise.id);
                      setSelectedExercise(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Exercise</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trainer "Add Custom Exercise" Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form
            onSubmit={handleSaveCustom}
            className="relative w-full max-w-lg rounded-[28px] surface-card p-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Create Custom Exercise</h3>
                <p className="text-xs text-white/60">
                  Adds to your trainer catalog for client workout programs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="p-1.5 rounded-full text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Exercise Name</label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Deficit Romanian Deadlift"
                className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-sm text-white focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-white">Environment</label>
                <select
                  value={customEnvironment}
                  onChange={(e) => setCustomEnvironment(e.target.value as any)}
                  className="w-full p-2 rounded-lg bg-[#101218] border border-white/10 text-white"
                >
                  <option value="gym">Gym</option>
                  <option value="home">Home</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-white">Equipment</label>
                <select
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value as any)}
                  className="w-full p-2 rounded-lg bg-[#101218] border border-white/10 text-white"
                >
                  <option value="bodyweight">Bodyweight</option>
                  <option value="dumbbells">Dumbbells</option>
                  <option value="barbell">Barbell</option>
                  <option value="cable">Cable</option>
                  <option value="resistance_band">Resistance Band</option>
                  <option value="machine">Machine</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-white">Primary Muscle Target</label>
              <select
                value={customPrimaryMuscles[0]}
                onChange={(e) => setCustomPrimaryMuscles([e.target.value as MuscleGroup])}
                className="w-full p-2 rounded-lg bg-[#101218] border border-white/10 text-white capitalize"
              >
                {Object.entries(MUSCLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-white">Execution Instructions (one per line)</label>
              <textarea
                rows={3}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="1. Set up with feet hip-width apart&#10;2. Hinge back through hips keeping lats packed&#10;3. Drive through floor to lockout"
                className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-sm text-white focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-white">Safety Notes</label>
              <input
                type="text"
                value={customSafetyNotes}
                onChange={(e) => setCustomSafetyNotes(e.target.value)}
                placeholder="Maintain neutral spine throughout"
                className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-sm text-white focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <GlassButton type="button" variant="secondary" onClick={() => setCustomModalOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white">
                Save Exercise
              </GlassButton>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
};
