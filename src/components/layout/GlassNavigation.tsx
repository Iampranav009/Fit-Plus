import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Menu, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BrandMark } from '../ui/BrandMark';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
  badge?: number;
}

/* ── Mobile full-screen navigation drawer ──────────────────────── */
export const MobileNavDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  activeUserName: string;
  workspaceCaption: string;
  isTrainerRoute: boolean;
}> = ({ isOpen, onClose, navItems, activeUserName, workspaceCaption, isTrainerRoute }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ backdropFilter: 'blur(6px) saturate(0.85)' }}
            className="fixed inset-0 z-40 bg-black/55 lg:hidden"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed inset-y-0 left-0 z-50 w-[290px] flex flex-col lg:hidden"
            style={{
              background: 'rgba(14, 16, 24, 0.94)',
              borderRight: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(28px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
              boxShadow:
                'inset -1px 0 0 rgba(255,255,255,0.07), 4px 0 32px -4px rgba(0,0,0,0.65)',
            }}
          >
            {/* Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07] shrink-0">
              <Link
                to={isTrainerRoute ? '/studio/overview' : '/app/home'}
                onClick={onClose}
                aria-label="FitPlus home"
              >
                <BrandMark />
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Role badge */}
            <div className="px-4 pt-3 pb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FF803E]/12 border border-[#FF803E]/22 text-[#FFB06B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF803E]" />
                {isTrainerRoute ? 'Trainer Studio' : 'Client App'}
              </span>
            </div>

            {/* Nav items */}
            <nav
              aria-label={isTrainerRoute ? 'Trainer studio navigation' : 'Client navigation'}
              className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `relative min-h-[46px] px-3.5 py-2.5 rounded-[14px] flex items-center gap-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'text-[#FF803E] bg-[#FF803E]/10 border border-[#FF803E]/20 [box-shadow:inset_0_1px_0_rgba(255,128,62,0.14)]'
                          : 'text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.055] border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#FF803E]' : ''}`}
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && item.badge > 0 ? (
                          <span className="px-1.5 rounded-full bg-[#FF803E] text-white text-[10px] font-bold leading-5 min-w-[18px] text-center">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* User footer */}
            <div className="px-4 py-4 border-t border-white/[0.07] shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF803E]/20 border border-[#FF803E]/30 flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-bold text-[#FF803E]">
                    {activeUserName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#F5F5F7] truncate leading-tight">
                    {activeUserName}
                  </p>
                  <p className="text-[11px] text-[#7C8393] truncate leading-tight mt-0.5">
                    {workspaceCaption}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ── Desktop sidebar ────────────────────────────────────────────── */
export const GlassSidebar: React.FC<{
  isTrainerRoute: boolean;
  navItems: NavItem[];
  activeUserName: string;
  workspaceCaption: string;
}> = ({ isTrainerRoute, navItems, activeUserName, workspaceCaption }) => {
  return (
    <aside
      aria-label={isTrainerRoute ? 'Trainer studio navigation' : 'Client navigation'}
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-3 lg:left-3 rounded-[24px] glass-nav z-30 ${
        isTrainerRoute ? 'lg:w-[248px]' : 'lg:w-[228px]'
      }`}
    >
      {/* Brand header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07] shrink-0">
        <Link to={isTrainerRoute ? '/studio/overview' : '/app/home'} aria-label="FitPlus home">
          <BrandMark />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative min-h-[42px] px-3 py-2 rounded-[13px] flex items-center gap-2.5 text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-[#FF803E]'
                    : 'text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.055]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId={isTrainerRoute ? 'studio-sidebar-pill' : 'client-sidebar-pill'}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className={
                        'absolute inset-0 rounded-[13px] ' +
                        'bg-[#FF803E]/12 border border-[#FF803E]/24 ' +
                        '[box-shadow:inset_0_1px_0_rgba(255,128,62,0.18),0_0_14px_-4px_rgba(255,128,62,0.22)]'
                      }
                      aria-hidden="true"
                    />
                  ) : null}
                  <Icon
                    className={`relative z-10 w-[17px] h-[17px] shrink-0 ${
                      isActive ? 'text-[#FF803E]' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span className="relative z-10 flex-1 truncate">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="relative z-10 px-1.5 rounded-full bg-[#FF803E] text-white text-[10px] font-bold leading-5 min-w-[18px] text-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-3.5 border-t border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-[#FF803E]/20 border border-[#FF803E]/30 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-[#FF803E]">
              {activeUserName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#F5F5F7] truncate leading-tight">
              {activeUserName}
            </p>
            <p className="text-[11px] text-[#7C8393] truncate leading-tight mt-0.5">
              {workspaceCaption}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

/* ── Mobile top header ──────────────────────────────────────────── */
export const GlassTopHeader: React.FC<{
  isTrainerRoute: boolean;
  unreadCount: number;
  pageTitle?: string;
  headerRight?: React.ReactNode;
  onMenuOpen?: () => void;
}> = ({ isTrainerRoute, unreadCount, pageTitle, headerRight, onMenuOpen }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
      <div className="glass-nav h-14 rounded-[18px] px-3 sm:px-5 flex items-center justify-between gap-2">
        {/* Left: hamburger (mobile) + brand/title (desktop) */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Hamburger — mobile only */}
          {onMenuOpen ? (
            <button
              type="button"
              onClick={onMenuOpen}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-[20px] h-[20px]" aria-hidden="true" />
            </button>
          ) : (
            <Link
              to={isTrainerRoute ? '/studio/overview' : '/app/home'}
              className="lg:hidden shrink-0 min-h-[44px] flex items-center px-1"
              aria-label="FitPlus home"
            >
              <BrandMark size="sm" />
            </Link>
          )}
          {/* Page title — desktop only */}
          {pageTitle ? (
            <span className="hidden lg:inline text-[14px] font-medium text-[#A2A8B5] truncate">
              {pageTitle}
            </span>
          ) : null}
        </div>

        {/* Center: brand mark on mobile when hamburger is shown */}
        {onMenuOpen ? (
          <Link
            to={isTrainerRoute ? '/studio/overview' : '/app/home'}
            className="lg:hidden absolute left-1/2 -translate-x-1/2 min-h-[44px] flex items-center"
            aria-label="FitPlus home"
          >
            <BrandMark size="sm" />
          </Link>
        ) : null}

        {/* Right: custom content + notification bell */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerRight}
          <button
            type="button"
            onClick={() =>
              navigate(isTrainerRoute ? '/studio/notifications' : '/app/notifications')
            }
            aria-label="Open notifications"
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className="absolute top-2.5 right-2.5 h-[8px] w-[8px] rounded-full bg-[#FF803E] [box-shadow:0_0_8px_rgba(255,128,62,0.90)]"
              />
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
};
