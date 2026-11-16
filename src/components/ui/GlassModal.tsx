import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  mode?: 'auto' | 'modal' | 'sheet';
}

export const GlassModal: React.FC<GlassModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClass = 'md:max-w-lg',
  mode = 'auto',
}) => {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 15);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  const containerAlignment =
    mode === 'sheet'
      ? 'items-end'
      : mode === 'modal'
        ? 'items-center p-4'
        : 'items-end md:items-center p-0 md:p-4';

  const panelRadius =
    mode === 'sheet'
      ? 'rounded-t-[28px]'
      : mode === 'modal'
        ? 'rounded-[26px]'
        : 'rounded-t-[28px] md:rounded-[26px]';

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className={`fixed inset-0 z-50 flex justify-center bg-[#090B10]/72 backdrop-blur-md ${containerAlignment}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`glass-overlay w-full ${maxWidthClass} max-h-[90vh] flex flex-col ${panelRadius} outline-none overflow-hidden`}
          >
            {mode !== 'modal' ? (
              <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />
            ) : null}
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-4 pb-3.5 border-b border-white/[0.08] shrink-0">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[20px] font-semibold text-[#F5F5F7] leading-snug tracking-[-0.015em]">
                  {title}
                </h2>
                {description ? (
                  <p id={descId} className="mt-1 text-[13px] text-[#A2A8B5]">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto overflow-x-hidden px-5 sm:px-6 py-4 pb-safe">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
