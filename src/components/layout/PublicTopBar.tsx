import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { BrandMark } from '../ui/BrandMark';
import { PWAInstallButton } from '../ui/PWAInstallButton';

export const PublicTopBar: React.FC = () => {
  const { firebaseUser, isEmailVerified, isCloudSynced, store } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isVerifiedUser = Boolean(firebaseUser && isEmailVerified);
  const workspaceTo =
    store.session.onboardingCompleted && isCloudSynced
      ? store.session.activeRole === 'trainer'
        ? '/studio/overview'
        : '/app/home'
      : '/auth';

  const navLinks = [
    { to: '/discover', label: 'Find a trainer' },
    { to: '/welcome', label: 'How it works' },
    { to: '/demo', label: 'Interactive demo' },
    { to: '/auth', label: isVerifiedUser ? 'Account' : 'Sign in' },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
        <div className="glass-nav max-w-[1280px] mx-auto h-14 rounded-[18px] px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" aria-label="FitPlus home" className="whitespace-nowrap shrink-0">
            <BrandMark />
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Public navigation"
            className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#A2A8B5]"
          >
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="hover:text-[#F5F5F7] transition-colors whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right: PWA + CTA + mobile hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
            <Link
              to={isVerifiedUser ? workspaceTo : '/auth'}
              className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-[12px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold hover:bg-[#FF9259] transition-colors shadow-[0_8px_20px_-6px_rgba(255,128,62,0.55)] whitespace-nowrap shrink-0"
            >
              {isVerifiedUser ? 'Open FitPlus' : 'Get started'}
            </Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
            >
              <Menu className="w-[20px] h-[20px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="pub-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ backdropFilter: 'blur(6px) saturate(0.85)' }}
              className="fixed inset-0 z-40 bg-black/55 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="pub-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col md:hidden"
              style={{
                background: 'rgba(14, 16, 24, 0.94)',
                borderRight: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(28px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
                boxShadow: '4px 0 32px -4px rgba(0,0,0,0.65)',
              }}
            >
              {/* Drawer header */}
              <div className="h-14 px-5 flex items-center justify-between border-b border-white/[0.07]">
                <Link to="/" onClick={() => setMobileOpen(false)} aria-label="FitPlus home">
                  <BrandMark />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Links */}
              <nav className="flex-1 px-3 py-4 flex flex-col gap-1" aria-label="Mobile public navigation">
                {navLinks.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="min-h-[46px] px-4 rounded-[14px] flex items-center text-[15px] font-medium text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.055] transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              {/* CTA footer */}
              <div className="p-4 border-t border-white/[0.07]">
                <Link
                  to={isVerifiedUser ? workspaceTo : '/auth'}
                  onClick={() => setMobileOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-[14px] bg-[#FF803E] text-[#101218] text-[15px] font-semibold hover:bg-[#FF9259] transition-colors shadow-[0_8px_20px_-6px_rgba(255,128,62,0.55)]"
                >
                  {isVerifiedUser ? 'Open FitPlus' : 'Get started'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
