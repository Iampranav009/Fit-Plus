import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, X } from 'lucide-react';
import type { AchievementUnlock } from '../../types/domain';
import { AchievementBadgeSvg } from './FitnessIllustrations';
import { triggerHaptic } from '../../lib/haptics';

interface AchievementUnlockModalProps {
  unlock: AchievementUnlock | null;
  onDismiss: () => void;
}

export const AchievementUnlockModal: React.FC<AchievementUnlockModalProps> = ({
  unlock,
  onDismiss,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (unlock) {
      triggerHaptic('success');
    }
  }, [unlock]);

  if (!unlock) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0A0C10]/80 backdrop-blur-md"
          onClick={onDismiss}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="relative w-full max-w-sm rounded-[28px] bg-gradient-to-b from-[#252A35]/95 to-[#1C2029]/95 p-6 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-center overflow-hidden"
        >
          {/* Ambient Radial Lighting */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-40"
            style={{ background: 'radial-gradient(circle, #FF803E 0%, transparent 70%)' }}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close achievement modal"
            className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Celebration Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF803E]/15 border border-[#FF803E]/30 text-[#FF803E] text-xs font-semibold tracking-wide uppercase mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Milestone Achieved</span>
          </div>

          {/* Medallion Display */}
          <div className="relative mx-auto my-2 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative p-3 rounded-2xl bg-white/5 border border-white/10 shadow-xl"
            >
              <AchievementBadgeSvg kind={unlock.badgeId} unlocked={true} size={88} />
            </motion.div>
          </div>

          {/* Title & Description */}
          <h3 className="mt-4 text-xl font-bold text-white tracking-tight">
            {unlock.title}
          </h3>
          <p className="mt-2 text-sm text-white/70 leading-relaxed max-w-xs mx-auto">
            {unlock.description}
          </p>

          {/* Metric Snapshot if available */}
          {unlock.metricSnapshot && (
            <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs font-mono text-white/60">
              Verified Progress: {unlock.metricSnapshot}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white font-semibold text-sm shadow-lg shadow-[#FF803E]/20 hover:brightness-105 active:scale-[0.98] transition-all"
            >
              Keep Training
            </button>
            <button
              type="button"
              onClick={() => {
                onDismiss();
                navigate('/app/progress');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-4 h-4 text-[#FF803E]" />
              <span>View Milestone Gallery</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
