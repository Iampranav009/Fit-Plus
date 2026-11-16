import React from 'react';
import { Search, X, Filter, RotateCcw, Home, Building2, Dumbbell, Target } from 'lucide-react';
import type { ExerciseEnvironment, ExerciseEquipment, ExperienceLevel, MuscleGroup } from '../../types/domain';
import { MUSCLE_LABELS } from '../../data/exerciseLibrary';

interface FilterState {
  search: string;
  muscle: MuscleGroup | 'all';
  environment: ExerciseEnvironment | 'all';
  equipment: ExerciseEquipment | 'all' | 'bodyweight' | 'equipment';
  difficulty: ExperienceLevel | 'all';
  category: string | 'all';
}

interface ExerciseFilterToolbarProps {
  filters: FilterState;
  onChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
  totalResults: number;
  totalCatalogCount: number;
}

const MUSCLE_FILTER_OPTIONS: Array<{ key: MuscleGroup | 'all'; label: string }> = [
  { key: 'all', label: 'All Muscles' },
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'core', label: 'Core' },
  { key: 'quads', label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'calves', label: 'Calves' },
];

export const ExerciseFilterToolbar: React.FC<ExerciseFilterToolbarProps> = ({
  filters,
  onChange,
  onReset,
  totalResults,
  totalCatalogCount,
}) => {
  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.muscle !== 'all' ||
    filters.environment !== 'all' ||
    filters.equipment !== 'all' ||
    filters.difficulty !== 'all';

  return (
    <div className="rounded-2xl surface-card p-4 border border-white/10 flex flex-col gap-3.5 backdrop-blur-xl">
      {/* Search Input Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search 120+ exercises by movement, alias (e.g. RDL, OHP), or muscle..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full bg-[#141720]/80 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#FF803E] transition-all shadow-inner"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all shrink-0"
            title="Reset all filters"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF803E]" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Target Muscle Selector Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {MUSCLE_FILTER_OPTIONS.map((opt) => {
          const isSelected = filters.muscle === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange({ muscle: opt.key })}
              className={`px-3 py-1.5 rounded-lg font-semibold tracking-wide transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white shadow-md'
                  : 'bg-[#181C26] hover:bg-[#202533] text-white/60 hover:text-white border border-white/5'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Dimensional Filter Dropdowns: Environment, Equipment, Difficulty */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
        {/* Environment Filter */}
        <div className="flex items-center bg-[#141720]/80 border border-white/10 rounded-xl px-2.5 py-1.5">
          <label className="text-white/40 text-[11px] font-medium mr-2">Location:</label>
          <select
            value={filters.environment}
            onChange={(e) => onChange({ environment: e.target.value as ExerciseEnvironment | 'all' })}
            className="bg-transparent text-white font-medium focus:outline-none flex-1 text-xs cursor-pointer"
          >
            <option value="all" className="bg-[#141720]">All Locations</option>
            <option value="home" className="bg-[#141720]">🏠 Home Workout Friendly</option>
            <option value="gym" className="bg-[#141720]">🏢 Gym Equipment Setup</option>
          </select>
        </div>

        {/* Equipment Filter */}
        <div className="flex items-center bg-[#141720]/80 border border-white/10 rounded-xl px-2.5 py-1.5">
          <label className="text-white/40 text-[11px] font-medium mr-2">Equipment:</label>
          <select
            value={filters.equipment}
            onChange={(e) => onChange({ equipment: e.target.value as any })}
            className="bg-transparent text-white font-medium focus:outline-none flex-1 text-xs cursor-pointer"
          >
            <option value="all" className="bg-[#141720]">All Equipment</option>
            <option value="bodyweight" className="bg-[#141720]">Bodyweight Only</option>
            <option value="dumbbells" className="bg-[#141720]">Dumbbells</option>
            <option value="barbell" className="bg-[#141720]">Barbell</option>
            <option value="cable" className="bg-[#141720]">Cable System</option>
            <option value="machine" className="bg-[#141720]">Machine</option>
            <option value="resistance_band" className="bg-[#141720]">Resistance Band</option>
            <option value="pullup_bar" className="bg-[#141720]">Pull-up Bar</option>
            <option value="kettlebell" className="bg-[#141720]">Kettlebell</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="col-span-2 sm:col-span-1 flex items-center bg-[#141720]/80 border border-white/10 rounded-xl px-2.5 py-1.5">
          <label className="text-white/40 text-[11px] font-medium mr-2">Level:</label>
          <select
            value={filters.difficulty}
            onChange={(e) => onChange({ difficulty: e.target.value as ExperienceLevel | 'all' })}
            className="bg-transparent text-white font-medium focus:outline-none flex-1 text-xs cursor-pointer"
          >
            <option value="all" className="bg-[#141720]">All Experience Levels</option>
            <option value="beginner" className="bg-[#141720]">Beginner Friendly</option>
            <option value="intermediate" className="bg-[#141720]">Intermediate</option>
            <option value="experienced" className="bg-[#141720]">Experienced</option>
          </select>
        </div>
      </div>

      {/* Results Counter Summary */}
      <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
        <span>
          Showing <span className="font-semibold text-white">{totalResults}</span> of{' '}
          <span className="font-semibold text-white">{totalCatalogCount}</span> verified movements
        </span>
        {hasActiveFilters && (
          <span className="text-[#FF803E] font-medium">Filtered Active</span>
        )}
      </div>
    </div>
  );
};
