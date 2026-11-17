import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Flame, Shield, Users, Zap, ChevronRight } from 'lucide-react';
import { COPY } from '../../data/copy';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { MediaImage } from '../../components/ui/MediaImage';

const featureItems = [
  {
    icon: Flame,
    cls: 'fp-icon-orange',
    title: 'Daily streaks & commitments',
    desc: 'Your trainer sets the rhythm. Workout, nutrition, recovery — all in one calm daily view.',
  },
  {
    icon: Users,
    cls: 'fp-icon-cyan',
    title: 'Real coach, real feedback',
    desc: 'Assigned blocks, weekly check-ins, and direct chat with your personal Indian fitness coach.',
  },
  {
    icon: Shield,
    cls: 'fp-icon-lime',
    title: 'Transparent INR packages',
    desc: 'Know exactly what you pay. Clear monthly or quarterly packages, no hidden gym splits.',
  },
  {
    icon: Zap,
    cls: 'fp-icon-purple',
    title: 'AI-powered planning',
    desc: 'Trainers draft workout and nutrition blocks in seconds with built-in Gemini AI assistance.',
  },
] as const;

const stats = [
  { value: '90%', label: 'Coach keep rate' },
  { value: '10K+', label: 'Active clients' },
  { value: '₹0', label: 'Monthly software fee' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  }),
};

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen fp-ambient-canvas-vibrant text-[#F5F5F7] overflow-x-hidden">

      {/* ── Sticky top nav ─────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-20 px-4 pt-3">
        <div className="glass-nav max-w-[720px] mx-auto h-14 rounded-[20px] px-5 flex items-center justify-between">
          <Link to="/" aria-label="FitPlus home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-[13px] font-medium text-[#A2A8B5] hover:text-[#F5F5F7] transition-colors min-h-[44px] flex items-center"
            >
              Sign in
            </Link>
            <span className="glass-control rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#FFB06B]">
              Demo preview
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex flex-col justify-end pb-14 pt-28 overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0">
          <MediaImage
            assetKey="welcomeHero"
            alt="Adult Indian athlete resting calmly in a dark studio gym"
            aspectClass="w-full h-full"
            imgClassName="object-cover object-center"
          />
          {/* Deep vignette gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090B10] via-[#090B10]/65 to-[#090B10]/25" />
          {/* Orange ambient from bottom-left */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FF803E]/10 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-[720px] mx-auto w-full px-6">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: {} }}
            className="flex flex-col gap-5"
          >
            {/* Label */}
            <motion.p
              custom={0}
              variants={fadeUp}
              className="fp-stat-badge w-fit"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF803E]" />
              India-first personal coaching
            </motion.p>

            {/* Headline */}
            <motion.h1
              custom={0.08}
              variants={fadeUp}
              className="fp-heading-xl"
            >
              {COPY.public.welcomeHeadline}
            </motion.h1>

            {/* Body */}
            <motion.p
              custom={0.16}
              variants={fadeUp}
              className="fp-body-lg max-w-[500px]"
            >
              {COPY.public.welcomeSupport}
            </motion.p>

            {/* CTAs */}
            <motion.div
              custom={0.24}
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3 pt-1"
            >
              <GlassButton onClick={() => navigate('/onboarding/role')}>
                {COPY.public.getStarted}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </GlassButton>
              <GlassButton variant="glass" onClick={() => navigate('/auth')}>
                {COPY.public.signIn}
              </GlassButton>
            </motion.div>

            {/* Demo link */}
            <motion.div custom={0.3} variants={fadeUp}>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-[13px] text-[#7C8393] hover:text-[#A2A8B5] transition-colors"
              >
                Try the interactive demo
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────────────── */}
      <section className="max-w-[720px] mx-auto w-full px-6 py-16 flex flex-col gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <p className="fp-section-label mb-2">What you get</p>
          <h2 className="fp-heading-lg">Everything in one place</h2>
          <p className="mt-2 fp-body-md max-w-[440px]">
            Your daily fitness journey, guided by a real Indian coach.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featureItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.42, delay: i * 0.07, ease: [0.32, 0.72, 0, 1] }}
                className="surface-card glass-card-hover rounded-[22px] p-5 flex flex-col gap-3.5"
              >
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${item.cls}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="fp-heading-md text-[15px]">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] text-[#A2A8B5] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────── */}
      <div className="border-t border-b border-white/[0.06]">
        <div className="max-w-[720px] mx-auto px-6 py-12">
          <div className="grid grid-cols-3 gap-6 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.09, ease: [0.32, 0.72, 0, 1] }}
              >
                <p className="text-[32px] sm:text-[40px] font-bold tracking-[-0.035em] text-[#FF803E]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#7C8393] uppercase tracking-[0.05em]">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Role showcase ──────────────────────────────────────────── */}
      <section className="max-w-[720px] mx-auto px-6 py-16 flex flex-col gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <p className="fp-section-label mb-2">Two roles, one platform</p>
          <h2 className="fp-heading-lg">Built for trainers & clients</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: 'For clients',
              color: '#70C8ED',
              colorBg: 'rgba(112,200,237,0.08)',
              colorBorder: 'rgba(112,200,237,0.18)',
              title: 'Stay consistent effortlessly',
              points: [
                'Daily task view — workout, nutrition, recovery',
                'Streak tracking with gentle accountability',
                'Direct chat & weekly check-in with your coach',
                'Indian meal guidance, zero guilt alerts',
              ],
              cta: { label: 'Find a coach', to: '/discover' },
            },
            {
              label: 'For trainers',
              color: '#FF803E',
              colorBg: 'rgba(255,128,62,0.08)',
              colorBorder: 'rgba(255,128,62,0.18)',
              title: 'Run your independent studio',
              points: [
                'Assign workout & nutrition blocks in seconds',
                'AI-assisted block drafting with Gemini',
                'INR packages with 90% take-home',
                'Cashfree payouts, GST-compliant invoices',
              ],
              cta: { label: 'Set up your studio', to: '/auth' },
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.42, delay: i * 0.08, ease: [0.32, 0.72, 0, 1] }}
              className="surface-card glass-card-hover rounded-[24px] p-6 flex flex-col gap-5"
            >
              <div>
                <span
                  className="inline-block text-[11px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                  style={{ background: card.colorBg, border: `1px solid ${card.colorBorder}`, color: card.color }}
                >
                  {card.label}
                </span>
                <h3 className="mt-3 text-[18px] font-semibold text-[#F5F5F7] tracking-[-0.02em]">
                  {card.title}
                </h3>
              </div>
              <ul className="flex flex-col gap-2.5">
                {card.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-[13px] text-[#A2A8B5]">
                    <span
                      className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{ background: card.colorBg, color: card.color }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link
                to={card.cta.to}
                className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
                style={{ color: card.color }}
              >
                {card.cta.label}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="max-w-[720px] mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          className="glass-overlay rounded-[28px] p-8 sm:p-10 text-center flex flex-col items-center gap-6"
        >
          <BrandMark />
          <div>
            <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.025em] text-[#F5F5F7]">
              Ready to start your journey?
            </h2>
            <p className="mt-2 text-[14px] text-[#A2A8B5] max-w-[320px] mx-auto leading-relaxed">
              {COPY.public.demoAuthBody}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[340px]">
            <GlassButton fullWidth onClick={() => navigate('/onboarding/role')}>
              {COPY.public.getStarted}
            </GlassButton>
            <GlassButton fullWidth variant="glass" onClick={() => navigate('/auth')}>
              {COPY.public.signIn}
            </GlassButton>
          </div>
          <p className="text-[12px] text-[#7C8393]">
            Or{' '}
            <Link to="/demo" className="text-[#FFB06B] hover:text-[#FF803E] transition-colors">
              try the interactive demo
            </Link>{' '}
            — no sign-up needed
          </p>
        </motion.div>
      </section>
    </div>
  );
};
