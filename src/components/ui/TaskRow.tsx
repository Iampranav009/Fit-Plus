import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Check,
  ChevronRight,
  Dumbbell,
  Footprints,
  HeartHandshake,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type { Assignment, TaskCategory } from '../../types/domain';

interface TaskRowProps {
  assignment: Assignment;
  completed: boolean;
  onToggle: () => void;
}

const CategoryIcon: React.FC<{ category: TaskCategory; completed: boolean }> = ({
  category,
  completed,
}) => {
  const color = completed
    ? '#B8E66C'
    : category === 'workout'
      ? '#FF803E'
      : category === 'nutrition'
        ? '#B8E66C'
        : category === 'recovery'
          ? '#C1ACF9'
          : category === 'check_in'
            ? '#70C8ED'
            : '#FF803E';

  const cls = 'w-4 h-4';
  const style = { color };
  if (category === 'workout') return <Dumbbell className={cls} style={style} aria-hidden="true" />;
  if (category === 'nutrition') return <Utensils className={cls} style={style} aria-hidden="true" />;
  if (category === 'recovery') return <HeartHandshake className={cls} style={style} aria-hidden="true" />;
  if (category === 'check_in') return <Sparkles className={cls} style={style} aria-hidden="true" />;
  return <Footprints className={cls} style={style} aria-hidden="true" />;
};

const categoryLabels: Record<TaskCategory, string> = {
  workout: 'Workout',
  nutrition: 'Nutrition',
  habit: 'Habit',
  recovery: 'Recovery',
  check_in: 'Check-in',
};

export const TaskRow: React.FC<TaskRowProps> = ({ assignment, completed, onToggle }) => {
  return (
    <motion.div
      layout="position"
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className={`surface-card flex items-center gap-3.5 rounded-[18px] px-3.5 py-3 transition-all ${
        completed
          ? 'opacity-70'
          : 'hover:border-white/[0.14] hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.12),0_4px_20px_-6px_rgba(9,11,16,0.55)]'
      }`}
    >
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.9 }}
        aria-pressed={completed}
        aria-label={completed ? `Undo ${assignment.title}` : `Mark ${assignment.title} complete`}
        className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[13px] border transition-colors shrink-0 cursor-pointer ${
          completed
            ? 'bg-[#B8E66C]/18 border-[#B8E66C]/70 text-[#B8E66C]'
            : 'bg-[#252A35] border-white/[0.1] text-[#A2A8B5] hover:border-[#FF803E]/70'
        }`}
      >
        {completed ? (
          <Check className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
        ) : (
          <CategoryIcon category={assignment.category} completed={false} />
        )}
      </motion.button>

      <Link
        to={`/app/tasks/${assignment.id}`}
        className="flex-1 min-w-0 py-1 flex items-center justify-between gap-2 group"
      >
        <div className="min-w-0">
          <p
            className={`text-[15px] font-medium leading-snug ${
              completed ? 'text-[#A2A8B5] line-through decoration-[#7C8393]/70' : 'text-[#F5F5F7]'
            }`}
          >
            {assignment.title}
          </p>
          <p className="mt-0.5 text-[12px] text-[#A2A8B5] flex flex-wrap items-center gap-x-1.5 tabular-nums">
            <span>{categoryLabels[assignment.category]}</span>
            <span aria-hidden="true">·</span>
            <span>{assignment.durationMinutes} min</span>
            <span aria-hidden="true">·</span>
            <span>Due {assignment.dueTime}</span>
            {assignment.isOptional ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Optional</span>
              </>
            ) : null}
          </p>
        </div>

        <ChevronRight
          className="w-4 h-4 text-[#7C8393] group-hover:text-[#F5F5F7] shrink-0 transition-colors"
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  );
};
