import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, Plus, Sparkles, Trash2, X, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { filterExercises } from '../../data/exerciseLibrary';
import { ExerciseCard } from '../../components/exercise/ExerciseCard';
import { ExerciseFilterToolbar } from '../../components/exercise/ExerciseFilterToolbar';
import { ExerciseDetailModal } from '../../components/exercise/ExerciseDetailModal';
import type {
  ExerciseDefinition,
  ExerciseEnvironment,
  ExerciseEquipment,
  ExperienceLevel,
  MuscleGroup,
} from '../../types/domain';

const PAGE_SIZE = 24;

export const ExerciseLibraryPage: React.FC = () => {
  const location = useLocation();
  const { allExercises, activeTrainer, saveCustomExercise, deleteCustomExercise, pushToast } = useApp();

  const isTrainerStudio = location.pathname.startsWith('/studio');

  // Search & Filter state
  const [filters, setFilters] = useState<{
    search: string;
    muscle: MuscleGroup | 'all';
    environment: ExerciseEnvironment | 'all';
    equipment: ExerciseEquipment | 'all' | 'bodyweight' | 'equipment';
    difficulty: ExperienceLevel | 'all';
    category: string | 'all';
  }>({
    search: '',
    muscle: 'all',
    environment: 'all',
    equipment: 'all',
    difficulty: 'all',
    category: 'all',
  });

  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

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
      search: filters.search,
      muscle: filters.muscle,
      environment: filters.environment,
      equipment: filters.equipment,
      difficulty: filters.difficulty,
      category: filters.category,
    });
  }, [allExercises, filters]);

  // Paginated slice for optimal DOM rendering & lazy loading
  const paginatedExercises = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const handleFilterChange = (updated: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
    setVisibleCount(PAGE_SIZE); // reset pagination on filter change
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      muscle: 'all',
      environment: 'all',
      equipment: 'all',
      difficulty: 'all',
      category: 'all',
    });
    setVisibleCount(PAGE_SIZE);
  };

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

  return (
    <AppShell pageTitle="Exercise Encyclopedia">
      <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-12">
        {/* Header & Trainer Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Medical-Grade Visual Encyclopedia · {allExercises.length}+ Movements</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
              {isTrainerStudio ? 'Curate & Build Exercise Catalog' : 'Exercise & Form Encyclopedia'}
            </h1>
            <p className="text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
              Biomechanical anatomical targeting, start & end execution phases, evidence-based benefits, certified form cues, and safety limits.
            </p>
          </div>

          {(isTrainerStudio || activeTrainer) && (
            <GlassButton
              onClick={() => setCustomModalOpen(true)}
              className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white self-start sm:self-auto shrink-0 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Custom Exercise</span>
            </GlassButton>
          )}
        </div>

        {/* Multi-Dimensional Filter Toolbar */}
        <ExerciseFilterToolbar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          totalResults={filtered.length}
          totalCatalogCount={allExercises.length}
        />

        {/* Exercise Card Grid */}
        {paginatedExercises.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {paginatedExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onSelect={setSelectedExercise}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center rounded-2xl surface-card border border-white/5 space-y-3">
            <AlertCircle className="w-10 h-10 text-[#FF803E] mx-auto opacity-60" />
            <p className="text-base font-semibold text-white">No exercises match your current filter parameters.</p>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Try adjusting your muscle target, equipment requirements, or search keyword.
            </p>
            <GlassButton variant="secondary" size="sm" onClick={handleResetFilters} className="mx-auto mt-2 text-white">
              Reset Filters
            </GlassButton>
          </div>
        )}

        {/* Pagination: Load More Action */}
        {visibleCount < filtered.length && (
          <div className="flex flex-col items-center justify-center pt-6 gap-2">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs transition-all shadow-md active:scale-95 hover:border-[#FF803E]/40"
            >
              Load More Movements ({filtered.length - visibleCount} remaining)
            </button>
            <span className="text-[11px] text-white/40">
              Showing {visibleCount} of {filtered.length} exercises
            </span>
          </div>
        )}
      </div>

      {/* Rich Detail Experience Modal */}
      <ExerciseDetailModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        catalog={allExercises}
        onSelectAlternative={(alt) => setSelectedExercise(alt)}
        canAddToWorkout={isTrainerStudio}
        onAddToWorkout={(ex) => {
          pushToast(`Added ${ex.name} to template.`);
          setSelectedExercise(null);
        }}
      />

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
                  Adds to your personal studio catalog for client workout programs
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
                  <option value="dumbbells">Dumbbells</option>
                  <option value="barbell">Barbell</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="cable">Cable Machine</option>
                  <option value="machine">Machine</option>
                  <option value="resistance_band">Resistance Band</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-white">Difficulty Level</label>
              <select
                value={customDifficulty}
                onChange={(e) => setCustomDifficulty(e.target.value as any)}
                className="w-full p-2 rounded-lg bg-[#101218] border border-white/10 text-white"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="experienced">Experienced</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">
                Step-by-Step Instructions (one step per line)
              </label>
              <textarea
                rows={3}
                required
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="1. Set up with bar over mid-foot&#10;2. Hinge at hips and keep lats tight&#10;3. Drive floor away"
                className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-white focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">
                Common Mistakes to Avoid (one per line)
              </label>
              <textarea
                rows={2}
                value={customMistakes}
                onChange={(e) => setCustomMistakes(e.target.value)}
                placeholder="Rounding lower back&#10;Shooting hips up early"
                className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-white focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Safety Precautions</label>
              <input
                type="text"
                value={customSafetyNotes}
                onChange={(e) => setCustomSafetyNotes(e.target.value)}
                placeholder="e.g., Maintain neutral spine throughout."
                className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-white focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <GlassButton variant="secondary" size="sm" onClick={() => setCustomModalOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" size="sm" className="bg-[#FF803E] text-white">
                Save to Catalog
              </GlassButton>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
};
