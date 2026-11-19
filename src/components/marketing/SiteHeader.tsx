import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandMark } from '../ui/BrandMark';
import { CTA } from './links';

const NAV_ITEMS = [
  { label: 'For trainers', to: CTA.forTrainers.to },
  { label: 'How it works', to: CTA.howItWorks.to },
  { label: 'Try the demo', to: CTA.demo.to },
] as const;

function useAccountLink() {
  const { firebaseUser, isEmailVerified, isCloudSynced, store } = useApp();
  const signedIn = Boolean(firebaseUser && isEmailVerified);
  if (!signedIn) return { label: CTA.signIn.label, to: CTA.signIn.to };
  const to =
    store.session.onboardingCompleted && isCloudSynced
      ? store.session.activeRole === 'trainer'
        ? '/studio/overview'
        : '/app/home'
      : '/auth';
  return { label: 'Open FitPlus', to };
}

export const SiteHeader: React.FC = () => {
  const location = useLocation();
  const account = useAccountLink();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  // Close reliably on any navigation (path or hash change).
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash, location.search]);

  // Focus management, Escape, focus trap and scroll lock while the menu is open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [toggleRef.current, ...focusables()].filter(Boolean) as HTMLElement[];
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
    };
  }, [open, close]);

  // Close the mobile menu if the viewport grows past the breakpoint.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia('(min-width: 900px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [open]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-1 py-2 text-[0.9375rem] font-medium transition-colors duration-150 ${
      isActive ? 'text-[#F3EEE7]' : 'text-[#ABA59D] hover:text-[#F3EEE7]'
    }`;

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 pt-safe">
      <div className="mkt-header-glass mx-auto max-w-[1240px] h-[var(--mk-header-h)] rounded-[20px] pl-4 pr-2 sm:pl-6 sm:pr-3 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Fit Plus home" className="shrink-0 rounded-lg">
          <BrandMark />
        </Link>

        <nav aria-label="Main" className="hidden min-[900px]:flex items-center gap-7">
          {NAV_ITEMS.map((item) =>
            item.to.includes('#') ? (
              <Link key={item.to} to={item.to} className={navLinkClass({ isActive: false })}>
                {item.label}
              </Link>
            ) : (
              <NavLink key={item.to} to={item.to} end className={navLinkClass}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to={account.to}
            className="hidden min-[900px]:inline-flex min-h-[44px] items-center px-2 text-[0.9375rem] font-medium text-[#ABA59D] hover:text-[#F3EEE7] transition-colors duration-150"
          >
            {account.label}
          </Link>
          <Link
            to={CTA.findTrainer.to}
            className="mkt-btn mkt-btn-primary mkt-btn-sm hidden sm:inline-flex"
          >
            {CTA.findTrainer.label}
            <ArrowRight className="mkt-arrow w-4 h-4" aria-hidden="true" />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => (open ? close() : setOpen(true))}
            className="min-[900px]:hidden inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-full border border-white/15 text-[0.9375rem] font-medium text-[#F3EEE7] hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
          >
            {open ? (
              <X className="w-[18px] h-[18px]" aria-hidden="true" />
            ) : (
              <Menu className="w-[18px] h-[18px]" aria-hidden="true" />
            )}
            Menu
          </button>
        </div>
      </div>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-[-1] bg-black/70 min-[900px]:hidden"
            aria-hidden="true"
            onClick={() => close(false)}
          />
          <div
            ref={panelRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="min-[900px]:hidden mx-auto max-w-[1240px] mt-2 rounded-[20px] mkt-header-glass p-3"
          >
            <nav aria-label="Main mobile" className="flex flex-col">
              {[
                { label: CTA.findTrainer.label, to: CTA.findTrainer.to },
                ...NAV_ITEMS,
                { label: account.label, to: account.to },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between min-h-[52px] px-4 rounded-[14px] text-[1.0625rem] font-medium text-[#F3EEE7] hover:bg-white/[0.06] transition-colors duration-150"
                >
                  {item.label}
                  <ArrowRight className="w-4 h-4 text-[#8E8880]" aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <p className="px-4 pt-2 pb-1 mkt-small">
              The demo opens a sample client workspace with example data. No account is created.
            </p>
          </div>
        </>
      ) : null}
    </header>
  );
};
