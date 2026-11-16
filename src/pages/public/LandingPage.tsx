import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { COPY } from '../../data/copy';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <PublicTopBar />

      <main className="flex-1">
        {/* Hero Split */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center gap-6">
              <p className="text-[13px] font-medium text-[#FFB06B]">
                India-first personal coaching platform
              </p>
              <h1 className="text-[36px] sm:text-[46px] leading-[1.08] font-semibold tracking-[-0.03em] text-[#F5F5F7] max-w-xl">
                {COPY.public.landingHeadline}
              </h1>
              <p className="text-[16px] leading-[1.6] text-[#A2A8B5] max-w-lg">
                {COPY.public.landingSupport} Built for independent coaches and adult clients across India with transparent INR packages, everyday Indian meal guidance, and steady daily commitments.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <GlassButton onClick={() => navigate('/discover')}>
                  {COPY.public.findTrainer}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </GlassButton>
                <GlassButton
                  variant="glass"
                  onClick={() => navigate('/auth')}
                >
                  {COPY.public.imATrainer}
                </GlassButton>
              </div>

              <div className="pt-5 border-t border-white/[0.08] flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-[#A2A8B5]">
                <Link
                  to="/demo"
                  className="text-[#F5F5F7] hover:text-[#FF803E] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
                >
                  <PlayCircle className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                  Explore interactive demo sandbox
                </Link>
                <Link
                  to="/welcome"
                  className="hover:text-[#F5F5F7] transition-colors min-h-[44px] inline-flex items-center"
                >
                  See how FitPlus works
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative h-full min-h-[360px] rounded-[28px] overflow-hidden border border-white/[0.1] shadow-[0_24px_60px_-16px_rgba(0,0,0,0.75)]">
                <MediaImage
                  assetKey="welcomeHero"
                  alt="Adult Indian athlete taking a calm breath after training"
                  aspectClass="h-full aspect-[4/5]"
                  imgClassName="object-cover object-center lg:h-full"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090B10]/95 via-[#090B10]/25 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 glass-overlay rounded-[18px] p-4">
                  <p className="text-[12px] text-[#FFB06B] font-medium">
                    {COPY.brand.tagline}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-[#F5F5F7]">
                    Daily commitments, streaks, and trainer check-ins in one calm place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Program Tracks */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 border-t border-white/[0.08]">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[12px] font-medium text-[#FFB06B]">Coaching tracks</p>
              <h2 className="mt-1 text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                Structured around real routines
              </h2>
            </div>
            <Link
              to="/discover"
              className="text-[14px] font-medium text-[#FF803E] hover:text-[#FFB06B] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            >
              Explore coaches
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="surface-card rounded-[24px] overflow-hidden flex flex-col">
              <div className="relative">
                <MediaImage
                  assetKey="programWeightLoss"
                  alt="Guided conditioning and sustainable weight management session"
                  aspectClass="aspect-[16/9]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C2029] via-transparent to-transparent" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[#70C8ED] font-medium">Track 01 · Sustainable pacing</p>
                  <h3 className="mt-1 text-[19px] font-semibold text-[#F5F5F7]">
                    Weight management & daily steps
                  </h3>
                  <p className="mt-1.5 text-[14px] text-[#A2A8B5] leading-relaxed">
                    Steady movement targets and Indian home-cooked meals with zero guilt alerts.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                  <MediaImage
                    assetKey="illusKettlebell"
                    alt=""
                    aspectClass="w-10 h-10 rounded-[10px] shrink-0"
                  />
                  <span className="text-[12px] text-[#7C8393]">
                    Conditioning · Hydration · Recovery balance
                  </span>
                </div>
              </div>
            </article>

            <article className="surface-card rounded-[24px] overflow-hidden flex flex-col">
              <div className="relative">
                <MediaImage
                  assetKey="programMuscleBuilding"
                  alt="Progressive strength training in a focused studio"
                  aspectClass="aspect-[16/9]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C2029] via-transparent to-transparent" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[#FF803E] font-medium">Track 02 · Progressive strength</p>
                  <h3 className="mt-1 text-[19px] font-semibold text-[#F5F5F7]">
                    Muscle & strength coaching
                  </h3>
                  <p className="mt-1.5 text-[14px] text-[#A2A8B5] leading-relaxed">
                    Clear set, rep, and load progression designed by your independent coach.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                  <MediaImage
                    assetKey="illusDumbbell"
                    alt=""
                    aspectClass="w-10 h-10 rounded-[10px] shrink-0"
                  />
                  <span className="text-[12px] text-[#7C8393]">
                    Gym or home dumbbell splits · Metric tracking
                  </span>
                </div>
              </div>
            </article>

            <article className="surface-card rounded-[24px] overflow-hidden flex flex-col">
              <div className="relative">
                <MediaImage
                  assetKey="foodLunch"
                  alt="Balanced Indian home-style lunch bowl"
                  aspectClass="aspect-[16/9]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C2029] via-transparent to-transparent" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[#B8E66C] font-medium">Track 03 · Everyday food</p>
                  <h3 className="mt-1 text-[19px] font-semibold text-[#F5F5F7]">
                    Practical Indian nutrition
                  </h3>
                  <p className="mt-1.5 text-[14px] text-[#A2A8B5] leading-relaxed">
                    Simple dal, roti, paneer, and vegetarian swaps tailored to busy schedules.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                  <MediaImage
                    assetKey="illusHydration"
                    alt=""
                    aspectClass="w-10 h-10 rounded-[10px] shrink-0"
                  />
                  <span className="text-[12px] text-[#7C8393]">
                    Protein habits · Daily hydration reminders
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Three focused value sections */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 border-t border-white/[0.08]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="surface-card rounded-[22px] p-6">
              <p className="text-[12px] text-[#7C8393]">01 · For clients</p>
              <h2 className="mt-2 text-[20px] font-semibold text-[#F5F5F7]">
                One daily view, zero noise
              </h2>
              <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                Track today&apos;s workout, Indian home meals, steps, and recovery commitments without guilt or red failure alerts.
              </p>
            </div>
            <div className="surface-card rounded-[22px] p-6">
              <p className="text-[12px] text-[#7C8393]">02 · For independent coaches</p>
              <h2 className="mt-2 text-[20px] font-semibold text-[#F5F5F7]">
                Assign cleanly, review fast
              </h2>
              <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                Manage clients, bulk-assign templates while respecting individual overrides, and draft blocks with Gemini AI assistance.
              </p>
            </div>
            <div className="surface-card rounded-[22px] p-6">
              <p className="text-[12px] text-[#7C8393]">03 · Verified billing & trust</p>
              <h2 className="mt-2 text-[20px] font-semibold text-[#F5F5F7]">
                Transparent INR coaching
              </h2>
              <p className="mt-2 text-[14px] text-[#A2A8B5] leading-relaxed">
                Clear monthly and quarterly INR packages, verified trainer credentials, client reviews, and direct WhatsApp coaching handoffs.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] px-4 sm:px-6 lg:px-10 py-6 text-[12px] text-[#7C8393]">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <p>FitPlus · India-first personal fitness coaching platform · en-IN</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/discover" className="hover:text-[#F5F5F7] transition-colors">Discover coaches</Link>
            <Link to="/demo" className="hover:text-[#F5F5F7] transition-colors">Interactive demo</Link>
            <Link to="/auth" className="hover:text-[#F5F5F7] transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
