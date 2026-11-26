import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandMark } from '../../components/ui/BrandMark';
import type { LucideIcon } from 'lucide-react';

interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/trainers', label: 'Trainers', icon: UserCheck },
  { to: '/admin/clients', label: 'Clients', icon: Users },
  { to: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

export const AdminLayout: React.FC = () => {
  const { firebaseUser, activeUser, signOutGoogle } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = collapsed ? 'lg:w-[72px]' : 'lg:w-[240px]';
  const contentOffset = collapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]';

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7]">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 lg:hidden px-3 pt-2.5 pt-safe">
        <div className="glass-nav h-14 rounded-[18px] px-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <Link to="/admin" aria-label="FitPlus admin">
            <BrandMark size="sm" />
          </Link>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B8E66C]">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Admin
          </span>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="admin-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ backdropFilter: 'blur(6px) saturate(0.85)' }}
              className="fixed inset-0 z-40 bg-black/55 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="admin-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col lg:hidden"
              style={{
                background: 'rgba(14, 16, 24, 0.94)',
                borderRight: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(28px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
              }}
            >
              <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07] shrink-0">
                <Link to="/admin" onClick={() => setMobileOpen(false)} aria-label="FitPlus admin">
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
              <div className="px-4 pt-3 pb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#B8E66C]/12 border border-[#B8E66C]/22 text-[#B8E66C]">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  Platform Admin
                </span>
              </div>
              <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/admin'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `min-h-[46px] px-3.5 py-2.5 rounded-[14px] flex items-center gap-3 text-[14px] font-medium transition-colors ${
                          isActive
                            ? 'text-[#B8E66C] bg-[#B8E66C]/10 border border-[#B8E66C]/20'
                            : 'text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.055] border border-transparent'
                        }`
                      }
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
              <div className="px-4 py-4 border-t border-white/[0.07] shrink-0">
                <p className="text-[12px] text-[#7C8393] truncate">{firebaseUser?.email}</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-3 lg:left-3 rounded-[24px] glass-nav z-30 transition-all duration-200 ${sidebarWidth}`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/[0.07] shrink-0">
          {!collapsed && (
            <Link to="/admin" aria-label="FitPlus admin">
              <BrandMark />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[10px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer mx-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 pt-3 pb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#B8E66C]/12 border border-[#B8E66C]/22 text-[#B8E66C]">
              <ShieldCheck className="w-3 h-3" aria-hidden="true" />
              Platform Admin
            </span>
          </div>
        )}

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative min-h-[42px] ${collapsed ? 'justify-center px-0' : 'px-3'} py-2 rounded-[13px] flex items-center gap-2.5 text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-[#B8E66C] bg-[#B8E66C]/10 border border-[#B8E66C]/20'
                      : 'text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.055] border border-transparent'
                  }`
                }
              >
                <Icon className="w-[17px] h-[17px] shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/[0.07] shrink-0 flex flex-col gap-2">
          {!collapsed && (
            <p className="text-[11px] text-[#7C8393] truncate px-1">{firebaseUser?.email}</p>
          )}
          <button
            type="button"
            onClick={() => void signOutGoogle().then(() => navigate('/auth'))}
            title="Sign out"
            className={`min-h-[38px] ${collapsed ? 'justify-center px-0' : 'px-3'} py-2 rounded-[12px] flex items-center gap-2.5 text-[13px] font-medium text-[#A2A8B5] hover:text-[#FF6B70] hover:bg-[#FF6B70]/10 transition-colors cursor-pointer border border-transparent`}
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!collapsed && 'Sign out'}
          </button>
          {!collapsed && (
            <Link
              to={activeUser.role === 'trainer' ? '/studio/overview' : '/app/home'}
              className="min-h-[38px] px-3 py-2 rounded-[12px] flex items-center gap-2.5 text-[13px] font-medium text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.055] transition-colors border border-transparent"
            >
              Workspace
            </Link>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <main className={`${contentOffset} transition-all duration-200 min-h-screen`}>
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
