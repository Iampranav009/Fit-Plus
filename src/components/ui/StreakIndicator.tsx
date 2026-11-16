import React from 'react';
import { motion } from 'motion/react';
import { StreakFlameSvg } from './FitnessIllustrations';

interface StreakIndicatorProps {
  count: number;
  celebrate?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({
  count,
  celebrate = false,
  onClick,
  ariaLabel = 'Open streak details',
}) => {
  const active = count > 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.96 }}
      className={`glass-control min-h-[44px] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
        active ? 'hover:border-[#FF803E]/60' : 'hover:border-white/20'
      }`}
    >
      <StreakFlameSvg size={19} active={active} celebrate={celebrate} />
      <span className="text-[14px] font-semibold text-[#F5F5F7] tabular-nums">{count}</span>
    </motion.button>
  );
};
