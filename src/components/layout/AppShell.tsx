import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
  ClipboardList,
  Compass,
  Dumbbell,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Plus,
  Settings,
  Sparkles,
  Store,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassButton } from '../ui/GlassButton';
import { SkeletonBlock } from '../ui/FitnessIllustrations';
import { GlassSidebar, GlassTopHeader, type NavItem } from './GlassNavigation';
import { GlassTabBar } from './GlassTabBar';

interface AppShellProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  pageTitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  headerRight,
  pageTitle,
}) => {
  const { store, activeUser, isCloudSynced, setDemoSimulationFlags } = useApp();
  const location = useLocation();

  const isTrainerRoute = location.pathname.startsWith('/studio');
  const unreadCount = store.notifications.filter(
    (n) => n.recipientUserId === activeUser.id && !n.read,
  ).length;

  const clientNav: NavItem[] = [
    { to: '/app/home', label: 'Today', icon: Home },
    { to: '/app/plan', label: 'Plan', icon: Dumbbell },
    { to: '/app/progress', label: 'Progress', icon: TrendingUp },
    { to: '/app/coach', label: 'Coach', icon: Compass },
    { to: '/app/profile', label: 'You', icon: User },
  ];

  const trainerDesktopNav: NavItem[] = [
    { to: '/studio/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/studio/clients', label: 'Clients', icon: Users },
    { to: '/studio/assign', label: 'Assign', icon: Plus },
    { to: '/studio/templates', label: 'Templates', icon: ClipboardList },
    { to: '/studio/ai-builder', label: 'AI Builder', icon: Sparkles },
    { to: '/studio/packages', label: 'Packages', icon: Package },
    { to: '/studio/consultations', label: 'Schedule', icon: Calendar },
    { to: '/studio/storefront', label: 'Storefront', icon: Store },
    { to: '/studio/settings', label: 'Settings', icon: Settings },
  ];

  const trainerMobileNav: NavItem[] = [
    { to: '/studio/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/studio/clients', label: 'Clients', icon: Users },
    { to: '/studio/assign', label: 'Assign', icon: Plus, accent: true },
    { to: '/studio/consultations', label: 'Schedule', icon: Calendar },
    { to: '/studio/settings', label: 'More', icon: MoreHorizontal },
  ];

  const navItems = isTrainerRoute ? trainerDesktopNav : clientNav;
  const mobileTabs = isTrainerRoute ? trainerMobileNav : clientNav;

  const workspaceLabel = isTrainerRoute
    ? isCloudSynced
      ? 'Trainer Studio'
      : 'Trainer demo'
    : isCloudSynced
      ? 'FitPlus Cloud'
      : 'Client demo';

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col lg:flex-row">
      <GlassSidebar
        isTrainerRoute={isTrainerRoute}
        navItems={navItems}
        activeUserName={`${activeUser.firstName} ${activeUser.lastName}`}
        workspaceCaption={`${workspaceLabel} · ${activeUser.timezone}`}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isTrainerRoute ? 'lg:pl-[268px]' : 'lg:pl-[248px]'
        }`}
      >
        <GlassTopHeader
          isTrainerRoute={isTrainerRoute}
          unreadCount={unreadCount}
          pageTitle={pageTitle}
          headerRight={headerRight}
        />

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12">
          {store.session.simulateError ? (
            <div
              role="alert"
              className="surface-card rounded-[22px] border-[#FF6B70]/45 p-6 flex flex-col items-start gap-3"
            >
              <h2 className="text-[18px] font-semibold text-[#F5F5F7]">
                Something didn't load. Please try again.
              </h2>
              <p className="text-[14px] text-[#A2A8B5]">
                Simulated error state enabled in Demo settings.
              </p>
              <GlassButton
                size="sm"
                onClick={() => setDemoSimulationFlags({ simulateError: false })}
              >
                Try again
              </GlassButton>
            </div>
          ) : store.session.simulateLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Getting things ready">
              <p className="text-[14px] text-[#A2A8B5]">Getting things ready…</p>
              <SkeletonBlock className="h-48 rounded-[24px]" />
              <div className="grid sm:grid-cols-2 gap-4">
                <SkeletonBlock className="h-24 rounded-[20px]" />
                <SkeletonBlock className="h-24 rounded-[20px]" />
              </div>
              <SkeletonBlock className="h-16 rounded-[18px]" />
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setDemoSimulationFlags({ simulateLoading: false })}
              >
                Exit simulated loading
              </GlassButton>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <GlassTabBar items={mobileTabs} />
    </div>
  );
};
