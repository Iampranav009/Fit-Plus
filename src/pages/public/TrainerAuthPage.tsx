import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField } from '../../components/ui/InputField';

type EmailAuthMode = 'signin' | 'signup' | 'reset';

export const TrainerAuthPage: React.FC = () => {
  const {
    store,
    firebaseUser,
    isAuthReady,
    isPlatformAdmin,
    isCloudSynced,
    accountLoadError,
    authBusy,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    sendPasswordReset,
    signOutGoogle,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const isAdminInvite = searchParams.get('invite') === 'admin';

  const [emailMode, setEmailMode] = useState<EmailAuthMode>(isAdminInvite ? 'signup' : 'signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const navigateAfterAuth = (params: { onboardingCompleted?: boolean; role?: string; isAdmin?: boolean }) => {
    if (!params.onboardingCompleted) {
      navigate('/onboarding/role?role=trainer', { replace: true });
      return;
    }
    if (params.role === 'trainer' || params.isAdmin) {
      navigate(redirectTarget || '/studio/overview', { replace: true });
    } else if (isAdminInvite) {
      navigate('/onboarding/role?role=trainer', { replace: true });
    } else {
      setFormError('This account is not registered as a trainer. Use the member login instead.');
    }
  };

  // Route as soon as the account is loaded, including on return from Google.
  useEffect(() => {
    if (!isAuthReady || !firebaseUser || !isCloudSynced) return;
    navigateAfterAuth({
      onboardingCompleted: store.session.onboardingCompleted,
      role: store.session.activeRole,
      isAdmin: isPlatformAdmin,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, firebaseUser, isCloudSynced, store.session.onboardingCompleted, store.session.activeRole, isPlatformAdmin]);

  const handleGoogleSignIn = async () => {
    setFormError('');
    const res = await signInWithGoogle();
    if (!res.ok && res.error) setFormError(res.error);
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
      if (res.ok) setResetSent(true);
      else setFormError(res.error || 'Could not send reset email.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    if (emailMode === 'signup' && !fullName.trim()) {
      setFormError('Enter your full name.');
      return;
    }

    const res =
      emailMode === 'signup'
        ? await signUpWithEmail({ email, password, fullName })
        : await signInWithEmail(email, password);
    if (!res.ok) {
      setFormError(res.error || 'Invalid email or password.');
      return;
    }
    navigateAfterAuth({ onboardingCompleted: res.onboardingCompleted, role: res.role, isAdmin: res.isPlatformAdmin });
  };

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <header className="sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
        <div className="glass-nav max-w-[1280px] mx-auto h-14 rounded-[18px] px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" aria-label="FitPlus home">
            <BrandMark />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[28px] glass-overlay p-6 sm:p-8 flex flex-col gap-6">
          {firebaseUser ? (
            <>
              <div>
                <p className="text-[12px] font-medium text-[#B8E66C] inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  Trainer Studio
                </p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                  {accountLoadError ? 'We could not load your account' : 'Welcome, Coach'}
                </h1>
                <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                  {accountLoadError ? (
                    <span role="alert" className="text-[#FF6B70]">{accountLoadError}</span>
                  ) : (
                    <>Signed in as <span className="text-[#F5F5F7] font-medium">{firebaseUser.email}</span>.</>
                  )}
                </p>
                {formError ? (
                  <p role="alert" className="mt-2 text-[13px] text-[#FF6B70]">{formError}</p>
                ) : null}
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
                  {store.session.onboardingCompleted && store.session.activeRole === 'trainer'
                    ? 'Continue to Trainer Studio'
                    : 'Complete trainer setup'}
                </GlassButton>
                <GlassButton variant="glass" fullWidth disabled={authBusy} onClick={() => void signOutGoogle()}>
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign out
                </GlassButton>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[12px] font-medium text-[#FFB06B]">Trainer Studio</p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                  {emailMode === 'signup' ? 'Create your coach account' : 'Coach sign in'}
                </h1>
                <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                  {isAdminInvite
                    ? 'You were invited to FitPlus as a coach. Continue with Google or create an account with email.'
                    : 'Sign in to access your Trainer Studio. New coaches need an admin invitation to register.'}
                </p>
              </div>

              <GlassButton variant="primary" fullWidth disabled={authBusy} onClick={() => void handleGoogleSignIn()}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#101218" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-1 2.3-2 3v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.3z" />
                  <path fill="#101218" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.2-2.5c-.9.6-2.1 1-3.5 1-2.7 0-4.9-1.8-5.7-4.2H3v2.6C4.7 19.8 8.1 22 12 22z" />
                  <path fill="#101218" d="M6.3 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3C2.4 8.9 2 10.4 2 12s.4 3.1 1 4.4l3.3-2.6z" />
                  <path fill="#101218" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3 7.6l3.3 2.6C7.1 7.8 9.3 6 12 6z" />
                </svg>
                {authBusy ? 'Connecting…' : 'Continue with Google'}
              </GlassButton>

              <div className="flex items-center gap-3 text-[12px] text-[#7C8393]">
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span>or with email</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex flex-col gap-3.5">
                {emailMode === 'signup' ? (
                  <InputField
                    label="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Arjun Mehta"
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

                {formError ? (
                  <p role="alert" className="text-[13px] text-[#FF6B70]">{formError}</p>
                ) : null}

                {resetSent ? (
                  <p role="status" className="text-[13px] text-[#B8E66C]">
                    Password reset link sent to {email}.
                  </p>
                ) : null}

                <GlassButton type="submit" variant="glass" fullWidth disabled={authBusy}>
                  {emailMode === 'reset' ? (
                    <>
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                      {authBusy ? 'Sending…' : 'Send password reset link'}
                    </>
                  ) : emailMode === 'signup' ? (
                    authBusy ? 'Creating account…' : 'Create coach account'
                  ) : (
                    authBusy ? 'Signing in…' : 'Sign in with email'
                  )}
                </GlassButton>

                {emailMode === 'signup' ? (
                  <button
                    type="button"
                    onClick={() => { setEmailMode('signin'); setFormError(''); }}
                    className="self-end text-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] cursor-pointer py-1"
                  >
                    Already have an account? Sign in
                  </button>
                ) : emailMode === 'signin' ? (
                  <div className="flex justify-between">
                    {isAdminInvite ? (
                      <button
                        type="button"
                        onClick={() => { setEmailMode('signup'); setFormError(''); }}
                        className="text-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] cursor-pointer py-1"
                      >
                        Create an account
                      </button>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => { setEmailMode('reset'); setFormError(''); }}
                      className="text-[12px] text-[#FFB06B] hover:text-[#FF803E] cursor-pointer py-1"
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEmailMode('signin'); setFormError(''); setResetSent(false); }}
                    className="self-end text-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] cursor-pointer py-1"
                  >
                    Back to sign-in
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
