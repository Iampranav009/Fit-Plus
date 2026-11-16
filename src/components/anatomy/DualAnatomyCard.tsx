import React, { useMemo, useState } from 'react';
import type { MuscleGroup } from '../../types/domain';
import type { AnatomicalGender, AnatomicalMuscleId } from './anatomyTypes';
import { ANATOMICAL_MUSCLE_LABELS, resolveAnatomicalHighlights } from './muscleMapping';
import { AnatomyMuscleOverlay } from './AnatomyMuscleOverlay';
import { MUSCLE_LABELS } from '../../data/exerciseLibrary';

export interface DualAnatomyCardProps {
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  className?: string;
  cardTitle?: string;
  showGenderToggle?: boolean;
  showLegend?: boolean;
  showInteractiveTooltip?: boolean;
  compact?: boolean;
}

export const DualAnatomyCard: React.FC<DualAnatomyCardProps> = ({
  primaryMuscles = [],
  secondaryMuscles = [],
  className = '',
  cardTitle = 'Anatomical Muscle Targeting',
  showGenderToggle = true,
  showLegend = true,
  showInteractiveTooltip = true,
  compact = false,
}) => {
  const [gender, setGender] = useState<AnatomicalGender>('male');
  const [hoveredMuscle, setHoveredMuscle] = useState<AnatomicalMuscleId | null>(null);

  const { primaryIds, secondaryIds } = useMemo(() => {
    return resolveAnatomicalHighlights(primaryMuscles, secondaryMuscles);
  }, [primaryMuscles, secondaryMuscles]);

  const hoveredLabel = hoveredMuscle ? ANATOMICAL_MUSCLE_LABELS[hoveredMuscle] : null;

  return (
    <div
      className={`rounded-2xl surface-card border border-white/10 p-4 relative overflow-hidden backdrop-blur-xl ${className}`}
    >
      {/* Header with Title and Gender Switcher */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF803E]" />
            {cardTitle}
          </h4>
          {showInteractiveTooltip && hoveredLabel ? (
            <p className="text-xs text-[#FF803E] font-medium transition-all animate-fade-in">
              {hoveredLabel}
            </p>
          ) : (
            <p className="text-[11px] text-white/50">Dual Anterior & Posterior Biomechanical Map</p>
          )}
        </div>

        {showGenderToggle && (
          <div className="flex items-center bg-[#151922] border border-white/10 rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`px-2 py-0.5 rounded transition-all font-medium ${
                gender === 'male'
                  ? 'bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`px-2 py-0.5 rounded transition-all font-medium ${
                gender === 'female'
                  ? 'bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Female
            </button>
          </div>
        )}
      </div>

      {/* Anatomical Visualizer: Dual Anterior & Posterior Figures */}
      <div
        className={`grid grid-cols-2 gap-3 items-center justify-center bg-[#0F1219]/70 rounded-xl p-3 border border-white/5 ${
          compact ? 'py-2' : 'py-4'
        }`}
      >
        {/* Anterior View (Front) */}
        <div className="flex flex-col items-center">
          <div className={`w-full max-w-[130px] aspect-[1/2] ${compact ? 'h-40' : 'h-56'}`}>
            <AnatomyMuscleOverlay
              view="anterior"
              gender={gender}
              primaryIds={primaryIds}
              secondaryIds={secondaryIds}
              onHoverMuscle={setHoveredMuscle}
            />
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mt-1.5">
            Anterior (Front)
          </span>
        </div>

        {/* Posterior View (Back) */}
        <div className="flex flex-col items-center">
          <div className={`w-full max-w-[130px] aspect-[1/2] ${compact ? 'h-40' : 'h-56'}`}>
            <AnatomyMuscleOverlay
              view="posterior"
              gender={gender}
              primaryIds={primaryIds}
              secondaryIds={secondaryIds}
              onHoverMuscle={setHoveredMuscle}
            />
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40 mt-1.5">
            Posterior (Back)
          </span>
        </div>
      </div>

      {/* Legend & Target Tags */}
      {showLegend && (
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
          {/* Color Key */}
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF803E] shadow-[0_0_8px_#FF803E]" />
              <span className="font-medium text-white/90">Primary Target</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBB86] shadow-[0_0_6px_#FFBB86]" />
              <span className="font-medium text-white/70">Secondary / Synergist</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#222733] border border-[#32394A]" />
              <span className="text-white/40">Inactive</span>
            </div>
          </div>

          {/* Active Target Pills */}
          {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {primaryMuscles.map((m) => (
                <span
                  key={`prim-${m}`}
                  className="px-2 py-0.5 rounded-md bg-[#FF803E]/15 border border-[#FF803E]/40 text-[#FF803E] text-[10px] font-semibold tracking-wide"
                >
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
              {secondaryMuscles.map((m) => (
                <span
                  key={`sec-${m}`}
                  className="px-2 py-0.5 rounded-md bg-[#FFBB86]/10 border border-[#FFBB86]/30 text-[#FFBB86] text-[10px] font-medium"
                >
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
