import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Users } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types/domain';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

export const RoleSelectPage: React.FC = () => {
  const { store } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('client');

  const handleContinue = () => {
    if (role === 'client') {
      navigate('/onboarding/client/basics');
    } else {
      navigate('/onboarding/trainer/profile');
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
              Invite token {store.session.pendingInviteToken} attached — choose "I'm here to get fitter" to continue.
            </p>
          ) : null}

          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.public.roleHeadline}
            </h1>
            <p className="mt-2 text-[15px] text-[#A2A8B5]">
              {COPY.public.demoAuthBody}
            </p>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setRole('client')}
              aria-pressed={role === 'client'}
              className={`text-left rounded-[20px] p-5 border transition-colors flex items-start gap-4 cursor-pointer ${
                role === 'client'
                  ? 'bg-[#FF803E]/12 border-[#FF803E]'
                  : 'surface-card hover:border-white/20'
              }`}
            >
              <div className="w-11 h-11 rounded-[12px] bg-[#252A35] border border-white/[0.08] flex items-center justify-center text-[#FF803E] shrink-0">
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
            </button>

            <button
              type="button"
              onClick={() => setRole('trainer')}
              aria-pressed={role === 'trainer'}
              className={`text-left rounded-[20px] p-5 border transition-colors flex items-start gap-4 cursor-pointer ${
                role === 'trainer'
                  ? 'bg-[#FF803E]/12 border-[#FF803E]'
                  : 'surface-card hover:border-white/20'
              }`}
            >
              <div className="w-11 h-11 rounded-[12px] bg-[#252A35] border border-white/[0.08] flex items-center justify-center text-[#FF803E] shrink-0">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[17px] font-semibold text-[#F5F5F7]">
                  {COPY.public.roleTrainer}
                </p>
                <p className="mt-1 text-[14px] text-[#A2A8B5]">
                  Set up your coaching storefront, INR packages, client assignments, and consultation schedule.
                </p>
              </div>
            </button>
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
