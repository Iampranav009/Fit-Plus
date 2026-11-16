import React from 'react';
import { Check, Info, AlertCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-24 lg:bottom-6 right-4 left-4 md:left-auto z-50 flex flex-col items-end gap-2 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'error' ? AlertCircle : toast.tone === 'info' ? Info : Check;
          const accent =
            toast.tone === 'error'
              ? 'text-[#FF6B70]'
              : toast.tone === 'info'
                ? 'text-[#70C8ED]'
                : 'text-[#B8E66C]';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              className="glass-overlay pointer-events-auto w-full md:w-auto md:min-w-[300px] md:max-w-md flex items-center gap-3 rounded-[16px] px-4 py-3"
            >
              <Icon className={`w-4 h-4 shrink-0 ${accent}`} aria-hidden="true" />
              <span className="text-[14px] text-[#F5F5F7] flex-1">{toast.text}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[10px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
