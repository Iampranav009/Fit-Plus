import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandMark } from '../ui/BrandMark';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
}

interface GlassNavigationProps {
  isTrainerRoute: boolean;
  navItems: NavItem[];
  activeUserName: string;
  workspaceCaption: string;
  unreadCount: number;
  pageTitle?: string;
  headerRight?: React.ReactNode;
}

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
        isTrainerRoute ? 'lg:w-[244px]' : 'lg:w-[224px]'
      }`}
    >
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.08]">
        <Link to={isTrainerRoute ? '/studio/overview' : '/app/home'} aria-label="FitPlus home">
          <BrandMark />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative min-h-[44px] px-3.5 py-2.5 rounded-[14px] flex items-center gap-3 text-[14px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-[#FF803E]'
                    : 'text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.05]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId={isTrainerRoute ? 'studio-sidebar-pill' : 'client-sidebar-pill'}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-[14px] bg-[#FF803E]/14 border border-[#FF803E]/28"
                      aria-hidden="true"
                    />
                  ) : null}
                  <Icon className="relative z-10 w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  <span className="relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.08] text-[12px] text-[#7C8393]">
        <p className="text-[#F5F5F7] font-medium truncate">{activeUserName}</p>
        <p className="mt-0.5 truncate">{workspaceCaption}</p>
      </div>
    </aside>
  );
};

export const GlassTopHeader: React.FC<{
  isTrainerRoute: boolean;
  unreadCount: number;
  pageTitle?: string;
  headerRight?: React.ReactNode;
}> = ({ isTrainerRoute, unreadCount, pageTitle, headerRight }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
      <div className="glass-nav h-14 rounded-[18px] px-3.5 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={isTrainerRoute ? '/studio/overview' : '/app/home'}
            className="lg:hidden shrink-0"
            aria-label="FitPlus home"
          >
            <BrandMark size="sm" />
          </Link>
          {pageTitle ? (
            <span className="hidden lg:inline text-[15px] font-medium text-[#A2A8B5] truncate">
              {pageTitle}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          <button
            type="button"
            onClick={() =>
              navigate(isTrainerRoute ? '/studio/notifications' : '/app/notifications')
            }
            aria-label="Open notifications"
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <Bell className="w-[19px] h-[19px]" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#FF803E] shadow-[0_0_8px_rgba(255,128,62,0.85)]"
              />
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
};
