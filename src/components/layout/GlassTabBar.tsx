import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import type { NavItem } from './GlassNavigation';

interface GlassTabBarProps {
  items: NavItem[];
  ariaLabel?: string;
}

export const GlassTabBar: React.FC<GlassTabBarProps> = ({
  items,
  ariaLabel = 'Primary mobile navigation',
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-safe pointer-events-none">
      <nav
        aria-label={ariaLabel}
        className="glass-nav pointer-events-auto mx-auto max-w-md rounded-[22px] px-1.5 py-1"
      >
        <div className="grid grid-cols-5 items-center">
          {items.map((item) => {
            const Icon = item.icon;
            const accent = Boolean(item.accent);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative min-h-[48px] rounded-[16px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-[#FF803E]'
                      : accent
                        ? 'text-[#FFB06B]'
                        : 'text-[#A2A8B5] hover:text-[#F5F5F7]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="mobile-glass-tab-indicator"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-x-1.5 inset-y-0.5 rounded-[15px] bg-[#FF803E]/14 border border-[#FF803E]/25"
                        aria-hidden="true"
                      />
                    ) : null}
                    <Icon className="relative z-10 w-[19px] h-[19px]" aria-hidden="true" />
                    <span className="relative z-10 whitespace-nowrap leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
