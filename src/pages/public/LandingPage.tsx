import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  IndianRupee,
  Languages,
  MapPin,
  Plus,
  Target,
} from 'lucide-react';
import { MarketingLayout } from '../../components/marketing/MarketingLayout';
import { HomeHero } from '../../components/marketing/home/HomeHero';
import { AudiencePaths } from '../../components/marketing/home/AudiencePaths';
import { Walkthrough } from '../../components/marketing/home/Walkthrough';
import {
  AssignPlanPreview,
  CheckInReviewPreview,
  CoachClientsPreview,
} from '../../components/marketing/ProductPreviews';
import { ResponsiveImage } from '../../components/marketing/ResponsiveImage';
import { MEDIA } from '../../components/marketing/marketingMedia';
import { Reveal, stagger } from '../../components/marketing/Reveal';
import { CTA } from '../../components/marketing/links';

/* ── Coaching tracks ─────────────────────────────────────────────────── */

const TRACKS = [
  {
    key: 'weight',
    title: 'Weight management & daily steps',
    body: 'Step targets, realistic portions and a coach who adjusts the plan when a week goes sideways.',
    query: 'weight',
    image: MEDIA.trackWeight,
    alt: 'Woman swinging a kettlebell in a warehouse gym',
    layout: 'lg:col-span-7',
    aspect: 'aspect-[16/10]',
    position: 'object-[40%_50%]',
  },
  {
    key: 'strength',
    title: 'Muscle & strength',
    body: 'Progressive sets, reps and load, planned for a full gym or a pair of dumbbells at home.',
    query: 'strength',
    image: MEDIA.trackStrength,
    alt: 'Man doing a seated dumbbell curl in a dark gym',
    layout: 'lg:col-span-5 lg:row-span-2',
    aspect: 'aspect-[16/10] lg:aspect-[4/5]',
    position: 'object-[48%_30%]',
  },
  {
    key: 'nutrition',
    title: 'Practical Indian nutrition',
    body: 'Dal, roti, poha, paneer: plans built from what your kitchen already makes, vegetarian or not.',
    query: 'nutrition',
    image: MEDIA.trackFood,
    alt: 'Plate of dal, mixed vegetable sabzi and rotis on a dark table',
    layout: 'lg:col-span-7',
    aspect: 'aspect-[16/10] lg:aspect-[21/9]',
    position: 'object-[50%_55%]',
  },
] as const;

const CoachingTracks: React.FC = () => (
  <section id="tracks" aria-labelledby="tracks-title" className="py-16 lg:py-24 border-t border-white/[0.07]">
    <div className="mkt-container">
      <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div className="max-w-[40rem]">
          <p className="mkt-eyebrow">Coaching tracks</p>
          <h2 id="tracks-title" className="mkt-h2 mt-3">
            Coaching for the goal you actually have.
          </h2>
        </div>
        <Link to={CTA.findTrainer.to} className="mkt-btn mkt-btn-tertiary self-start md:self-auto">
          Browse all trainers
        </Link>
      </Reveal>

      <ul className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {TRACKS.map((t, i) => (
          <Reveal as="li" key={t.key} delay={stagger(i)} className={`${t.layout} ${i === 2 ? 'md:col-span-2' : ''}`}>
            <Link
              to={`/discover?q=${encodeURIComponent(t.query)}`}
              className="mkt-zoom-trigger group h-full flex flex-col rounded-[24px] overflow-hidden mkt-matte transition-colors duration-200 hover:border-white/20"
            >
              <div className={`mkt-media mkt-zoom ${t.aspect} lg:flex-1 lg:min-h-0`}>
                <img
                  src={t.image.src}
                  srcSet={t.image.srcSet}
                  sizes="(min-width: 1024px) 700px, 100vw"
                  width={t.image.width}
                  height={t.image.height}
                  alt={t.alt}
                  loading="lazy"
                  decoding="async"
                  className={t.position}
                />
              </div>
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                <div>
                  <h3 className="mkt-h3">{t.title}</h3>
                  <p className="mkt-body mt-2 max-w-[34rem]">{t.body}</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-[#FF803E] whitespace-nowrap">
                  See trainers
                  <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-[3px]" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
      <p className="mt-4 mkt-small">Each card opens the directory with that search applied.</p>
    </div>
  </section>
);

/* ── Trainer workflow ────────────────────────────────────────────────── */

const WORKFLOW = [
  {
    key: 'assign',
    label: 'Assign a plan',
    body: 'Start from a template, assign it to several clients, and adjust one client’s version without duplicating it.',
    Preview: () => <AssignPlanPreview />,
  },
  {
    key: 'track',
    label: 'See what clients completed',
    body: 'Completion, missed check-ins and renewals show up per client, so you know who needs a message today.',
    Preview: () => <CoachClientsPreview rows={4} />,
  },
  {
    key: 'review',
    label: 'Review check-ins',
    body: 'Each weekly check-in arrives with sessions completed and meals logged. Reply and mark it reviewed.',
    Preview: () => <CheckInReviewPreview animate />,
  },
] as const;

const ForTrainers: React.FC = () => (
  <section id="for-trainers" aria-labelledby="trainers-title" className="py-16 lg:py-24 border-t border-white/[0.07] bg-[#0B0B0C]">
    <div className="mkt-container">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <Reveal className="lg:col-span-6">
          <p className="mkt-eyebrow">For independent trainers</p>
          <h2 id="trainers-title" className="mkt-h2 mt-3">
            Run your coaching practice without the spreadsheet.
          </h2>
          <p className="mkt-lead mt-5 max-w-[36rem]">
            Plans, check-ins, packages and client messages live in one Trainer Studio. Routine admin, like copying plans
            and chasing check-ins, takes less of your week, so more of it goes to coaching.
          </p>
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[0.9375rem] text-[#F3EEE7]">
            {[
              'Templates with per-client adjustments',
              'AI-assisted drafts you review first',
              'INR packages with Cashfree checkout',
              'Public profile with specialties & languages',
            ].map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#FF803E] shrink-0" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="lg:col-span-6" delay={0.08}>
          <div className="rounded-[28px] overflow-hidden border border-white/[0.08] mkt-media aspect-[4/3]">
            <ResponsiveImage
              image={MEDIA.consult}
              alt="Trainer and client reviewing a plan together at a table in a gym"
              sizes="(min-width: 1024px) 560px, 100vw"
              className="block w-full h-full"
              imgClassName="w-full h-full object-cover"
            />
          </div>
        </Reveal>
      </div>

      <ol className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5" aria-label="Trainer workflow">
        {WORKFLOW.map((w, i) => (
          <Reveal as="li" key={w.key} delay={stagger(i, 0.08)} className="flex flex-col">
            <div className="flex items-center gap-3">
              <h3 className="text-[1.125rem] font-semibold text-[#F3EEE7]">{w.label}</h3>
              {i < WORKFLOW.length - 1 ? (
                <ArrowRight className="hidden lg:block w-5 h-5 text-[#FF803E] ml-auto" aria-hidden="true" />
              ) : null}
            </div>
            <p className="mkt-body mt-2 min-h-[3.2em]">{w.body}</p>
            <div className="mt-4 flex-1">
              <w.Preview />
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-12 rounded-[24px] mkt-matte p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-[40rem]">
          <p className="text-[1.125rem] font-semibold text-[#F3EEE7]">Try it with sample clients first.</p>
          <p className="mkt-body mt-1">
            The coach demo opens Coach Arjun’s Trainer Studio with sample clients. When you’re ready, create an account,
            verify your email and choose “I’m here to coach” to set up your studio profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={CTA.coachDemo.to} className="mkt-btn mkt-btn-primary">
            {CTA.coachDemo.label}
            <ArrowRight className="mkt-arrow w-[18px] h-[18px]" aria-hidden="true" />
          </Link>
          <Link to={CTA.createAccount.to} className="mkt-btn mkt-btn-secondary">
            {CTA.createAccount.label}
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ── Trust & decision support ───────────────────────────────────────── */

const VISIBLE_BEFORE = [
  { Icon: Target, title: 'Specialties', body: 'Weight management, strength, mobility, nutrition and more, in the coach’s own words.' },
  { Icon: Languages, title: 'Languages', body: 'Hindi, English, Marathi, Tamil, Punjabi… filter for a coach you can talk to easily.' },
  { Icon: MapPin, title: 'Coaching mode & city', body: 'Online, in person or hybrid, with the city for in-person sessions.' },
  { Icon: IndianRupee, title: 'Package prices in INR', body: 'Monthly or quarterly packages with what’s included, before you request anything.' },
  { Icon: CalendarCheck, title: 'Check-in cadence', body: 'How many check-in calls each package includes, and its length in days.' },
  { Icon: BadgeCheck, title: 'Verification status', body: 'Shown when a coach has completed FitPlus verification; otherwise listed as independent.' },
] as const;

const FAQ = [
  {
    q: 'How do I choose a coach?',
    a: 'Start with your goal and language, then shortlist two or three coaches. You can save coaches and compare up to three side by side, including package prices and check-in calls. Book a consultation or request coaching from the profile you like.',
  },
  {
    q: 'What’s the difference between online and in-person coaching?',
    a: 'Online coaches plan your workouts and meals and review check-ins remotely. In-person and hybrid coaches also train with you in their city. Each profile shows its mode, so you can filter for it.',
  },
  {
    q: 'Is the demo real?',
    a: 'The demo is a sandbox with sample people (Aarav, Coach Arjun and others) so you can click around safely. Its profiles, reviews, “demo verified” badges and package prices are examples. Nothing is charged and no account is created; changes stay on your device.',
  },
  {
    q: 'What happens when I click each button?',
    a: '“Find a trainer” opens the public directory, no account needed. “Try the demo” opens a sample client workspace, and “Try the coach demo” opens a sample Trainer Studio. “Create an account” and “Sign in” use your real email or Google account; after verifying your email you choose whether you’re a client or a coach.',
  },
  {
    q: 'My trainer already uses FitPlus. How do I join?',
    a: 'Ask them for their invite link. It opens a page where you review the coach and plan before you accept.',
  },
] as const;

const TrustSection: React.FC = () => (
  <section id="choosing" aria-labelledby="choosing-title" className="py-16 lg:py-24 border-t border-white/[0.07]">
    <div className="mkt-container grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <Reveal>
          <p className="mkt-eyebrow">Before you choose</p>
          <h2 id="choosing-title" className="mkt-h2 mt-3">
            Know what you’re choosing before you pay.
          </h2>
          <p className="mkt-lead mt-4 max-w-[36rem]">Every coach profile lays out the same facts, so you can compare like for like.</p>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
          {VISIBLE_BEFORE.map(({ Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={stagger(i, 0.06)} className="flex gap-3.5">
              <span className="w-10 h-10 rounded-[12px] bg-[#111114] border border-white/[0.09] text-[#FF803E] inline-flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-[#F3EEE7]">{title}</h3>
                <p className="mkt-body mt-1 text-[0.9375rem]">{body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-10 rounded-[18px] border border-[#FF803E]/25 bg-[#FF803E]/[0.06] p-5">
          <p className="text-[0.9375rem] text-[#F3EEE7]">
            <span className="font-semibold">About sample data.</span>{' '}
            <span className="text-[#ABA59D]">
              Screens on this page use sample people and numbers. In the demo, profiles, reviews, verification badges and
              package prices are examples and are labelled that way.
            </span>
          </p>
        </Reveal>
      </div>

      <div className="lg:col-span-5">
        <Reveal>
          <h2 className="mkt-h3">Questions</h2>
        </Reveal>
        <div className="mt-5 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex items-center justify-between gap-4 py-4 min-h-[56px] text-[1rem] font-medium text-[#F3EEE7] rounded-[8px]">
                {item.q}
                <Plus className="mkt-faq-icon w-5 h-5 text-[#FF803E] shrink-0" aria-hidden="true" />
              </summary>
              <p className="mkt-body pb-5 pr-8 text-[0.9375rem]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ── Final CTA ───────────────────────────────────────────────────────── */

const FinalCta: React.FC = () => (
  <section aria-labelledby="final-title" className="relative overflow-hidden border-t border-white/[0.07]">
    <div className="absolute inset-0">
      <ResponsiveImage
        image={MEDIA.trackStrength}
        alt=""
        sizes="100vw"
        className="block w-full h-full"
        imgClassName="w-full h-full object-cover object-[50%_30%] lg:object-[50%_25%] opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/80 to-[#080808]/10 md:via-[#080808]/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-[#080808]/60" />
    </div>
    <div className="mkt-container relative py-20 lg:py-28">
      <Reveal className="max-w-[40rem]">
        <h2 id="final-title" className="mkt-h2">
          Start with one good week.
        </h2>
        <p className="mkt-lead mt-4 text-[#D8D2CA]">
          Find a trainer for your goal, or see how your own clients would use FitPlus.
        </p>
        <div className="mt-8 flex flex-col min-[480px]:flex-row flex-wrap gap-3">
          <Link to={CTA.findTrainer.to} className="mkt-btn mkt-btn-primary">
            {CTA.findTrainer.label}
            <ArrowRight className="mkt-arrow w-[18px] h-[18px]" aria-hidden="true" />
          </Link>
          <Link to={CTA.coachDemo.to} className="mkt-btn mkt-btn-secondary">
            {CTA.coachDemo.label}
          </Link>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ── Page ────────────────────────────────────────────────────────────── */

export const LandingPage: React.FC = () => {
  const location = useLocation();

  // React Router doesn't scroll to hash targets; do it once the section exists.
  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    // Short delay: the mobile menu releases its scroll lock in the same tick.
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.key]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'FitPlus — Personal fitness coaching built around your real life';
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <MarketingLayout>
      <HomeHero />
      <AudiencePaths />
      <Walkthrough />
      <CoachingTracks />
      <ForTrainers />
      <TrustSection />
      <FinalCta />
    </MarketingLayout>
  );
};
