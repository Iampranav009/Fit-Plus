import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface GlassTooltipProps {
  label?: string;
  content: string;
  children?: React.ReactNode;
}

export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  label = 'More information',
  content,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label={children ? undefined : label}
        aria-expanded={open}
        className="min-h-[44px] min-w-[44px] px-2 -m-2 inline-flex items-center justify-center rounded-full text-[#A2A8B5] hover:text-[#F5F5F7] cursor-pointer"
      >
        {children ?? <Info className="w-4 h-4" aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass-overlay absolute bottom-full right-0 mb-2 w-64 rounded-[14px] p-3 text-[12px] leading-relaxed text-[#F5F5F7] z-40"
          >
            {content}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
