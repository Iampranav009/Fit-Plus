import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

export const RoleSelectPage: React.FC = () => {
  const { store } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTrainerInviteFlow = searchParams.get('role') === 'trainer';

  const handleContinue = () => {
    if (isTrainerInviteFlow) {
      navigate('/onboarding/trainer/profile');
    } else {
      navigate('/onboarding/client/basics');
    }
  };

  // Trainer invite flow skips role selection entirely
  if (isTrainerInviteFlow) {
    handleContinue();
    return null;
  }

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <header className="sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
        <div className="glass-nav max-w-[1280px] mx-auto h-14 rounded-[18px] px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" aria-label="FitPlus home">
            <BrandMark />
          </Link>
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 flex flex-col gap-6">
          {store.session.pendingInviteToken ? (
            <p className="text-[13px] text-[#FFB06B]">
              Invite token {store.session.pendingInviteToken} attached — complete your profile to continue.
            </p>
          ) : null}

          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              Set up your FitPlus profile
            </h1>
            <p className="mt-2 text-[15px] text-[#A2A8B5]">
              {COPY.public.demoAuthBody}
            </p>
          </div>

          <div className="rounded-[20px] p-5 glass-nav border border-[#FF803E]/60 [box-shadow:inset_0_1px_0_rgba(255,128,62,0.18),0_0_20px_-6px_rgba(255,128,62,0.22)] flex items-start gap-4">
            <div className="w-11 h-11 rounded-[12px] border bg-[#FF803E]/16 border-[#FF803E]/36 text-[#FF803E] flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[17px] font-semibold text-[#F5F5F7]">
                {COPY.public.roleClient}
              </p>
              <p className="mt-1 text-[14px] text-[#A2A8B5]">
                Follow daily workout, meal and habit commitments, track streaks, or connect with an independent coach.
              </p>
            </div>
          </div>

          <GlassButton fullWidth onClick={handleContinue}>
            {COPY.public.continueCta}
          </GlassButton>
        </div>

        <div className="hidden lg:block lg:col-span-5">
          <div className="rounded-[28px] overflow-hidden border border-white/[0.1] shadow-[0_24px_56px_-16px_rgba(0,0,0,0.7)]">
            <MediaImage
              assetKey="coachIntro"
              alt="Personal trainer speaking with a client in a dark modern gym"
              aspectClass="aspect-[4/5]"
            />
          </div>
        </div>
      </main>
    </div>
  );
};
