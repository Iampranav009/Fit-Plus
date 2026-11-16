import React, { useEffect, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { ExerciseDefinition } from '../../types/domain';
import { getExerciseImageUrl } from '../../lib/exerciseMedia';

interface MovementPhaseViewerProps {
  exercise: ExerciseDefinition;
  className?: string;
  autoPlayIntervalMs?: number;
}

export const MovementPhaseViewer: React.FC<MovementPhaseViewerProps> = ({
  exercise,
  className = '',
  autoPlayIntervalMs = 1200,
}) => {
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Phases array: either custom movementPhases or standard [start, end]
  const phases = React.useMemo(() => {
    if (exercise.movementPhases && exercise.movementPhases.length >= 2) {
      return exercise.movementPhases.map((p) => ({
        label: p.title,
        url: getExerciseImageUrl(p.imageUrl),
        cues: p.cues,
      }));
    }
    const startUrl = getExerciseImageUrl(exercise.startImageUrl || exercise.thumbnailUrl, 'start');
    const endUrl = getExerciseImageUrl(exercise.endImageUrl || exercise.startImageUrl || exercise.thumbnailUrl, 'end');
    return [
      {
        label: 'Starting Position / Setup',
        url: startUrl,
        cues: exercise.instructions.slice(0, 2),
      },
      {
        label: 'Ending Position / Peak Contraction',
        url: endUrl,
        cues: exercise.instructions.slice(2, 4),
      },
    ];
  }, [exercise]);

  // Autoplay loop between phases
  useEffect(() => {
    if (!isPlaying || phases.length <= 1) return;
    const interval = setInterval(() => {
      setActivePhaseIndex((prev) => (prev + 1) % phases.length);
    }, autoPlayIntervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, phases.length, autoPlayIntervalMs]);

  const currentPhase = phases[activePhaseIndex] || phases[0];

  return (
    <div className={`relative flex flex-col rounded-2xl overflow-hidden surface-card border border-white/10 ${className}`}>
      {/* Media Canvas */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[#0E1117] flex items-center justify-center overflow-hidden">
        {imageError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-white/40">
            <Eye className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-xs font-medium">Demonstration diagram ready</p>
            <p className="text-[10px] text-white/30 mt-1">{exercise.name}</p>
          </div>
        ) : (
          <img
            key={currentPhase.url}
            src={currentPhase.url}
            alt={`${exercise.name} - ${currentPhase.label}`}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain object-center transition-opacity duration-300 select-none"
          />
        )}

        {/* Phase Badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90 shadow-lg flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF803E] animate-pulse" />
          <span>{activePhaseIndex === 0 ? 'Phase 1: Starting Position' : 'Phase 2: Ending Position'}</span>
        </div>

        {/* Playback Control (Toggle Loop) */}
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          title={isPlaying ? 'Pause demonstration loop' : 'Play demonstration loop'}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-[#FF803E] backdrop-blur-md border border-white/15 text-white transition-all shadow-lg active:scale-95"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Previous / Next Arrow Controls */}
        {phases.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setActivePhaseIndex((prev) => (prev === 0 ? phases.length - 1 : prev - 1));
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all backdrop-blur-sm"
              title="Previous phase"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setActivePhaseIndex((prev) => (prev + 1) % phases.length);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all backdrop-blur-sm"
              title="Next phase"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Phase Slider Selector Tabs */}
      <div className="p-3 bg-[#13161F] border-t border-white/5 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          {phases.map((phase, idx) => {
            const isActive = idx === activePhaseIndex;
            return (
              <button
                key={phase.label}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActivePhaseIndex(idx);
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all text-center flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white shadow-md'
                    : 'bg-[#1C202B] hover:bg-[#252B3A] text-white/60 hover:text-white border border-white/5'
                }`}
              >
                <span>{idx === 0 ? '1. Starting Position' : '2. Ending Position'}</span>
              </button>
            );
          })}
        </div>

        {/* Phase Coaching Cues */}
        {currentPhase.cues && currentPhase.cues.length > 0 && (
          <div className="mt-1 px-2 py-1.5 rounded-lg bg-black/30 border border-white/5 text-[11px] text-white/75 flex flex-wrap gap-2 items-center">
            <span className="font-semibold text-[#FF803E] uppercase text-[10px] tracking-wider">Form Cue:</span>
            <span>{currentPhase.cues[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
};
