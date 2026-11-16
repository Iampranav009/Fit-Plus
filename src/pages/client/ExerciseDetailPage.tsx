import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, AlertCircle } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useApp } from '../../context/AppContext';
import { findExerciseByNameOrId } from '../../data/exerciseLibrary';
import { MovementPhaseViewer } from '../../components/exercise/MovementPhaseViewer';
import { DualAnatomyCard } from '../../components/anatomy/DualAnatomyCard';
import { MUSCLE_LABELS } from '../../data/exerciseLibrary';
import { GlassButton } from '../../components/ui/GlassButton';

export const ExerciseDetailPage: React.FC = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const { allExercises } = useApp();

  const exercise = useMemo(() => {
    if (!exerciseId) return undefined;
    return findExerciseByNameOrId(exerciseId, allExercises);
  }, [exerciseId, allExercises]);

  if (!exercise) {
    return (
      <AppShell pageTitle="Exercise Not Found">
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#FF803E] mx-auto opacity-70" />
          <h2 className="text-xl font-bold text-white">Movement Not Found</h2>
          <p className="text-sm text-white/60">
            The requested exercise identifier could not be resolved in the encyclopedia catalog.
          </p>
          <GlassButton onClick={() => navigate(-1)} className="mx-auto mt-4 text-white">
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>Return to Library</span>
          </GlassButton>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={exercise.name}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Exercise Library</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>FitPlus Visual Encyclopedia</span>
          </div>
        </div>

        {/* Title Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white">{exercise.name}</h1>
          {exercise.aliases && exercise.aliases.length > 0 && (
            <p className="text-sm text-white/50 mt-1">
              Also known as: {exercise.aliases.join(', ')}
            </p>
          )}
        </div>

        {/* Media & Anatomy Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              1. Movement Execution Demonstration
            </h3>
            <MovementPhaseViewer exercise={exercise} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              2. Anatomical Muscle Targeting
            </h3>
            <DualAnatomyCard
              primaryMuscles={exercise.primaryMuscles}
              secondaryMuscles={exercise.secondaryMuscles}
            />
          </div>
        </div>

        {/* Target Muscle Pills */}
        <div className="rounded-2xl surface-card p-4 border border-white/10 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider mr-2">
            Target Muscles:
          </span>
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

        {/* Instructions */}
        <div className="rounded-2xl surface-card p-6 border border-white/10 space-y-3">
          <h3 className="text-base font-bold text-white">Execution Instructions</h3>
          <ol className="space-y-2 text-sm text-white/80 list-decimal list-inside">
            {exercise.instructions.map((step, idx) => (
              <li key={idx} className="leading-relaxed marker:text-[#FF803E]">
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Benefits */}
        {exercise.benefits && exercise.benefits.length > 0 && (
          <div className="rounded-2xl surface-card p-6 border border-white/10 space-y-3">
            <h3 className="text-base font-bold text-white">Evidence-Based Benefits</h3>
            <ul className="space-y-2 text-sm text-white/80 list-disc list-inside">
              {exercise.benefits.map((b, idx) => (
                <li key={idx} className="leading-relaxed marker:text-[#FF803E]">
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
};
