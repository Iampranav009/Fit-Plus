import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface MarketingDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Element to return focus to on close. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Accessible modal sheet for the public site: focus moves inside on open,
 * Tab is trapped, Escape and the backdrop close it, and focus returns to the
 * trigger. Rendered in a `.mkt` portal so marketing tokens apply.
 */
export const MarketingDialog: React.FC<MarketingDialogProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  returnFocusRef,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the focus effect on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const returnTo = returnFocusRef?.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    (focusables()[1] ?? focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnTo?.focus();
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return createPortal(
    <div className="mkt !min-h-0 !bg-transparent fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center items-center">
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:max-w-lg max-h-[88vh] flex flex-col rounded-t-[24px] sm:rounded-[24px] bg-[#111114] border border-white/[0.12] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 border-b border-white/[0.08]">
          <h2 id={titleId} className="text-[1.125rem] font-semibold text-[#F3EEE7]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 inline-flex items-center justify-center rounded-full text-[#ABA59D] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="px-5 py-4 border-t border-white/[0.08] pb-safe">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
};
