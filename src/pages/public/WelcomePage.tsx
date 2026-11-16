import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COPY } from '../../data/copy';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col lg:grid lg:grid-cols-12">
      {/* Left/Top Editorial Photography */}
      <div className="relative lg:col-span-7 min-h-[54vh] lg:min-h-screen overflow-hidden">
        <MediaImage
          assetKey="welcomeHero"
          alt="Adult Indian athlete resting calmly in a dark studio gym"
          aspectClass="w-full h-full min-h-[54vh] lg:min-h-screen"
          imgClassName="object-cover object-top sm:object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101218] via-[#101218]/40 to-[#090B10]/35 lg:bg-gradient-to-r lg:from-transparent lg:via-[#101218]/25 lg:to-[#101218]" />
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <Link
            to="/"
            aria-label="Back to FitPlus overview"
            className="glass-control rounded-[14px] px-3.5 py-2 inline-flex items-center"
          >
            <BrandMark size="md" />
          </Link>
          <span className="glass-control rounded-full px-3 py-1.5 text-[12px] text-[#A2A8B5]">
            Demo preview
          </span>
        </div>
      </div>

      {/* Right/Bottom Editorial Copy & Primary CTA */}
      <div className="lg:col-span-5 flex flex-col justify-end lg:justify-center px-6 py-8 sm:px-10 lg:px-12">
        <div className="max-w-md w-full mx-auto lg:mx-0 flex flex-col gap-5">
          <p className="text-[13px] font-medium text-[#FFB06B]">
            Calm consistency · India-first coaching
          </p>
          <h1 className="text-[36px] sm:text-[44px] leading-[1.1] font-semibold tracking-[-0.03em] text-[#F5F5F7]">
            {COPY.public.welcomeHeadline}
          </h1>
          <p className="text-[16px] leading-[1.6] text-[#A2A8B5]">
            {COPY.public.welcomeSupport}
          </p>

          <div className="pt-2 flex flex-col gap-3">
            <GlassButton fullWidth onClick={() => navigate('/onboarding/role')}>
              {COPY.public.getStarted}
            </GlassButton>
            <GlassButton
              fullWidth
              variant="glass"
              onClick={() => navigate('/auth')}
            >
              {COPY.public.signIn}
            </GlassButton>
          </div>

          <p className="text-[12px] text-[#7C8393]">
            {COPY.public.demoAuthBody}
          </p>
        </div>
      </div>
    </div>
  );
};
