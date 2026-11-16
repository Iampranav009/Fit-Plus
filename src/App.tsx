import React, { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import type { UserRole } from './types/domain';
import { ToastContainer } from './components/ui/ToastContainer';
import { GlassButton } from './components/ui/GlassButton';
import { BrandMark } from './components/ui/BrandMark';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { OfflineIndicator } from './components/ui/OfflineIndicator';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { WelcomePage } from './pages/public/WelcomePage';
import { AuthPage } from './pages/public/AuthPage';
import { InvitePage } from './pages/public/InvitePage';
import { DiscoverPage } from './pages/public/DiscoverPage';
import { TrainerPublicProfilePage } from './pages/public/TrainerPublicProfilePage';
import { PaymentResultPage } from './pages/public/PaymentResultPage';

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
import { ClientPaymentsPage } from './pages/client/ClientPaymentsPage';

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

// Admin page
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

const AuthLoadingSplash: React.FC = () => (
  <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6 gap-4">
    <BrandMark />
    <p className="text-[14px] text-[#A2A8B5]">Preparing your FitPlus workspace…</p>
  </div>
);

const ProtectedRoute: React.FC<{
  allowedRoles: UserRole[];
  requireAdmin?: boolean;
  children: React.ReactNode;
}> = ({ allowedRoles, requireAdmin = false, children }) => {
  const {
    store,
    activeUser,
    isAuthReady,
    firebaseUser,
    isEmailVerified,
    isPlatformAdmin,
    isCloudSynced,
    isDemoSandbox,
    startDemoAsRole,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthReady) {
    return <AuthLoadingSplash />;
  }

  const redirectPath = `${location.pathname}${location.search}`;

  if (!firebaseUser && !isDemoSandbox) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  if (firebaseUser && !isEmailVerified && !isDemoSandbox) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  if (requireAdmin) {
    if (!isCloudSynced || !isPlatformAdmin) {
      return (
        <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full rounded-[24px] surface-card p-6 sm:p-7 text-center space-y-4">
            <div className="flex justify-center">
              <BrandMark />
            </div>
            <h1 className="text-[22px] font-semibold">Admin access required</h1>
            <p className="text-[14px] text-[#A2A8B5]">
              This moderation console is restricted to authorized FitPlus platform administrators.
            </p>
            <GlassButton
              fullWidth
              onClick={() =>
                navigate(activeUser.role === 'trainer' ? '/studio/overview' : '/app/home')
              }
            >
              Return to your workspace
            </GlassButton>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  if (isCloudSynced && !store.session.onboardingCompleted) {
    return <Navigate to="/onboarding/role" replace />;
  }

  const currentRole = isCloudSynced ? activeUser.role : store.session.activeRole;

  if (!allowedRoles.includes(currentRole)) {
    if (isCloudSynced) {
      return (
        <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full rounded-[24px] surface-card p-6 sm:p-7 text-center space-y-4">
            <div className="flex justify-center">
              <BrandMark />
            </div>
            <h1 className="text-[22px] font-semibold">
              {allowedRoles.includes('trainer') ? 'Trainer Studio access' : 'Client App access'}
            </h1>
            <p className="text-[14px] text-[#A2A8B5]">
              Your account is configured as a{' '}
              <span className="text-[#F5F5F7] font-medium">{currentRole}</span>. Return to your
              authorized FitPlus workspace.
            </p>
            <GlassButton
              fullWidth
              onClick={() =>
                navigate(currentRole === 'trainer' ? '/studio/overview' : '/app/home')
              }
            >
              Open {currentRole === 'trainer' ? 'Trainer Studio' : 'Client App'}
            </GlassButton>
          </div>
        </div>
      );
    }

    const demoTargetRole = allowedRoles[0] || 'client';
    return (
      <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[24px] surface-card p-6 sm:p-7 text-center space-y-4">
          <div className="flex justify-center">
            <BrandMark />
          </div>
          <h1 className="text-[22px] font-semibold">
            {demoTargetRole === 'trainer' ? 'Trainer Studio demo route' : 'Client App demo route'}
          </h1>
          <p className="text-[14px] text-[#A2A8B5]">
            You are currently previewing the{' '}
            <span className="text-[#F5F5F7] font-medium">{currentRole}</span> demo sandbox.
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <GlassButton
              fullWidth
              onClick={() => {
                startDemoAsRole(demoTargetRole);
                navigate(demoTargetRole === 'trainer' ? '/studio/overview' : '/app/home');
              }}
            >
              Switch to {demoTargetRole === 'trainer' ? 'Trainer Studio' : 'Client'} demo
            </GlassButton>
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() =>
                navigate(currentRole === 'trainer' ? '/studio/overview' : '/app/home')
              }
            >
              Return to {currentRole} workspace
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthReady, firebaseUser, isEmailVerified, isDemoSandbox } = useApp();
  const location = useLocation();

  if (!isAuthReady) {
    return <AuthLoadingSplash />;
  }

  if (!firebaseUser && !isDemoSandbox) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
        replace
      />
    );
  }

  if (firebaseUser && !isEmailVerified && !isDemoSandbox) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
        replace
      />
    );
  }

  return <>{children}</>;
};

const DemoEntryPage: React.FC = () => {
  const { startDemoAsRole } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    startDemoAsRole('client', 'usr_client_aarav');
    navigate('/app/home', { replace: true });
  }, [startDemoAsRole, navigate]);

  return <AuthLoadingSplash />;
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center gap-4">
    <BrandMark />
    <p className="text-[13px] font-semibold tracking-wider uppercase text-[#FF803E]">404</p>
    <h1 className="text-[30px] font-semibold tracking-[-0.02em]">Page not found</h1>
    <p className="text-[14px] text-[#A2A8B5] max-w-md">
      The FitPlus page you requested does not exist or may have moved.
    </p>
    <div className="flex flex-wrap justify-center gap-3 pt-1">
      <Link
        to="/"
        className="min-h-[44px] px-5 py-2 rounded-[14px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold inline-flex items-center hover:bg-[#FF9259] transition-colors"
      >
        Go to FitPlus home
      </Link>
      <Link
        to="/discover"
        className="min-h-[44px] px-5 py-2 rounded-[14px] glass-control text-[#F5F5F7] text-[14px] font-medium inline-flex items-center hover:border-white/20 transition-colors"
      >
        Browse coaches
      </Link>
      <Link
        to="/auth"
        className="min-h-[44px] px-5 py-2 rounded-[14px] glass-control text-[#F5F5F7] text-[14px] font-medium inline-flex items-center hover:border-white/20 transition-colors"
      >
        Sign in
      </Link>
    </div>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <BrowserRouter>
            <OfflineIndicator />
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/demo" element={<DemoEntryPage />} />
            <Route path="/join/:token" element={<InvitePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/trainers/:slug" element={<TrainerPublicProfilePage />} />
            <Route path="/payments/result" element={<PaymentResultPage />} />

            {/* Onboarding Routes */}
            <Route
              path="/onboarding/role"
              element={
                <OnboardingGuard>
                  <RoleSelectPage />
                </OnboardingGuard>
              }
            />
            <Route path="/onboarding/client" element={<Navigate to="/onboarding/client/basics" replace />} />
            <Route
              path="/onboarding/client/:step"
              element={
                <OnboardingGuard>
                  <ClientOnboardingPage />
                </OnboardingGuard>
              }
            />
            <Route path="/onboarding/trainer" element={<Navigate to="/onboarding/trainer/profile" replace />} />
            <Route
              path="/onboarding/trainer/:step"
              element={
                <OnboardingGuard>
                  <TrainerOnboardingPage />
                </OnboardingGuard>
              }
            />
            <Route path="/onboarding/review" element={<Navigate to="/onboarding/client/review" replace />} />

            {/* Client Routes */}
            <Route path="/app" element={<Navigate to="/app/home" replace />} />
            <Route
              path="/app/home"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <TodayPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/plan"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <PlanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/tasks/:id"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <TaskDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/progress"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ProgressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/coach"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <CoachPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/consultations"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ConsultationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/profile"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/notifications"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/payments"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientPaymentsPage />
                </ProtectedRoute>
              }
            />

            {/* Trainer Studio Routes */}
            <Route path="/studio" element={<Navigate to="/studio/overview" replace />} />
            <Route
              path="/studio/overview"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/clients"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioClientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/clients/:id"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioClientDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/assign"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioAssignPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/templates"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioTemplatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/ai-builder"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioAIBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/packages"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioPackagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/consultations"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioConsultationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/storefront"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioStorefrontPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/settings"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/notifications"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioNotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'client', 'trainer']} requireAdmin>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </AppProvider>
    </MotionConfig>
    </ErrorBoundary>
  );
}
