import React from 'react';
import {
  X,
  Dumbbell,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Plus,
  BookOpen,
} from 'lucide-react';
import type { ExerciseDefinition } from '../../types/domain';
import { MUSCLE_LABELS, findExerciseByNameOrId } from '../../data/exerciseLibrary';
import { DualAnatomyCard } from '../anatomy/DualAnatomyCard';
import { MovementPhaseViewer } from './MovementPhaseViewer';
import { GlassButton } from '../ui/GlassButton';

interface ExerciseDetailModalProps {
  exercise: ExerciseDefinition | null;
  onClose: () => void;
  catalog: ExerciseDefinition[];
  onSelectAlternative?: (exercise: ExerciseDefinition) => void;
  onAddToWorkout?: (exercise: ExerciseDefinition) => void;
  canAddToWorkout?: boolean;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  onClose,
  catalog,
  onSelectAlternative,
  onAddToWorkout,
  canAddToWorkout = false,
}) => {
  if (!exercise) return null;

  // Resolve alternative exercise objects
  const alternativeExercises = React.useMemo(() => {
    return (exercise.alternativeIds || [])
      .map((id) => findExerciseByNameOrId(id, catalog))
      .filter((ex): ex is ExerciseDefinition => Boolean(ex));
  }, [exercise.alternativeIds, catalog]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-[#11141D] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Specular Top Border Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF803E]/40 to-transparent" />

        {/* Modal Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-[#141822]/90 backdrop-blur-xl shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Exercise Encyclopedia · Verified Movement</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{exercise.name}</span>
              {exercise.isVerified && (
                <ShieldCheck className="w-5 h-5 text-[#FF803E]" title="Certified Biomechanical Cues" />
              )}
            </h2>
            {exercise.aliases && exercise.aliases.length > 0 && (
              <p className="text-xs text-white/50 mt-0.5">
                Common aliases: {exercise.aliases.join(', ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canAddToWorkout && onAddToWorkout && (
              <GlassButton
                onClick={() => onAddToWorkout(exercise)}
                className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white text-xs px-3 py-1.5"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span>Add to Workout</span>
              </GlassButton>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Top Section: Demonstration Media & Dual Anatomical Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* 1. Exercise Demonstration Player */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-[#FF803E]" />
                <span>1. Movement Execution Demonstration</span>
              </h3>
              <MovementPhaseViewer exercise={exercise} />
            </div>

            {/* 2. Combined Anterior & Posterior Anatomical Map */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF803E]" />
                <span>2. Anatomical Muscle Activation</span>
              </h3>
              <DualAnatomyCard
                primaryMuscles={exercise.primaryMuscles}
                secondaryMuscles={exercise.secondaryMuscles}
                cardTitle="Target Muscular Engagement"
              />
            </div>
          </div>

          {/* 3. Primary & Secondary Muscle Breakdown Chips */}
          <div className="rounded-2xl surface-card p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1">
                Target Muscle Groups
              </span>
              <div className="flex flex-wrap gap-2">
                {exercise.primaryMuscles.map((m) => (
                  <span
                    key={`prim-${m}`}
                    className="px-2.5 py-1 rounded-lg bg-[#FF803E]/15 border border-[#FF803E]/40 text-[#FF803E] text-xs font-bold"
                  >
                    Primary: {MUSCLE_LABELS[m] || m}
                  </span>
                ))}
                {exercise.secondaryMuscles.map((m) => (
                  <span
                    key={`sec-${m}`}
                    className="px-2.5 py-1 rounded-lg bg-[#FFBB86]/10 border border-[#FFBB86]/30 text-[#FFBB86] text-xs font-medium"
                  >
                    Synergist: {MUSCLE_LABELS[m] || m}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/70 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 capitalize font-medium">
                Equipment: {exercise.equipment.replace('_', ' ')}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 capitalize font-medium">
                Difficulty: {exercise.difficulty}
              </span>
            </div>
          </div>

          {/* 4. Evidence-Based Benefits */}
          {exercise.benefits && exercise.benefits.length > 0 && (
            <div className="rounded-2xl surface-card p-4 sm:p-5 border border-white/10 space-y-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF803E]" />
                <span>Biomechanical & Physiological Benefits</span>
              </h3>
              <ul className="space-y-2 text-xs text-white/80">
                {exercise.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF803E] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 5. Step-by-Step Execution Guide */}
          <div className="rounded-2xl surface-card p-4 sm:p-5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF803E]" />
              <span>Step-by-Step Execution Instructions</span>
            </h3>
            <ol className="space-y-2.5 text-xs text-white/80 list-decimal list-inside">
              {exercise.instructions.map((step, idx) => (
                <li key={idx} className="leading-relaxed pl-1 marker:text-[#FF803E] marker:font-bold">
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 6 & 7. Common Mistakes and Safety Precautions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Common Mistakes */}
            <div className="rounded-2xl surface-card p-4 border border-rose-500/20 bg-rose-500/5 space-y-2.5">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Common Execution Mistakes</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-white/75">
                {exercise.commonMistakes.map((mistake, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold shrink-0">✕</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Safety Precautions */}
            <div className="rounded-2xl surface-card p-4 border border-amber-500/20 bg-amber-500/5 space-y-2.5">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Joint Safety & Form Boundaries</span>
              </h4>
              <p className="text-xs text-white/80 leading-relaxed">
                {exercise.safetyNotes}
              </p>
            </div>
          </div>

          {/* 8. Alternative Exercises */}
          {alternativeExercises.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Certified Alternative Movements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {alternativeExercises.map((alt) => (
                  <div
                    key={alt.id}
                    onClick={() => onSelectAlternative?.(alt)}
                    className="p-3 rounded-xl surface-card border border-white/10 hover:border-[#FF803E]/50 transition-all cursor-pointer flex flex-col justify-between gap-2 group hover:-translate-y-0.5"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#FF803E] transition-colors">
                        {alt.name}
                      </h4>
                      <p className="text-[10px] text-white/50 capitalize mt-0.5">
                        {alt.equipment.replace('_', ' ')} · {alt.difficulty}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#FF803E] flex items-center gap-1">
                      <span>Switch Exercise</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. Open-Source Attribution & Commercial Rights Notice */}
          <div className="pt-4 border-t border-white/5 text-[11px] text-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Anatomy & Demonstration data powered by open-source licensed datasets (The Unlicense, MIT, RepDB).
            </span>
            <span className="text-white/60 font-medium">FitPlus Medical-Grade Encyclopedia v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
