import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Mail } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField } from '../../components/ui/InputField';

export const AuthPage: React.FC = () => {
  const {
    store,
    firebaseUser,
    isCloudSynced,
    authBusy,
    signInWithGoogle,
    signOutGoogle,
    startDemoAsRole,
    pushToast,
  } = useApp();
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [sampleEmail, setSampleEmail] = useState('sample.user@demo.fitplus.in');
  const [emailError, setEmailError] = useState('');

  const handleGoogleSignIn = async () => {
    const res = await signInWithGoogle();
    if (!res.ok) return;
    if (res.onboardingCompleted) {
      navigate(res.role === 'trainer' ? '/studio/overview' : '/app/home');
    } else {
      navigate('/onboarding/role');
    }
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleEmail.trim() || !sampleEmail.includes('@')) {
      setEmailError('Enter a sample email format to continue.');
      return;
    }
    setEmailError('');
    pushToast('Offline demo email step complete (no real account created).', 'info');
    navigate('/onboarding/role');
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
        <div className="w-full max-w-md rounded-[28px] surface-card p-6 sm:p-8 flex flex-col gap-6">
          <div>
            <p className="text-[12px] font-medium text-[#FFB06B]">
              {firebaseUser ? 'Google account connected' : 'Sign in or preview FitPlus'}
            </p>
            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
              {COPY.public.authTitle}
            </h1>
            <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
              {firebaseUser
                ? `Signed in as ${firebaseUser.email || firebaseUser.displayName || 'Google user'}. Your workouts, plans, and bookings sync to Firestore.`
                : 'Sign in with Google to save your profile and coaching data in Firestore, or explore offline demo personas below.'}
            </p>
          </div>

          {firebaseUser ? (
            <div className="flex flex-col gap-3">
              <GlassButton
                fullWidth
                onClick={() => {
                  if (!store.session.onboardingCompleted) {
                    navigate('/onboarding/role');
                  } else {
                    navigate(
                      store.session.activeRole === 'trainer' ? '/studio/overview' : '/app/home',
                    );
                  }
                }}
              >
                {store.session.onboardingCompleted && isCloudSynced
                  ? `Continue to ${store.session.activeRole === 'trainer' ? 'Trainer Studio' : 'FitPlus'}`
                  : 'Complete onboarding'}
              </GlassButton>
              <GlassButton
                variant="glass"
                fullWidth
                disabled={authBusy}
                onClick={() => void signOutGoogle()}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Sign out of Google
              </GlassButton>
            </div>
          ) : !showEmailForm ? (
            <div className="flex flex-col gap-3">
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
                {authBusy ? 'Signing in…' : COPY.public.continueGoogle}
              </GlassButton>

              <GlassButton
                variant="glass"
                fullWidth
                onClick={() => setShowEmailForm(true)}
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                {COPY.public.continueEmail} (offline demo)
              </GlassButton>
            </div>
          ) : (
            <form onSubmit={handleEmailContinue} className="flex flex-col gap-4">
              <InputField
                label="Sample email address"
                type="email"
                value={sampleEmail}
                onChange={(e) => setSampleEmail(e.target.value)}
                error={emailError}
                helper="Offline demo only — no password required and no account created."
              />
              <div className="flex gap-2.5">
                <GlassButton type="button" variant="secondary" onClick={() => setShowEmailForm(false)}>
                  Back
                </GlassButton>
                <GlassButton type="submit" fullWidth>
                  Continue (demo)
                </GlassButton>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2.5">
            <p className="text-[13px] font-medium text-[#F5F5F7]">
              {COPY.public.exploreDemo}
            </p>
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() => {
                startDemoAsRole('client', 'usr_client_aarav');
                navigate('/app/home');
              }}
            >
              Quick preview: Client (Aarav)
            </GlassButton>
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() => {
                startDemoAsRole('trainer', 'usr_trainer_arjun');
                navigate('/studio/overview');
              }}
            >
              Quick preview: Trainer Studio (Arjun)
            </GlassButton>
            <GlassButton
              variant="tertiary"
              fullWidth
              onClick={() => {
                startDemoAsRole('client', 'usr_client_kavya');
                navigate('/app/home');
              }}
            >
              Quick preview: Independent Client (Kavya)
            </GlassButton>
          </div>
        </div>
      </main>
    </div>
  );
};
