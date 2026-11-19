import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DirectoryPreview, ProgressPreview, TodayPreview } from '../ProductPreviews';
import { Reveal } from '../Reveal';

const STEPS = [
  {
    key: 'find',
    label: 'Find or connect',
    title: 'Find a coach, or connect with yours.',
    body:
      'Filter the directory by goal, city, language and online or in-person coaching, then compare INR packages. Already working with a trainer? Join from their invite link.',
    state: 'Directory filtered to strength coaches who speak Hindi.',
  },
  {
    key: 'follow',
    label: 'Follow the plan',
    title: 'Open Today and follow the plan.',
    body:
      'Each day shows the workout, meals and habits your coach assigned. Tick them off as you go; your coach sees what you completed.',
    state: 'Workout and lunch done, steps still in progress.',
  },
  {
    key: 'review',
    label: 'Review together',
    title: 'Review progress together every week.',
    body:
      'Send a short weekly check-in. Your coach reviews it alongside your logged sessions, replies, and adjusts next week’s plan.',
    state: 'Week 8 check-in reviewed, with a note for next week.',
  },
] as const;

const Frame: React.FC<{ index: number; animate?: boolean }> = ({ index, animate }) => {
  if (index === 0) return <DirectoryPreview highlight />;
  if (index === 1) return <TodayPreview animate={animate} />;
  return <ProgressPreview animate={animate} />;
};

export const Walkthrough: React.FC = () => {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  // The step whose text crosses the middle of the viewport drives the sticky frame.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.step);
            setActive(idx);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      aria-labelledby="walkthrough-title"
      className="py-16 lg:py-24 border-t border-white/[0.07] bg-[#0B0B0C]"
    >
      <div className="mkt-container">
        <Reveal className="max-w-[44rem]">
          <p className="mkt-eyebrow">How coaching works</p>
          <h2 id="walkthrough-title" className="mkt-h2 mt-3">
            Three steps, one shared plan.
          </h2>
          <p className="mkt-lead mt-4">
            Coach and client work from the same screens, so nothing gets lost between WhatsApp, a PDF and a spreadsheet.
          </p>
        </Reveal>

        <div className="mt-12 lg:mt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-16">
          <ol className="relative">
            {STEPS.map((step, i) => (
              <li
                key={step.key}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-step={i}
                aria-current={active === i ? 'step' : undefined}
                className="py-8 lg:py-0 lg:min-h-[72vh] lg:flex lg:flex-col lg:justify-center border-t border-white/[0.07] first:border-t-0 lg:border-t-0"
              >
                <div
                  className={`border-l-2 pl-5 transition-colors duration-300 ${
                    active === i ? 'border-[#FF803E]' : 'border-white/10 lg:[&_h3]:!text-[#ABA59D] lg:[&_.mkt-body]:!text-[#8E8880]'
                  }`}
                >
                  <p className="text-[0.8125rem] font-semibold text-[#FF803E]">
                    Step {i + 1} of 3 · {step.label}
                  </p>
                  <h3 className="mkt-h3 mt-2 transition-colors duration-300">{step.title}</h3>
                  <p className="mkt-body mt-3 max-w-[30rem] transition-colors duration-300">{step.body}</p>
                </div>
                {/* Phones/tablets: each step keeps its own screen, in normal document flow. */}
                <div className="mt-6 lg:hidden max-w-[460px]">
                  <Frame index={i} />
                  <p className="mt-2 mkt-small">{step.state}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Desktop: one sticky product frame that crossfades between step states. */}
          <div className="hidden lg:block">
            <div className="sticky top-[calc(var(--mk-header-h)+48px)] py-10">
              <div className="flex items-center gap-2 mb-4" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <span key={s.key} className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <span
                      className="block h-full bg-[#FF803E] origin-left transition-transform duration-500"
                      style={{ transform: `scaleX(${i <= active ? 1 : 0})` }}
                    />
                  </span>
                ))}
              </div>
              <p className="text-[0.875rem] text-[#F3EEE7] mb-4" aria-live="polite">
                <span className="text-[#ABA59D]">Showing step {active + 1}:</span> {STEPS[active].state}
              </p>
              <div className="relative min-h-[520px] max-w-[480px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={active}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, scale: [0.97, 1.02, 1] }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1 }}
                    transition={{ duration: reduce ? 0.15 : 0.55, ease: [0.22, 0.61, 0.36, 1] }}
                    className="absolute inset-x-0 top-0"
                  >
                    <Frame index={active} animate={!reduce} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
