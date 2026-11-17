import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField } from '../../components/ui/InputField';

type EmailAuthMode = 'signin' | 'signup' | 'reset';

function getSafeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/auth')) {
    return raw;
  }
  return null;
}

export const AuthPage: React.FC = () => {
  const {
    store,
    firebaseUser,
    isAuthReady,
    isEmailVerified,
    isPlatformAdmin,
    isCloudSynced,
    authBusy,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resendVerificationEmail,
    refreshVerificationState,
    sendPasswordReset,
    signOutGoogle,
    startDemoAsRole,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = useMemo(() => getSafeRedirect(searchParams.get('redirect')), [searchParams]);

  // Auto-redirect if already authenticated and onboarded
  useEffect(() => {
    if (!isAuthReady || !isCloudSynced || !store.session.onboardingCompleted) return;
    const dest =
      redirectTarget ??
      (isPlatformAdmin ? '/admin' : store.session.activeRole === 'trainer' ? '/studio/overview' : '/app/home');
    navigate(dest, { replace: true });
  }, [isAuthReady, isCloudSynced, store.session.onboardingCompleted]);

  const [emailMode, setEmailMode] = useState<EmailAuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const navigateAfterAuth = (params: {
    onboardingCompleted?: boolean;
    role?: string;
    isAdmin?: boolean;
  }) => {
    if (redirectTarget) {
      if (params.onboardingCompleted || redirectTarget.startsWith('/join/')) {
        navigate(redirectTarget, { replace: true });
        return;
      }
    }
    if (store.session.pendingInviteToken && params.onboardingCompleted) {
      navigate(`/join/${store.session.pendingInviteToken}`, { replace: true });
      return;
    }
    if (!params.onboardingCompleted) {
      navigate('/onboarding/role', { replace: true });
      return;
    }
    if (params.isAdmin || params.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    navigate(params.role === 'trainer' ? '/studio/overview' : '/app/home', { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setFormError('');
    const res = await signInWithGoogle();
    if (!res.ok) {
      if (res.error) setFormError(res.error);
      return;
    }
    if (res.emailVerified === false) return;
    navigateAfterAuth({
      onboardingCompleted: res.onboardingCompleted,
      role: res.role,
      isAdmin: res.isPlatformAdmin,
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setResetSent(false);

    if (!email.trim() || !email.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }

    if (emailMode === 'reset') {
      const res = await sendPasswordReset(email);
      if (res.ok) {
        setResetSent(true);
      } else {
        setFormError(res.error || 'Could not send reset email.');
      }
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    if (emailMode === 'signup') {
      if (!fullName.trim()) {
        setFormError('Enter your full name to create your account.');
        return;
      }
      if (!consentAccepted) {
        setFormError('Please confirm you are 18+ and accept FitPlus Terms & Privacy Policy.');
        return;
      }
      const res = await signUpWithEmail({ email, password, fullName });
      if (!res.ok && res.error) {
        setFormError(res.error);
      }
      return;
    }

    const res = await signInWithEmail(email, password);
    if (!res.ok) {
      setFormError(res.error || 'Invalid email or password.');
      return;
    }
    if (res.emailVerified) {
      navigateAfterAuth({
        onboardingCompleted: res.onboardingCompleted,
        role: res.role,
        isAdmin: res.isPlatformAdmin,
      });
    }
  };

  const handleCheckVerification = async () => {
    const res = await refreshVerificationState();
    if (res.ok && res.emailVerified) {
      navigateAfterAuth({
        onboardingCompleted: res.onboardingCompleted,
        role: res.role,
        isAdmin: res.isPlatformAdmin,
      });
    }
  };

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <header className="sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
        <div className="glass-nav max-w-[1280px] mx-auto h-14 rounded-[18px] px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" aria-label="FitPlus home">
            <BrandMark />
          </Link>
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[28px] glass-overlay p-6 sm:p-8 flex flex-col gap-6">
          {firebaseUser && !isEmailVerified ? (
            <>
              <div>
                <p className="text-[12px] font-medium text-[#FFB06B] inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Email verification required
                </p>
                <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                  Verify your inbox to continue
                </h1>
                <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                  We sent a verification link to{' '}
                  <span className="text-[#F5F5F7] font-medium">{firebaseUser.email}</span>. Click
                  the link in that email, then tap below to unlock your FitPlus workspace.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <GlassButton
                  fullWidth
                  disabled={authBusy}
                  onClick={() => void handleCheckVerification()}
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  {authBusy ? 'Checking status…' : "I've verified — continue"}
                </GlassButton>
                <GlassButton
                  variant="glass"
                  fullWidth
                  disabled={authBusy}
                  onClick={() => void resendVerificationEmail()}
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  Resend verification email
                </GlassButton>
                <GlassButton
                  variant="tertiary"
                  fullWidth
                  disabled={authBusy}
                  onClick={() => void signOutGoogle()}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign out
                </GlassButton>
              </div>
            </>
          ) : firebaseUser && isEmailVerified ? (
            <>
              <div>
                <p className="text-[12px] font-medium text-[#B8E66C] inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  Verified FitPlus account
                </p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                  Welcome back
                </h1>
                <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                  Signed in as{' '}
                  <span className="text-[#F5F5F7] font-medium">
                    {firebaseUser.email || firebaseUser.displayName}
                  </span>
                  . Your workouts, plans, and coaching records sync securely to Firestore.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <GlassButton
                  fullWidth
                  onClick={() =>
                    navigateAfterAuth({
                      onboardingCompleted: store.session.onboardingCompleted,
                      role: store.session.activeRole,
                      isAdmin: isPlatformAdmin,
                    })
                  }
                >
                  {store.session.onboardingCompleted && isCloudSynced
                    ? `Continue to ${
                        isPlatformAdmin
                          ? 'Admin Console'
                          : store.session.activeRole === 'trainer'
                            ? 'Trainer Studio'
                            : 'FitPlus'
                      }`
                    : 'Complete onboarding'}
                </GlassButton>
                {isPlatformAdmin ? (
                  <GlassButton variant="secondary" fullWidth onClick={() => navigate('/admin')}>
                    Open Admin Moderation Console
                  </GlassButton>
                ) : null}
                <GlassButton
                  variant="glass"
                  fullWidth
                  disabled={authBusy}
                  onClick={() => void signOutGoogle()}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign out
                </GlassButton>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[12px] font-medium text-[#FFB06B]">
                  {store.session.pendingInviteToken
                    ? `Invitation ${store.session.pendingInviteToken} ready`
                    : 'Personal coaching account'}
                </p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                  {COPY.public.authTitle}
                </h1>
                <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                  Sign in with Google or email & password to sync your coaching workspace across devices.
                </p>
              </div>

              <GlassButton
                variant="primary"
                fullWidth
                disabled={authBusy}
                onClick={() => void handleGoogleSignIn()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#101218"
                    d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-1 2.3-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.3z"
                  />
                  <path
                    fill="#101218"
                    d="M12 22c2.7 0 5-.9 6.7-2.5l-3.2-2.5c-.9.6-2.1 1-3.5 1-2.7 0-4.9-1.8-5.7-4.2H3v2.6C4.7 19.8 8.1 22 12 22z"
                  />
                  <path
                    fill="#101218"
                    d="M6.3 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3C2.4 8.9 2 10.4 2 12s.4 3.1 1 4.4l3.3-2.6z"
                  />
                  <path
                    fill="#101218"
                    d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3 7.6l3.3 2.6C7.1 7.8 9.3 6 12 6z"
                  />
                </svg>
                {authBusy ? 'Connecting…' : COPY.public.continueGoogle}
              </GlassButton>

              <div className="flex items-center gap-3 text-[12px] text-[#7C8393]">
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span>or with email</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <div
                role="tablist"
                aria-label="Email authentication mode"
                className="grid grid-cols-2 p-1 gap-0.5 rounded-[14px] glass-control"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={emailMode === 'signin' || emailMode === 'reset'}
                  onClick={() => {
                    setEmailMode('signin');
                    setFormError('');
                    setResetSent(false);
                  }}
                  className={`min-h-[40px] rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer ${
                    emailMode === 'signin' || emailMode === 'reset'
                      ? 'surface-elevated text-[#F5F5F7] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : 'text-[#7C8393] hover:text-[#A2A8B5]'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={emailMode === 'signup'}
                  onClick={() => {
                    setEmailMode('signup');
                    setFormError('');
                    setResetSent(false);
                  }}
                  className={`min-h-[40px] rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer ${
                    emailMode === 'signup'
                      ? 'surface-elevated text-[#F5F5F7] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : 'text-[#7C8393] hover:text-[#A2A8B5]'
                  }`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex flex-col gap-3.5">
                {emailMode === 'signup' ? (
                  <InputField
                    label="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Rohan Kulkarni"
                    autoComplete="name"
                  />
                ) : null}

                <InputField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />

                {emailMode !== 'reset' ? (
                  <InputField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={emailMode === 'signup' ? 'Minimum 8 characters' : 'Enter your password'}
                    autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                  />
                ) : null}

                {emailMode === 'signup' ? (
                  <label className="flex items-start gap-2.5 rounded-[14px] glass-control p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#FF803E]"
                    />
                    <span className="text-[12px] text-[#A2A8B5] leading-relaxed">
                      I confirm I am 18+ and agree to FitPlus Terms of Use & Privacy Policy.
                    </span>
                  </label>
                ) : null}

                {formError ? (
                  <p role="alert" className="text-[13px] text-[#FF6B70]">
                    {formError}
                  </p>
                ) : null}

                {resetSent ? (
                  <p role="status" className="text-[13px] text-[#B8E66C]">
                    Password reset link sent to {email}. Check your inbox.
                  </p>
                ) : null}

                <GlassButton type="submit" variant="glass" fullWidth disabled={authBusy}>
                  {emailMode === 'reset' ? (
                    <>
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                      {authBusy ? 'Sending…' : 'Send password reset link'}
                    </>
                  ) : emailMode === 'signup' ? (
                    authBusy ? 'Creating account…' : 'Create verified account'
                  ) : authBusy ? (
                    'Signing in…'
                  ) : (
                    'Sign in with email'
                  )}
                </GlassButton>

                {emailMode === 'signin' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('reset');
                      setFormError('');
                    }}
                    className="self-end text-[12px] text-[#FFB06B] hover:text-[#FF803E] cursor-pointer py-1"
                  >
                    Forgot password?
                  </button>
                ) : emailMode === 'reset' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode('signin');
                      setFormError('');
                      setResetSent(false);
                    }}
                    className="self-end text-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] cursor-pointer py-1"
                  >
                    Back to password sign-in
                  </button>
                ) : null}
              </form>

              <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2.5">
                <p className="text-[13px] font-medium text-[#F5F5F7]">
                  Interactive Demo Sandbox (offline sample data)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      startDemoAsRole('client', 'usr_demo_client');
                      navigate('/app/home');
                    }}
                  >
                    Demo: Client
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      startDemoAsRole('trainer', 'usr_demo_trainer');
                      navigate('/studio/overview');
                    }}
                  >
                    Demo: Coach
                  </GlassButton>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
