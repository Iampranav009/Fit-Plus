import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  IndianRupee,
  Lock,
  PlayCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { COPY } from '../../data/copy';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Stage 4C Trainer Independence & ROI Calculator state
  const [clientCount, setClientCount] = useState(15);
  const [monthlyFee, setMonthlyFee] = useState(3500);

  const grossEarnings = clientCount * monthlyFee;
  const fitPlusTakeHome = Math.round(grossEarnings * 0.9); // 10% platform fee
  const gymTakeHome = Math.round(grossEarnings * 0.3); // Typical Indian commercial gym only gives 30-35%
  const monthlyExtra = fitPlusTakeHome - gymTakeHome;

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

        {/* Stage 4C: Interactive Trainer Independence & ROI Calculator */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 border-t border-white/[0.08]">
          <div className="rounded-[32px] glass-card border border-white/15 p-6 sm:p-10 relative overflow-hidden bg-gradient-to-br from-[#1C2029] via-[#090B10] to-[#1C2029]">
            <div className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#FF803E]/15 blur-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left description */}
              <div className="lg:col-span-6 space-y-4">
                <span className="px-3 py-1 rounded-full bg-[#FF803E]/10 text-[#FF9D5C] text-xs font-semibold border border-[#FF803E]/20 inline-flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Trainer Commercial Independence
                </span>
                <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                  Stop giving 60% of your earnings to gyms.
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Traditional fitness chains in India take 60% to 70% of what your clients pay. On FitPlus, you retain <strong className="text-white">90% of every rupee</strong> with automated Cashfree payouts and zero monthly software fees.
                </p>

                {/* Slider 1: Clients */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-zinc-400">Active Coaching Clients</span>
                    <span className="font-bold text-white text-base">{clientCount} clients</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={clientCount}
                    onChange={(e) => setClientCount(Number(e.target.value))}
                    className="w-full accent-[#FF803E] bg-white/10 rounded-lg h-2 cursor-pointer"
                  />
                </div>

                {/* Slider 2: Fee */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-zinc-400">Monthly Package Price (INR)</span>
                    <span className="font-bold text-white text-base">₹{monthlyFee.toLocaleString('en-IN')}/mo</span>
                  </div>
                  <input
                    type="range"
                    min="1500"
                    max="10000"
                    step="500"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(Number(e.target.value))}
                    className="w-full accent-[#FF803E] bg-white/10 rounded-lg h-2 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right comparison card */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-xs text-zinc-400 block mb-1">Traditional Gym</span>
                      <span className="text-xl sm:text-2xl font-bold text-zinc-400 line-through">
                        ₹{gymTakeHome.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-zinc-500 block mt-0.5">30% typical split</span>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-xs text-emerald-400 font-semibold block mb-1">FitPlus Take-Home</span>
                      <span className="text-xl sm:text-3xl font-extrabold text-emerald-400">
                        ₹{fitPlusTakeHome.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-emerald-500/80 block mt-0.5">90% keep rate</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-[#FF803E]/15 to-transparent border border-[#FF803E]/30 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-[#FF9D5C] font-semibold uppercase tracking-wider block">
                        Monthly Extra Take-Home
                      </span>
                      <span className="text-2xl font-black text-white">
                        +₹{monthlyExtra.toLocaleString('en-IN')} / month
                      </span>
                    </div>
                    <GlassButton variant="primary" onClick={() => navigate('/auth')}>
                      Start Free Studio
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </GlassButton>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400 pt-2 border-t border-white/10">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> T+2 Cashfree Bank Transfers
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 18% GST Compliant Invoices
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No Fixed Monthly Charge
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Growth & Viral Referral Banner */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF803E] to-[#FF4444] flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-[#FF803E]/20">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Give ₹500, Get ₹500</h3>
                <p className="text-xs sm:text-sm text-zinc-300">
                  Invite friends to start their fitness journey. They get ₹500 off, and you earn ₹500 coaching credits.
                </p>
              </div>
            </div>
            <GlassButton variant="glass" onClick={() => navigate('/discover')}>
              Find Your Coach
              <ArrowRight className="w-4 h-4 ml-1" />
            </GlassButton>
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
