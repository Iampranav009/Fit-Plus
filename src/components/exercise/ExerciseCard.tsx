import React, { useState } from 'react';
import {
  Dumbbell,
  Home,
  Building2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { ExerciseDefinition, ExperienceLevel } from '../../types/domain';
import { MUSCLE_LABELS } from '../../data/exerciseLibrary';
import { getExerciseImageUrl } from '../../lib/exerciseMedia';

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  onSelect: (exercise: ExerciseDefinition) => void;
  onQuickAdd?: (exercise: ExerciseDefinition) => void;
  showQuickAdd?: boolean;
}

const DIFFICULTY_CONFIG: Record<
  ExperienceLevel,
  { label: string; bg: string; text: string; border: string }
> = {
  beginner: {
    label: 'Beginner',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  intermediate: {
    label: 'Intermediate',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  experienced: {
    label: 'Experienced',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
};

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onSelect,
  onQuickAdd,
  showQuickAdd = false,
}) => {
  const [showEndFrame, setShowEndFrame] = useState(false);
  const [imgError, setImgError] = useState(false);

  const diffConfig = DIFFICULTY_CONFIG[exercise.difficulty] || DIFFICULTY_CONFIG.intermediate;

  const currentImageUrl = getExerciseImageUrl(
    showEndFrame && exercise.endImageUrl ? exercise.endImageUrl : exercise.startImageUrl || exercise.thumbnailUrl,
    showEndFrame ? 'end' : 'start'
  );

  return (
    <div
      onClick={() => onSelect(exercise)}
      className="group relative rounded-2xl surface-card border border-white/10 hover:border-[#FF803E]/50 overflow-hidden backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,128,62,0.12)] hover:-translate-y-1 flex flex-col cursor-pointer"
    >
      {/* Specular Liquid Glass Top Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Image Demonstration Thumbnail Container */}
      <div
        className="relative w-full aspect-[16/10] bg-[#0E1117] overflow-hidden"
        onMouseEnter={() => setShowEndFrame(true)}
        onMouseLeave={() => setShowEndFrame(false)}
      >
        {imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white/30 bg-[#141720]">
            <Dumbbell className="w-8 h-8 mb-1.5 opacity-40 text-[#FF803E]" />
            <span className="text-[11px] font-medium text-white/50">{exercise.name}</span>
          </div>
        ) : (
          <img
            src={currentImageUrl}
            alt={exercise.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 select-none"
          />
        )}

        {/* Phase Indicator Badge on Thumbnail */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white/80">
          {showEndFrame ? 'Frame: Finish' : 'Frame: Start'}
        </div>

        {/* Difficulty Badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-md ${diffConfig.bg} ${diffConfig.text} ${diffConfig.border}`}
        >
          {diffConfig.label}
        </div>

        {/* Verified Badge */}
        {exercise.isVerified && (
          <div className="absolute top-2 left-2 p-1 rounded-md bg-black/50 backdrop-blur-md text-[#FF803E] border border-white/10" title="Certified Biomechanical Cues">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Header & Aliases */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-[#FF803E] transition-colors leading-snug">
                {exercise.name}
              </h3>
              {exercise.aliases && exercise.aliases.length > 0 && (
                <p className="text-[11px] text-white/40 mt-0.5 font-medium line-clamp-1">
                  aka: {exercise.aliases.slice(0, 2).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Muscle Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {exercise.primaryMuscles.map((m) => (
              <span
                key={`prim-${m}`}
                className="px-2 py-0.5 rounded-md bg-[#FF803E]/15 border border-[#FF803E]/40 text-[#FF803E] text-[10px] font-bold tracking-wide"
              >
                {MUSCLE_LABELS[m] || m}
              </span>
            ))}
            {exercise.secondaryMuscles.slice(0, 2).map((m) => (
              <span
                key={`sec-${m}`}
                className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 text-[10px] font-medium"
              >
                {MUSCLE_LABELS[m] || m}
              </span>
            ))}
          </div>
        </div>

        {/* Meta Footer: Equipment, Environment, and Action */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span className="capitalize text-white/70 font-medium">
              {exercise.equipment.replace('_', ' ')}
            </span>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1 text-[11px]">
              {exercise.environment === 'home' && (
                <>
                  <Home className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400/90 font-medium">Home</span>
                </>
              )}
              {exercise.environment === 'gym' && (
                <>
                  <Building2 className="w-3 h-3 text-blue-400" />
                  <span className="text-blue-400/90 font-medium">Gym</span>
                </>
              )}
              {exercise.environment === 'both' && (
                <span className="text-white/50">Home / Gym</span>
              )}
            </span>
          </div>

          {showQuickAdd && onQuickAdd ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(exercise);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#FF803E]/15 hover:bg-[#FF803E] text-[#FF803E] hover:text-white text-xs font-semibold transition-all flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[#FF803E] font-medium text-[11px] group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
