import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingActionButtonProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  label,
  icon,
  className = '',
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`h-14 w-14 rounded-full bg-[#FF803E] text-[#101218] flex items-center justify-center shadow-[0_12px_28px_-4px_rgba(255,128,62,0.58),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-[#FF9259] cursor-pointer ${className}`}
    >
      {icon ?? <Plus className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />}
    </motion.button>
  );
};
