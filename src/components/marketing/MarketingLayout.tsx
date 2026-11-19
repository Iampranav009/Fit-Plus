import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../../styles/marketing.css';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

interface MarketingLayoutProps {
  children: React.ReactNode;
  /** Hide the full footer (e.g. on the focused sign-in screen). */
  compactFooter?: boolean;
  mainClassName?: string;
}

/**
 * Shell for every public marketing / entry route. All marketing styling is
 * scoped under `.mkt`, so app and Studio screens never inherit it.
 */
export const MarketingLayout: React.FC<MarketingLayoutProps> = ({
  children,
  compactFooter = false,
  mainClassName = '',
}) => {
  const { pathname, hash } = useLocation();
  // Each public route starts at the top unless it targets an anchor.
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
  <div className="mkt">
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#FF803E] focus:text-[#0B0B0B] focus:font-semibold"
    >
      Skip to content
    </a>
    <SiteHeader />
    <main id="main" tabIndex={-1} className={`flex-1 outline-none ${mainClassName}`}>
      {children}
    </main>
    <SiteFooter compact={compactFooter} />
  </div>
  );
};
