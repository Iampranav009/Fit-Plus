import React, { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import type { UserRole } from './types/domain';
import { ToastContainer } from './components/ui/ToastContainer';
import { GlassButton } from './components/ui/GlassButton';
import { BrandMark } from './components/ui/BrandMark';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { useDocumentTitle } from './hooks/useDocumentTitle';

const MarketingLayout = React.lazy(() =>
  import('./components/marketing/MarketingLayout').then((m) => ({ default: m.MarketingLayout })),
);

// Public pages
const LandingPage = React.lazy(() => import('./pages/public/LandingPage').then((m) => ({ default: m.LandingPage })));
const WelcomePage = React.lazy(() => import('./pages/public/WelcomePage').then((m) => ({ default: m.WelcomePage })));
const AuthPage = React.lazy(() => import('./pages/public/AuthPage').then((m) => ({ default: m.AuthPage })));
const InvitePage = React.lazy(() => import('./pages/public/InvitePage').then((m) => ({ default: m.InvitePage })));
const DiscoverPage = React.lazy(() => import('./pages/public/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const TrainerPublicProfilePage = React.lazy(() => import('./pages/public/TrainerPublicProfilePage').then((m) => ({ default: m.TrainerPublicProfilePage })));
const PaymentResultPage = React.lazy(() => import('./pages/public/PaymentResultPage').then((m) => ({ default: m.PaymentResultPage })));
const LegalPage = React.lazy(() => import('./pages/public/LegalPage').then((m) => ({ default: m.LegalPage })));
const TrainerAuthPage = React.lazy(() => import('./pages/public/TrainerAuthPage').then((m) => ({ default: m.TrainerAuthPage })));

// Onboarding pages
const RoleSelectPage = React.lazy(() => import('./pages/onboarding/RoleSelectPage').then((m) => ({ default: m.RoleSelectPage })));
const ClientOnboardingPage = React.lazy(() => import('./pages/onboarding/ClientOnboardingPage').then((m) => ({ default: m.ClientOnboardingPage })));
const TrainerOnboardingPage = React.lazy(() => import('./pages/onboarding/TrainerOnboardingPage').then((m) => ({ default: m.TrainerOnboardingPage })));

// Client pages
const TodayPage = React.lazy(() => import('./pages/client/TodayPage').then((m) => ({ default: m.TodayPage })));
const LiveWorkoutPage = React.lazy(() => import('./pages/client/LiveWorkoutPage').then((m) => ({ default: m.LiveWorkoutPage })));
const ExerciseLibraryPage = React.lazy(() => import('./pages/client/ExerciseLibraryPage').then((m) => ({ default: m.ExerciseLibraryPage })));
const ExerciseDetailPage = React.lazy(() => import('./pages/client/ExerciseDetailPage').then((m) => ({ default: m.ExerciseDetailPage })));
const NutritionDiaryPage = React.lazy(() => import('./pages/client/NutritionDiaryPage').then((m) => ({ default: m.NutritionDiaryPage })));
const WeeklyCheckInPage = React.lazy(() => import('./pages/client/WeeklyCheckInPage').then((m) => ({ default: m.WeeklyCheckInPage })));
const WrappedPage = React.lazy(() => import('./pages/client/WrappedPage').then((m) => ({ default: m.WrappedPage })));
const TaskDetailPage = React.lazy(() => import('./pages/client/TaskDetailPage').then((m) => ({ default: m.TaskDetailPage })));
const PlanPage = React.lazy(() => import('./pages/client/PlanPage').then((m) => ({ default: m.PlanPage })));
const ProgressPage = React.lazy(() => import('./pages/client/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const CoachPage = React.lazy(() => import('./pages/client/CoachPage').then((m) => ({ default: m.CoachPage })));
const ConsultationsPage = React.lazy(() => import('./pages/client/ConsultationsPage').then((m) => ({ default: m.ConsultationsPage })));
const ProfilePage = React.lazy(() => import('./pages/client/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = React.lazy(() => import('./pages/client/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = React.lazy(() => import('./pages/client/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ClientPaymentsPage = React.lazy(() => import('./pages/client/ClientPaymentsPage').then((m) => ({ default: m.ClientPaymentsPage })));

// Shared pages
const MessagesPage = React.lazy(() => import('./pages/shared/MessagesPage').then((m) => ({ default: m.MessagesPage })));

// Trainer Studio pages
const StudioOverviewPage = React.lazy(() => import('./pages/trainer/StudioOverviewPage').then((m) => ({ default: m.StudioOverviewPage })));
const StudioClientsPage = React.lazy(() => import('./pages/trainer/StudioClientsPage').then((m) => ({ default: m.StudioClientsPage })));
const StudioClientDetailPage = React.lazy(() => import('./pages/trainer/StudioClientDetailPage').then((m) => ({ default: m.StudioClientDetailPage })));
const StudioAssignPage = React.lazy(() => import('./pages/trainer/StudioAssignPage').then((m) => ({ default: m.StudioAssignPage })));
const StudioTemplatesPage = React.lazy(() => import('./pages/trainer/StudioTemplatesPage').then((m) => ({ default: m.StudioTemplatesPage })));
const StudioWorkoutBuilderPage = React.lazy(() => import('./pages/trainer/StudioWorkoutBuilderPage').then((m) => ({ default: m.StudioWorkoutBuilderPage })));
const StudioNutritionBuilderPage = React.lazy(() => import('./pages/trainer/StudioNutritionBuilderPage').then((m) => ({ default: m.StudioNutritionBuilderPage })));
const StudioAIBuilderPage = React.lazy(() => import('./pages/trainer/StudioAIBuilderPage').then((m) => ({ default: m.StudioAIBuilderPage })));
const StudioPackagesPage = React.lazy(() => import('./pages/trainer/StudioPackagesPage').then((m) => ({ default: m.StudioPackagesPage })));
const StudioEarningsPage = React.lazy(() => import('./pages/trainer/StudioEarningsPage').then((m) => ({ default: m.StudioEarningsPage })));
const StudioConsultationsPage = React.lazy(() => import('./pages/trainer/StudioConsultationsPage').then((m) => ({ default: m.StudioConsultationsPage })));
const StudioStorefrontPage = React.lazy(() => import('./pages/trainer/StudioStorefrontPage').then((m) => ({ default: m.StudioStorefrontPage })));
const StudioSettingsPage = React.lazy(() => import('./pages/trainer/StudioSettingsPage').then((m) => ({ default: m.StudioSettingsPage })));
const StudioNotificationsPage = React.lazy(() => import('./pages/trainer/StudioNotificationsPage').then((m) => ({ default: m.StudioNotificationsPage })));

// Admin pages
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminOverviewPage = React.lazy(() => import('./pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })));
const AdminTrainersPage = React.lazy(() => import('./pages/admin/AdminTrainersPage').then((m) => ({ default: m.AdminTrainersPage })));
const AdminClientsPage = React.lazy(() => import('./pages/admin/AdminClientsPage').then((m) => ({ default: m.AdminClientsPage })));
const AdminVerificationsPage = React.lazy(() => import('./pages/admin/AdminVerificationsPage').then((m) => ({ default: m.AdminVerificationsPage })));
const AdminReviewsPage = React.lazy(() => import('./pages/admin/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage })));
const AdminAuditPage = React.lazy(() => import('./pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-[#FF803E]/30 border-t-[#FF803E] animate-spin" />
    <span className="text-xs text-white/50 font-medium">Preparing view…</span>
  </div>
);

const AuthLoadingSplash: React.FC = () => (
  <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6 gap-4">
    <BrandMark />
    <p className="text-[14px] text-[#A2A8B5]">Preparing your FitPlus workspace…</p>
  </div>
);

const AccountLoadErrorScreen: React.FC<{ message: string }> = ({ message }) => {
  const { signOutGoogle } = useApp();
  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full rounded-[24px] surface-card p-6 sm:p-7 text-center space-y-4">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-[22px] font-semibold">We could not load your account</h1>
        <p role="alert" className="text-[14px] text-[#FF6B70]">{message}</p>
        <div className="flex flex-col gap-2.5 pt-2">
          <GlassButton fullWidth onClick={() => window.location.reload()}>
            Try again
          </GlassButton>
          <GlassButton variant="secondary" fullWidth onClick={() => void signOutGoogle()}>
            Sign out
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

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
    accountLoadError,
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
  const isTrainerRoute = allowedRoles.length === 1 && allowedRoles[0] === 'trainer';
  const authTarget = isTrainerRoute ? '/trainer/login' : '/auth';

  if (!firebaseUser && !isDemoSandbox) {
    return <Navigate to={`${authTarget}?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  if (firebaseUser && !isCloudSynced && !isDemoSandbox) {
    return <AccountLoadErrorScreen message={accountLoadError || 'Your workspace did not load.'} />;
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
  const { store, isAuthReady, firebaseUser, accountLoadError, isCloudSynced, isDemoSandbox } = useApp();
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

  if (firebaseUser && !isCloudSynced && !isDemoSandbox) {
    return <AccountLoadErrorScreen message={accountLoadError || 'Your workspace did not load.'} />;
  }

  if (isCloudSynced && store.session.onboardingCompleted) {
    return (
      <Navigate
        to={store.session.activeRole === 'trainer' ? '/studio/overview' : '/app/home'}
        replace
      />
    );
  }

  return <>{children}</>;
};

/**
 * /demo            → sample client workspace (Demo Client)
 * /demo?role=coach → sample Trainer Studio (Demo Trainer)
 * Both reuse the same sandbox entry points as the demo buttons on /auth.
 */
const DemoEntryPage: React.FC = () => {
  useDocumentTitle('FitPlus | Demo');
  const { startDemoAsRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get('role');
  const isCoach = role === 'coach' || role === 'trainer';

  useEffect(() => {
    if (isCoach) {
      startDemoAsRole('trainer', 'usr_demo_trainer');
      navigate('/studio/overview', { replace: true });
    } else {
      startDemoAsRole('client', 'usr_demo_client');
      navigate('/app/home', { replace: true });
    }
  }, [startDemoAsRole, navigate, isCoach]);

  return <AuthLoadingSplash />;
};

const NotFoundPage: React.FC = () => {
  useDocumentTitle('FitPlus | Page Not Found');
  return (
    <MarketingLayout>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center gap-4">
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
    </MarketingLayout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <BrowserRouter>
            <OfflineIndicator />
            <React.Suspense fallback={<RouteLoadingFallback />}>
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
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/refund-policy" element={<LegalPage />} />
            <Route path="/disclaimer" element={<LegalPage />} />
            <Route path="/trainer/login" element={<TrainerAuthPage />} />

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
              path="/app/workout"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <LiveWorkoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/workout/:dayIndex"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <LiveWorkoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/exercises"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ExerciseLibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/exercises/:exerciseId"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ExerciseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/nutrition"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <NutritionDiaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/check-in"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <WeeklyCheckInPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/wrapped"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <WrappedPage />
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
            <Route
              path="/app/messages"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <MessagesPage />
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
              path="/studio/messages"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/workout-builder"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioWorkoutBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/nutrition-builder"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioNutritionBuilderPage />
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
              path="/studio/exercises"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <ExerciseLibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio/exercises/:exerciseId"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <ExerciseDetailPage />
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
              path="/studio/earnings"
              element={
                <ProtectedRoute allowedRoles={['trainer']}>
                  <StudioEarningsPage />
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

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'client', 'trainer']} requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="trainers" element={<AdminTrainersPage />} />
              <Route path="clients" element={<AdminClientsPage />} />
              <Route path="verifications" element={<AdminVerificationsPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </React.Suspense>
        <ToastContainer />
        </BrowserRouter>
      </AppProvider>
    </MotionConfig>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
