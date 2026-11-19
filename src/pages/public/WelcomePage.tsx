import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ArrowRight } from 'lucide-react';
import { MarketingLayout } from '../../components/marketing/MarketingLayout';
import {
  AssignPlanPreview,
  CheckInReviewPreview,
  DirectoryPreview,
  ProgressPreview,
  TodayPreview,
} from '../../components/marketing/ProductPreviews';
import { Reveal, stagger } from '../../components/marketing/Reveal';
import { CTA } from '../../components/marketing/links';
import { Breadcrumb } from '../../components/marketing/Breadcrumb';

const CLIENT_STEPS = [
  {
    title: 'Find a coach',
    body: 'Search the public directory by goal, city or name. Each profile shows languages, coaching mode and INR packages. Save coaches and compare up to three side by side.',
  },
  {
    title: 'Request coaching or book a consultation',
    body: 'Sign in with a client account to request coaching, book a consultation slot, or enrol in a package priced in INR.',
  },
  {
    title: 'Follow Today',
    body: 'Your coach assigns workouts, meals and habits. Today shows what’s due and you tick items off as you go.',
  },
  {
    title: 'Check in every week',
    body: 'Send a short weekly check-in. Your coach reviews it with your logged sessions and adjusts next week.',
  },
];

const TRAINER_STEPS = [
  {
    title: 'Create an account and choose “coach”',
    body: 'Sign up with Google or email, verify your email, then pick “I’m here to coach” to start your studio profile.',
  },
  {
    title: 'Publish your profile and packages',
    body: 'Add specialties, languages, city and coaching mode, and set monthly or quarterly packages in INR.',
  },
  {
    title: 'Assign plans',
    body: 'Build workout and nutrition templates, optionally starting from an AI-assisted draft, and assign them with per-client changes.',
  },
  {
    title: 'Review check-ins',
    body: 'See what each client completed, read their weekly check-in and reply from one place.',
  },
];

const DESTINATIONS = [
  { cta: CTA.findTrainer, opens: 'Public coach directory', mode: 'Public · no account needed' },
  { cta: CTA.clientDemo, opens: 'A sample client workspace', mode: 'Sample data · no account, nothing charged' },
  { cta: CTA.coachDemo, opens: 'A sample Trainer Studio', mode: 'Sample data · no account, nothing charged' },
  { cta: CTA.createAccount, opens: 'Account creation (Google or email)', mode: 'Live account · email verification required' },
  { cta: CTA.signIn, opens: 'Sign in to an existing account', mode: 'Live account' },
] as const;

const StepList: React.FC<{ steps: typeof CLIENT_STEPS }> = ({ steps }) => (
  <ol className="space-y-7">
    {steps.map((s, i) => (
      <Reveal as="li" key={s.title} delay={stagger(i)} className="flex gap-4">
        <span
          className="w-9 h-9 rounded-full border border-[#FF803E]/40 text-[#FF803E] text-[0.9375rem] font-semibold inline-flex items-center justify-center shrink-0 tabular-nums"
          aria-hidden="true"
        >
          {i + 1}
        </span>
        <div>
          <h3 className="text-[1.125rem] font-semibold text-[#F3EEE7]">
            <span className="sr-only">Step {i + 1}: </span>
            {s.title}
          </h3>
          <p className="mkt-body mt-1">{s.body}</p>
        </div>
      </Reveal>
    ))}
  </ol>
);

export const WelcomePage: React.FC = () => {
  useDocumentTitle('FitPlus | How It Works');

  return (
    <MarketingLayout>
      <div className="mkt-container pt-6">
        <Breadcrumb items={[{ label: 'How It Works' }]} />
      </div>
      <section aria-labelledby="hiw-title" className="mkt-container pt-6 pb-12 lg:pt-10 lg:pb-16">
        <p className="mkt-eyebrow">How it works</p>
        <h1 id="hiw-title" className="mkt-h1 mt-4 max-w-[16ch]">
          One plan, shared by you and your coach.
        </h1>
        <p className="mkt-lead mt-6 max-w-[38rem]">
          Clients follow a daily plan and check in weekly. Trainers assign plans and review those check-ins. Here’s each
          side, step by step, and exactly where every button takes you.
        </p>
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-3">
          <a href="#clients" className="mkt-btn mkt-btn-secondary mkt-btn-sm">
            For clients
          </a>
          <a href="#trainers" className="mkt-btn mkt-btn-secondary mkt-btn-sm">
            For trainers
          </a>
          <a href="#buttons" className="mkt-btn mkt-btn-secondary mkt-btn-sm">
            Where each button goes
          </a>
        </nav>
      </section>

      <section id="clients" aria-labelledby="clients-title" className="py-16 lg:py-20 border-t border-white/[0.07]">
        <div className="mkt-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="mkt-eyebrow">For clients</p>
              <h2 id="clients-title" className="mkt-h2 mt-3">
                Get coached on a plan that fits your week.
              </h2>
            </Reveal>
            <div className="mt-8">
              <StepList steps={CLIENT_STEPS} />
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Link to={CTA.findTrainer.to} className="mkt-btn mkt-btn-primary">
                {CTA.findTrainer.label}
                <ArrowRight className="mkt-arrow w-[18px] h-[18px]" aria-hidden="true" />
              </Link>
              <Link to={CTA.clientDemo.to} className="mkt-btn mkt-btn-tertiary">
                {CTA.clientDemo.label}
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <DirectoryPreview />
            <TodayPreview className="md:mt-16" />
            <ProgressPreview className="md:col-start-2" />
          </div>
        </div>
      </section>

      <section
        id="trainers"
        aria-labelledby="trainers-hiw-title"
        className="py-16 lg:py-20 border-t border-white/[0.07] bg-[#0B0B0C]"
      >
        <div className="mkt-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="mkt-eyebrow">For trainers</p>
              <h2 id="trainers-hiw-title" className="mkt-h2 mt-3">
                Run every client from one Trainer Studio.
              </h2>
            </Reveal>
            <div className="mt-8">
              <StepList steps={TRAINER_STEPS} />
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Link to={CTA.coachDemo.to} className="mkt-btn mkt-btn-primary">
                {CTA.coachDemo.label}
                <ArrowRight className="mkt-arrow w-[18px] h-[18px]" aria-hidden="true" />
              </Link>
              <Link to={CTA.createAccount.to} className="mkt-btn mkt-btn-tertiary">
                {CTA.createAccount.label}
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <AssignPlanPreview />
            <CheckInReviewPreview className="md:mt-16" />
          </div>
        </div>
      </section>

      <section id="buttons" aria-labelledby="buttons-title" className="py-16 lg:py-20 border-t border-white/[0.07]">
        <div className="mkt-container">
          <Reveal className="max-w-[40rem]">
            <h2 id="buttons-title" className="mkt-h2">
              Where each button goes.
            </h2>
            <p className="mkt-lead mt-4">
              Demo buttons open a sandbox with sample people and data on your device. Account buttons use your real
              email or Google account.
            </p>
          </Reveal>
          <div className="mt-10 rounded-[22px] mkt-matte overflow-hidden">
            <table className="w-full text-left">
              <caption className="sr-only">Button destinations and whether they use live or sample data</caption>
              <thead className="hidden md:table-header-group">
                <tr className="text-[0.8125rem] text-[#ABA59D] border-b border-white/[0.08]">
                  <th scope="col" className="px-6 py-3 font-medium">Button</th>
                  <th scope="col" className="px-6 py-3 font-medium">Opens</th>
                  <th scope="col" className="px-6 py-3 font-medium">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {DESTINATIONS.map((d) => (
                  <tr key={d.cta.label} className="flex flex-col md:table-row px-5 py-4 md:p-0">
                    <th scope="row" className="md:px-6 md:py-4 font-normal">
                      <Link
                        to={d.cta.to}
                        className="inline-flex items-center gap-1.5 min-h-[40px] font-semibold text-[#F3EEE7] hover:text-[#FF803E] transition-colors"
                      >
                        {d.cta.label}
                        <ArrowRight className="w-4 h-4 text-[#FF803E]" aria-hidden="true" />
                      </Link>
                    </th>
                    <td className="md:px-6 md:py-4 text-[0.9375rem] text-[#F3EEE7]">{d.opens}</td>
                    <td className="md:px-6 md:py-4 text-[0.875rem] text-[#ABA59D]">{d.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 mkt-small">
            Have an invite link from a trainer? Open it to review the coach and plan before you accept.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
};
