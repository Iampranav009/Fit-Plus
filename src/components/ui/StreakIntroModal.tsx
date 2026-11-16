import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { DayConsistency } from '../../types/domain';
import { formatIndiaDate } from '../../lib/date';
import { GlassButton } from './GlassButton';
import { StreakFlameSvg } from './FitnessIllustrations';

interface StreakIntroModalProps {
  open: boolean;
  streakCount: number;
  longestStreak: number;
  weeklyStrip: DayConsistency[];
  todayKey: string;
  isMilestone?: boolean;
  onContinue: () => void;
}

export const StreakIntroModal: React.FC<StreakIntroModalProps> = ({
  open,
  streakCount,
  longestStreak,
  weeklyStrip,
  todayKey,
  isMilestone = false,
  onContinue,
}) => {
  const [animatedCount, setAnimatedCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setAnimatedCount(streakCount);
      return;
    }

    setAnimatedCount(Math.max(0, streakCount - 3));
    const timer = window.setTimeout(() => {
      setAnimatedCount(streakCount);
    }, 180);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, streakCount, onContinue]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="streak-intro-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090B10]/85 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -48 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="glass-overlay relative w-full max-w-md rounded-[28px] p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden"
          >
            {/* Subtle ambient ember glow */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#FF803E]/18 blur-3xl"
              aria-hidden="true"
            />

            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 320, damping: 20 }}
              className="relative z-10 w-20 h-20 rounded-[24px] bg-[#FF803E]/12 border border-[#FF803E]/30 flex items-center justify-center"
            >
              <StreakFlameSvg size={48} active celebrate />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="relative z-10 mt-5 text-[48px] leading-none font-bold tracking-[-0.03em] text-[#F5F5F7] tabular-nums"
            >
              {animatedCount}
            </motion.p>

            <h2
              id="streak-intro-title"
              className="relative z-10 mt-2 text-[22px] font-semibold text-[#F5F5F7] tracking-[-0.015em]"
            >
              {isMilestone
                ? `You showed up today · ${streakCount} day streak`
                : `${streakCount} day active streak`}
            </h2>

            <p className="relative z-10 mt-2 text-[14px] text-[#A2A8B5] leading-relaxed max-w-xs">
              {isMilestone
                ? 'All required commitments for today are complete. Keep showing up calmly.'
                : `Your longest run is ${longestStreak} days. Complete today's required commitments to extend your streak.`}
            </p>

            {/* 7-day consistency indicator strip */}
            <div className="relative z-10 w-full mt-6 rounded-[18px] bg-[#101218]/75 border border-white/[0.08] p-3.5">
              <div className="grid grid-cols-7 gap-1.5">
                {weeklyStrip.map((day) => {
                  const isToday = day.dateKey === todayKey;
                  const done = day.status === 'completed' || day.status === 'recovery_completed';
                  const pending = day.status === 'pending';
                  return (
                    <div key={day.dateKey} className="flex flex-col items-center gap-1.5">
                      <span className="text-[11px] text-[#7C8393]">
                        {formatIndiaDate(day.dateKey, 'weekday').slice(0, 1)}
                      </span>
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold tabular-nums border ${
                          done
                            ? 'bg-[#FF803E] border-[#FF803E] text-[#101218]'
                            : pending && isToday
                              ? 'bg-[#252A35] border-[#FF803E]/70 text-[#F5F5F7]'
                              : day.status === 'neutral'
                                ? 'bg-[#1C2029] border-white/10 text-[#A2A8B5]'
                                : 'bg-[#101218] border-white/10 text-[#7C8393]'
                        }`}
                      >
                        {day.dateKey.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[11px] text-[#7C8393]">
                Earned only by completing scheduled commitments · Opening the app never extends streaks
              </p>
            </div>

            <div className="relative z-10 w-full mt-6">
              <GlassButton fullWidth onClick={onContinue}>
                Continue to Today
              </GlassButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
