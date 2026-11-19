import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import {
  CheckInReviewPreview,
  CoachClientsPreview,
  ProgressPreview,
  TodayPreview,
} from '../ProductPreviews';
import { CTA } from '../links';
import { Reveal } from '../Reveal';

type Audience = 'clients' | 'trainers';

const TABS: Array<{ id: Audience; label: string }> = [
  { id: 'clients', label: 'Clients' },
  { id: 'trainers', label: 'Trainers' },
];

const CONTENT = {
  clients: {
    scenario: 'You work long days, eat what’s cooked at home, and want someone who keeps the plan realistic.',
    points: [
      ['Daily plan', 'Today shows the workout, meals built from food you already eat, and a step target.'],
      ['Progress', 'Weight, completed sessions and check-ins sit on one timeline you and your coach both see.'],
      ['Coach feedback', 'Your trainer reviews each weekly check-in, replies, and adjusts next week.'],
    ],
  },
  trainers: {
    scenario: 'You coach a dozen clients over WhatsApp and spreadsheets, and Sunday nights go to rewriting plans.',
    points: [
      ['Client list', 'See every client’s plan week and completion at a glance, with missed check-ins flagged.'],
      ['Plan assignment', 'Assign a template to several clients and adjust it for one without copying it.'],
      ['Check-in review', 'Read what each client completed and reply from one review screen.'],
    ],
  },
} as const;

export const AudiencePaths: React.FC = () => {
  const [active, setActive] = useState<Audience>('clients');
  const tabRefs = useRef<Record<Audience, HTMLButtonElement | null>>({ clients: null, trainers: null });

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const idx = TABS.findIndex((t) => t.id === active);
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    const id = TABS[next].id;
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  const content = CONTENT[active];

  return (
    <section id="paths" aria-labelledby="paths-title" className="py-16 lg:py-24 border-t border-white/[0.07]">
      <div className="mkt-container">
        <Reveal className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-[40rem]">
            <p className="mkt-eyebrow">Two sides of the same plan</p>
            <h2 id="paths-title" className="mkt-h2 mt-3">
              Built for the person training and the person coaching.
            </h2>
          </div>
          <div role="tablist" aria-label="Choose your path" className="mkt-tabs self-start lg:self-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={active === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={active === t.id ? 0 : -1}
                onClick={() => setActive(t.id)}
                onKeyDown={onKeyDown}
                className="mkt-tab"
              >
                For {t.label.toLowerCase()}
              </button>
            ))}
          </div>
        </Reveal>

        {TABS.map((t) => (
          <div
            key={t.id}
            id={`panel-${t.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${t.id}`}
            hidden={active !== t.id}
            tabIndex={0}
            className="mt-10 rounded-[28px] outline-offset-4"
          >
            {active === t.id ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                <div className="lg:col-span-5">
                  <p className="text-[1.25rem] leading-snug text-[#F3EEE7] font-medium max-w-[30rem]">
                    {content.scenario}
                  </p>
                  <ul className="mt-7 space-y-5">
                    {content.points.map(([title, body]) => (
                      <li key={title} className="flex gap-3.5">
                        <span className="mt-0.5 w-6 h-6 rounded-full bg-[#FF803E]/15 text-[#FF803E] inline-flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-semibold text-[#F3EEE7]">{title}</p>
                          <p className="mkt-body mt-0.5">{body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
                    {t.id === 'clients' ? (
                      <>
                        <Link to={CTA.findTrainer.to} className="mkt-btn mkt-btn-primary">
                          {CTA.findTrainer.label}
                          <ArrowRight className="mkt-arrow w-[18px] h-[18px]" aria-hidden="true" />
                        </Link>
                        <Link to={CTA.clientDemo.to} className="mkt-btn mkt-btn-tertiary">
                          {CTA.clientDemo.label}
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link to={CTA.coachDemo.to} className="mkt-btn mkt-btn-primary">
                          {CTA.coachDemo.label}
                          <ArrowRight className="mkt-arrow w-[18px] h-[18px]" aria-hidden="true" />
                        </Link>
                        <Link to={CTA.forTrainers.to} className="mkt-btn mkt-btn-tertiary">
                          See the trainer workflow
                        </Link>
                      </>
                    )}
                  </div>
                  <p className="mt-4 mkt-small max-w-[30rem]">
                    {t.id === 'clients'
                      ? 'The directory is public, no account needed. The client demo opens Aarav’s sample workspace.'
                      : 'The coach demo opens Coach Arjun’s sample Trainer Studio. No account is created.'}
                  </p>
                </div>
                <div className="lg:col-span-7 relative">
                  {t.id === 'clients' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
                      <TodayPreview compact className="hidden md:block" />
                      <ProgressPreview className="md:mt-12" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
                      <CoachClientsPreview />
                      <CheckInReviewPreview className="hidden md:block md:mt-12" />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
};
