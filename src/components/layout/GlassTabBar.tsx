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
    /* Bottom dock — mobile only, hidden on lg+ where the sidebar takes over */
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-safe pointer-events-none">
      <nav
        aria-label={ariaLabel}
        className="glass-nav pointer-events-auto mx-auto max-w-md rounded-[26px] px-2 py-1.5"
      >
        <div
          className="grid items-center gap-0.5"
          style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isAccent = Boolean(item.accent);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative min-h-[54px] rounded-[20px] flex flex-col items-center justify-center gap-[3px] text-[10px] font-semibold tracking-tight transition-colors select-none ${
                    isActive
                      ? 'text-[#FF803E]'
                      : isAccent
                        ? 'text-[#FFB06B]'
                        : 'text-[#7C8393] hover:text-[#A2A8B5] active:text-[#F5F5F7]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active pill highlight */}
                    {isActive ? (
                      <motion.span
                        layoutId="mobile-glass-tab-indicator"
                        transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                        className={
                          'absolute inset-x-1 inset-y-0.5 rounded-[18px] ' +
                          'bg-[#FF803E]/12 border border-[#FF803E]/22 ' +
                          '[box-shadow:inset_0_1px_0_rgba(255,128,62,0.16),0_0_12px_-4px_rgba(255,128,62,0.22)]'
                        }
                        aria-hidden="true"
                      />
                    ) : null}

                    {/* Accent pill for non-active accent items */}
                    {!isActive && isAccent ? (
                      <span
                        className="absolute inset-x-1 inset-y-0.5 rounded-[18px] bg-[#FFB06B]/07 border border-[#FFB06B]/14"
                        aria-hidden="true"
                      />
                    ) : null}

                    {/* Notification badge dot */}
                    {item.badge && item.badge > 0 ? (
                      <span
                        className="absolute top-2 right-3 h-[7px] w-[7px] rounded-full bg-[#FF803E] [box-shadow:0_0_6px_rgba(255,128,62,0.80)]"
                        aria-hidden="true"
                      />
                    ) : null}

                    {/* Icon */}
                    <Icon
                      className={`relative z-10 w-[21px] h-[21px] transition-transform ${
                        isActive ? 'scale-110' : ''
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.9}
                      aria-hidden="true"
                    />

                    {/* Label */}
                    <span
                      className={`relative z-10 leading-none ${
                        isActive ? 'text-[#FF803E]' : ''
                      }`}
                    >
                      {item.label}
                    </span>
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
