import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  IndianRupee,
  PlayCircle,
  TrendingUp,
} from 'lucide-react';
import { COPY } from '../../data/copy';
import { PublicTopBar } from '../../components/layout/PublicTopBar';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

const inView = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  },
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const [clientCount, setClientCount] = useState(15);
  const [monthlyFee, setMonthlyFee] = useState(3500);

  const grossEarnings = clientCount * monthlyFee;
  const fitPlusTakeHome = Math.round(grossEarnings * 0.9);
  const gymTakeHome = Math.round(grossEarnings * 0.3);
  const monthlyExtra = fitPlusTakeHome - gymTakeHome;

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <PublicTopBar />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="fp-stat-badge w-fit"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF803E]" />
                India-first personal coaching platform
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06 }}
                className="fp-heading-xl"
              >
                {COPY.public.landingHeadline}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.14 }}
                className="fp-body-lg max-w-lg"
              >
                {COPY.public.landingSupport} Built for independent coaches and adult clients across
                India with transparent INR packages, everyday Indian meal guidance, and steady daily
                commitments.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 }}
                className="flex flex-wrap items-center gap-3 pt-1"
              >
                <GlassButton onClick={() => navigate('/discover')}>
                  {COPY.public.findTrainer}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </GlassButton>
                <GlassButton variant="glass" onClick={() => navigate('/auth')}>
                  {COPY.public.imATrainer}
                </GlassButton>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.32 }}
                className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-x-6 gap-y-2"
              >
                <Link
                  to="/demo"
                  className="text-[14px] font-medium text-[#F5F5F7] hover:text-[#FF803E] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
                >
                  <PlayCircle className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                  Explore interactive demo sandbox
                </Link>
                <Link
                  to="/welcome"
                  className="text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] transition-colors min-h-[44px] inline-flex items-center"
                >
                  See how FitPlus works
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="relative h-full min-h-[380px] rounded-[28px] overflow-hidden border border-white/[0.1] shadow-[0_28px_64px_-16px_rgba(0,0,0,0.80)]">
                <MediaImage
                  assetKey="welcomeHero"
                  alt="Adult Indian athlete taking a calm breath after training"
                  aspectClass="h-full aspect-[4/5]"
                  imgClassName="object-cover object-center lg:h-full"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090B10]/95 via-[#090B10]/25 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 glass-overlay rounded-[18px] p-4">
                  <p className="text-[11px] font-semibold text-[#FFB06B] uppercase tracking-[0.06em]">
                    {COPY.brand.tagline}
                  </p>
                  <p className="mt-1.5 text-[14px] font-medium text-[#F5F5F7] leading-snug">
                    Daily commitments, streaks, and trainer check-ins in one calm place.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Coaching tracks ───────────────────────────────────────── */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 border-t border-white/[0.07]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={inView}
            className="flex flex-wrap items-end justify-between gap-4 mb-8"
          >
            <div>
              <p className="fp-section-label mb-1.5">Coaching tracks</p>
              <h2 className="fp-heading-lg text-[26px]">Structured around real routines</h2>
            </div>
            <Link
              to="/discover"
              className="text-[14px] font-semibold text-[#FF803E] hover:text-[#FFB06B] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            >
              Explore coaches
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                assetKey: 'programWeightLoss',
                alt: 'Guided conditioning and sustainable weight management session',
                trackLabel: 'Track 01 · Sustainable pacing',
                trackColor: '#70C8ED',
                title: 'Weight management & daily steps',
                desc: 'Steady movement targets and Indian home-cooked meals with zero guilt alerts.',
                iconAsset: 'illusKettlebell',
                caption: 'Conditioning · Hydration · Recovery balance',
              },
              {
                assetKey: 'programMuscleBuilding',
                alt: 'Progressive strength training in a focused studio',
                trackLabel: 'Track 02 · Progressive strength',
                trackColor: '#FF803E',
                title: 'Muscle & strength coaching',
                desc: 'Clear set, rep, and load progression designed by your independent coach.',
                iconAsset: 'illusDumbbell',
                caption: 'Gym or home dumbbell splits · Metric tracking',
              },
              {
                assetKey: 'foodLunch',
                alt: 'Balanced Indian home-style lunch bowl',
                trackLabel: 'Track 03 · Everyday food',
                trackColor: '#B8E66C',
                title: 'Practical Indian nutrition',
                desc: 'Simple dal, roti, paneer, and vegetarian swaps tailored to busy schedules.',
                iconAsset: 'illusHydration',
                caption: 'Protein habits · Daily hydration reminders',
              },
            ].map((track, i) => (
              <motion.article
                key={track.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.42, delay: i * 0.08, ease: [0.32, 0.72, 0, 1] }}
                className="surface-card glass-card-hover rounded-[24px] overflow-hidden flex flex-col"
              >
                <div className="relative">
                  <MediaImage
                    assetKey={track.assetKey}
                    alt={track.alt}
                    aspectClass="aspect-[16/9]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C2029] via-transparent to-transparent" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.07em]" style={{ color: track.trackColor }}>
                      {track.trackLabel}
                    </p>
                    <h3 className="mt-1.5 text-[17px] font-semibold text-[#F5F5F7] tracking-[-0.015em]">
                      {track.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] text-[#A2A8B5] leading-relaxed">{track.desc}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                    <MediaImage
                      assetKey={track.iconAsset}
                      alt=""
                      aspectClass="w-10 h-10 rounded-[10px] shrink-0"
                    />
                    <span className="text-[12px] text-[#7C8393]">{track.caption}</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ── Trainer Independence & ROI Calculator ─────────────────── */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-14 border-t border-white/[0.07]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={inView}
            className="surface-card rounded-[32px] p-6 sm:p-10 relative overflow-hidden"
          >
            {/* Orange ambient glow */}
            <div className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[#FF803E]/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-[#C1ACF9]/06 blur-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Left description */}
              <div className="lg:col-span-6 space-y-5">
                <span className="fp-stat-badge">
                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                  Trainer Commercial Independence
                </span>
                <h2 className="fp-heading-lg text-[26px] sm:text-[32px]">
                  Stop giving 60% of your earnings to gyms.
                </h2>
                <p className="fp-body-md">
                  Traditional fitness chains in India take 60–70% of what your clients pay. On
                  FitPlus, you retain{' '}
                  <strong className="text-[#F5F5F7] font-semibold">90% of every rupee</strong> with
                  automated Cashfree payouts and zero monthly software fees.
                </p>

                {/* Slider: Clients */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#7C8393]">Active Coaching Clients</span>
                    <span className="font-bold text-[#F5F5F7]">{clientCount} clients</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={clientCount}
                    onChange={(e) => setClientCount(Number(e.target.value))}
                    aria-label="Number of active coaching clients"
                    className="w-full accent-[#FF803E] rounded-lg h-2 cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  />
                </div>

                {/* Slider: Fee */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#7C8393]">Monthly Package Price (INR)</span>
                    <span className="font-bold text-[#F5F5F7]">
                      ₹{monthlyFee.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1500"
                    max="10000"
                    step="500"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(Number(e.target.value))}
                    aria-label="Monthly package price in INR"
                    className="w-full accent-[#FF803E] rounded-lg h-2 cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              {/* Right comparison card */}
              <div className="lg:col-span-6">
                <div className="glass-overlay rounded-[24px] p-6 sm:p-8 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="surface-elevated p-4 rounded-[16px]">
                      <span className="text-[11px] font-semibold text-[#7C8393] uppercase tracking-[0.05em] block mb-1.5">
                        Traditional Gym
                      </span>
                      <span className="text-[20px] sm:text-[22px] font-bold text-[#7C8393] line-through">
                        ₹{gymTakeHome.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-[#7C8393] block mt-0.5">30% typical split</span>
                    </div>

                    <div className="rounded-[16px] p-4 bg-[#B8E66C]/08 border border-[#B8E66C]/22">
                      <span className="text-[11px] font-bold text-[#B8E66C] uppercase tracking-[0.05em] block mb-1.5">
                        FitPlus Take-Home
                      </span>
                      <span className="text-[20px] sm:text-[26px] font-extrabold text-[#B8E66C]">
                        ₹{fitPlusTakeHome.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-[#B8E66C]/70 block mt-0.5">90% keep rate</span>
                    </div>
                  </div>

                  <div className="rounded-[16px] p-4 bg-[#FF803E]/10 border border-[#FF803E]/25 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-[#FFB06B] uppercase tracking-[0.07em] block mb-1">
                        Monthly Extra Take-Home
                      </span>
                      <span className="text-[22px] font-extrabold text-[#F5F5F7]">
                        +₹{monthlyExtra.toLocaleString('en-IN')}
                        <span className="text-[14px] font-semibold text-[#A2A8B5]"> / month</span>
                      </span>
                    </div>
                    <GlassButton onClick={() => navigate('/auth')}>
                      Start Free Studio
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </GlassButton>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-[12px] text-[#7C8393] pt-1 border-t border-white/[0.06]">
                    {[
                      'T+2 Cashfree Bank Transfers',
                      '18% GST Compliant Invoices',
                      'No Fixed Monthly Charge',
                    ].map((point) => (
                      <span key={point} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#B8E66C]" aria-hidden="true" />
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Referral banner ───────────────────────────────────────── */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pb-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            variants={inView}
            className="surface-card rounded-[22px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-[14px] fp-icon-orange flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#F5F5F7]">Give ₹500, Get ₹500</h3>
                <p className="text-[13px] text-[#A2A8B5]">
                  Invite friends to start their fitness journey. They get ₹500 off, and you earn
                  ₹500 coaching credits.
                </p>
              </div>
            </div>
            <GlassButton variant="glass" onClick={() => navigate('/discover')}>
              Find Your Coach
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </GlassButton>
          </motion.div>
        </section>

        {/* ── Three value sections ──────────────────────────────────── */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 border-t border-white/[0.07]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                label: 'For clients',
                title: 'One daily view, zero noise',
                desc: "Track today's workout, Indian home meals, steps, and recovery commitments without guilt or red failure alerts.",
                color: '#70C8ED',
              },
              {
                num: '02',
                label: 'For independent coaches',
                title: 'Assign cleanly, review fast',
                desc: 'Manage clients, bulk-assign templates while respecting individual overrides, and draft blocks with Gemini AI assistance.',
                color: '#FF803E',
              },
              {
                num: '03',
                label: 'Verified billing & trust',
                title: 'Transparent INR coaching',
                desc: 'Clear monthly and quarterly INR packages, verified trainer credentials, client reviews, and direct WhatsApp coaching handoffs.',
                color: '#B8E66C',
              },
            ].map((card, i) => (
              <motion.div
                key={card.num}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.42, delay: i * 0.08, ease: [0.32, 0.72, 0, 1] }}
                className="surface-card glass-card-hover rounded-[22px] p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-[10px] font-bold tracking-[0.08em] uppercase"
                    style={{ color: card.color }}
                  >
                    {card.num}
                  </span>
                  <span className="text-[11px] text-[#7C8393] font-medium">{card.label}</span>
                </div>
                <h2 className="text-[18px] font-semibold text-[#F5F5F7] tracking-[-0.02em]">
                  {card.title}
                </h2>
                <p className="text-[13px] text-[#A2A8B5] leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.07] px-4 sm:px-6 lg:px-10 py-6">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <p className="text-[12px] text-[#7C8393]">
            FitPlus · India-first personal fitness coaching platform · en-IN
          </p>
          <div className="flex flex-wrap items-center gap-5 text-[12px] text-[#7C8393]">
            <Link to="/discover" className="hover:text-[#F5F5F7] transition-colors">
              Discover coaches
            </Link>
            <Link to="/demo" className="hover:text-[#F5F5F7] transition-colors">
              Interactive demo
            </Link>
            <Link to="/auth" className="hover:text-[#F5F5F7] transition-colors">
              Sign in
            </Link>
            <Link to="/privacy" className="hover:text-[#F5F5F7] transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-[#F5F5F7] transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
