import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import type { UserRole } from './types/domain';
import { ToastContainer } from './components/ui/ToastContainer';
import { GlassButton } from './components/ui/GlassButton';
import { BrandMark } from './components/ui/BrandMark';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { WelcomePage } from './pages/public/WelcomePage';
import { AuthPage } from './pages/public/AuthPage';
import { InvitePage } from './pages/public/InvitePage';
import { DiscoverPage } from './pages/public/DiscoverPage';
import { TrainerPublicProfilePage } from './pages/public/TrainerPublicProfilePage';

// Onboarding pages
import { RoleSelectPage } from './pages/onboarding/RoleSelectPage';
import { ClientOnboardingPage } from './pages/onboarding/ClientOnboardingPage';
import { TrainerOnboardingPage } from './pages/onboarding/TrainerOnboardingPage';

// Client pages
import { TodayPage } from './pages/client/TodayPage';
import { TaskDetailPage } from './pages/client/TaskDetailPage';
import { PlanPage } from './pages/client/PlanPage';
import { ProgressPage } from './pages/client/ProgressPage';
import { CoachPage } from './pages/client/CoachPage';
import { ConsultationsPage } from './pages/client/ConsultationsPage';
import { ProfilePage } from './pages/client/ProfilePage';
import { SettingsPage } from './pages/client/SettingsPage';
import { NotificationsPage } from './pages/client/NotificationsPage';

// Trainer Studio pages
import { StudioOverviewPage } from './pages/trainer/StudioOverviewPage';
import { StudioClientsPage } from './pages/trainer/StudioClientsPage';
import { StudioClientDetailPage } from './pages/trainer/StudioClientDetailPage';
import { StudioAssignPage } from './pages/trainer/StudioAssignPage';
import { StudioTemplatesPage } from './pages/trainer/StudioTemplatesPage';
import { StudioAIBuilderPage } from './pages/trainer/StudioAIBuilderPage';
import { StudioPackagesPage } from './pages/trainer/StudioPackagesPage';
import { StudioConsultationsPage } from './pages/trainer/StudioConsultationsPage';
import { StudioStorefrontPage } from './pages/trainer/StudioStorefrontPage';
import { StudioSettingsPage } from './pages/trainer/StudioSettingsPage';
import { StudioNotificationsPage } from './pages/trainer/StudioNotificationsPage';

/**
 * STAGE 1 DEMO ROUTE GUARD ONLY.
 * IMPORTANT: This client-side guard separates client and trainer demo views in Stage 1
 * and is NOT real authentication or authorization. Real server-side auth, tenant isolation,
 * and RBAC enforcement belong in Stage 2.
 */
const DemoRoleGuard: React.FC<{
  requiredRole: UserRole;
  children: React.ReactNode;
}> = ({ requiredRole, children }) => {
  const { store, startDemoAsRole } = useApp();
  const navigate = useNavigate();

  if (!store.session.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (store.session.activeRole !== requiredRole) {
    return (
      <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[24px] surface-card p-6 sm:p-7 text-center space-y-4">
          <div className="flex justify-center">
            <BrandMark />
          </div>
          <h1 className="text-[22px] font-semibold">
            {requiredRole === 'trainer' ? 'Trainer Studio demo route' : 'Client App demo route'}
          </h1>
          <p className="text-[14px] text-[#A2A8B5]">
            You are currently previewing the{' '}
            <span className="text-[#F5F5F7] font-medium">{store.session.activeRole}</span> demo.
            Switch your demo preview role below to enter this workspace.
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <GlassButton
              fullWidth
              onClick={() => {
                startDemoAsRole(requiredRole);
                navigate(requiredRole === 'trainer' ? '/studio/overview' : '/app/home');
              }}
            >
              Switch to {requiredRole === 'trainer' ? 'Trainer Studio' : 'Client'} demo
            </GlassButton>
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() =>
                navigate(store.session.activeRole === 'trainer' ? '/studio/overview' : '/app/home')
              }
            >
              Return to {store.session.activeRole} workspace
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center gap-4">
    <BrandMark />
    <h1 className="text-[28px] font-semibold">Page not found</h1>
    <p className="text-[14px] text-[#A2A8B5] max-w-md">
      The FitPlus demo route you requested does not exist.
    </p>
    <div className="flex flex-wrap gap-3">
      <Link
        to="/"
        className="min-h-[44px] px-5 py-2 rounded-[14px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold inline-flex items-center hover:bg-[#FF9259] transition-colors"
      >
        Landing page
      </Link>
      <Link
        to="/app/home"
        className="min-h-[44px] px-5 py-2 rounded-[14px] glass-control text-[#F5F5F7] text-[14px] font-medium inline-flex items-center hover:border-white/20 transition-colors"
      >
        Client Today
      </Link>
    </div>
  </div>
);

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/join/:token" element={<InvitePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/trainers/:slug" element={<TrainerPublicProfilePage />} />

          {/* Onboarding Routes */}
          <Route path="/onboarding/role" element={<RoleSelectPage />} />
          <Route path="/onboarding/client" element={<Navigate to="/onboarding/client/basics" replace />} />
          <Route path="/onboarding/client/:step" element={<ClientOnboardingPage />} />
          <Route path="/onboarding/trainer" element={<Navigate to="/onboarding/trainer/profile" replace />} />
          <Route path="/onboarding/trainer/:step" element={<TrainerOnboardingPage />} />
          <Route path="/onboarding/review" element={<Navigate to="/onboarding/client/review" replace />} />

          {/* Client Routes */}
          <Route path="/app" element={<Navigate to="/app/home" replace />} />
          <Route
            path="/app/home"
            element={
              <DemoRoleGuard requiredRole="client">
                <TodayPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/plan"
            element={
              <DemoRoleGuard requiredRole="client">
                <PlanPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/tasks/:id"
            element={
              <DemoRoleGuard requiredRole="client">
                <TaskDetailPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/progress"
            element={
              <DemoRoleGuard requiredRole="client">
                <ProgressPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/coach"
            element={
              <DemoRoleGuard requiredRole="client">
                <CoachPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/consultations"
            element={
              <DemoRoleGuard requiredRole="client">
                <ConsultationsPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/profile"
            element={
              <DemoRoleGuard requiredRole="client">
                <ProfilePage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/settings"
            element={
              <DemoRoleGuard requiredRole="client">
                <SettingsPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/app/notifications"
            element={
              <DemoRoleGuard requiredRole="client">
                <NotificationsPage />
              </DemoRoleGuard>
            }
          />

          {/* Trainer Studio Routes */}
          <Route path="/studio" element={<Navigate to="/studio/overview" replace />} />
          <Route
            path="/studio/overview"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioOverviewPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/clients"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioClientsPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/clients/:id"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioClientDetailPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/assign"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioAssignPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/templates"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioTemplatesPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/ai-builder"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioAIBuilderPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/packages"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioPackagesPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/consultations"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioConsultationsPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/storefront"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioStorefrontPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/settings"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioSettingsPage />
              </DemoRoleGuard>
            }
          />
          <Route
            path="/studio/notifications"
            element={
              <DemoRoleGuard requiredRole="trainer">
                <StudioNotificationsPage />
              </DemoRoleGuard>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  </MotionConfig>
  );
}
