import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ResponsiveImage } from '../ResponsiveImage';
import { MEDIA } from '../marketingMedia';
import { TodayPreview } from '../ProductPreviews';
import { CTA } from '../links';

const MAX_TILT = 4;

function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return fine;
}

export const HomeHero: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const fine = useFinePointer();

  // Opening-scroll depth: image zooms 1 → 1.06, overlay drifts ≤ 16px.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const panelY = useTransform(scrollYProgress, [0, 1], [0, -16]);

  // Restrained perspective tilt on the product panel (fine pointers only).
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 150, damping: 20 });
  const tiltEnabled = fine && !reduce;

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tiltEnabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * MAX_TILT * 2);
    rx.set(-py * MAX_TILT * 2);
  };
  const resetTilt = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* Warm ambient light behind the hero; static, no blur animation. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_30%,rgba(255,128,62,0.10),transparent_70%)]"
      />
      <div className="mkt-container relative pt-10 pb-16 sm:pt-14 lg:pt-14 lg:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        <div className="lg:col-span-6 xl:col-span-6 lg:pr-6">
          <p className="mkt-eyebrow">Personal fitness coaching · India</p>
          <h1 id="hero-title" className="mkt-h1 mt-4">
            Personal coaching built around your real life.
          </h1>
          <p className="mkt-lead mt-6 max-w-[31rem]">
            Find an independent trainer who plans your workouts, home-cooked meals and weekly check-ins — or run your own
            coaching practice from one workspace.
          </p>
          <div className="mt-8 flex flex-col min-[480px]:flex-row min-[480px]:flex-wrap gap-3">
            <Link to={CTA.findTrainer.to} className="mkt-btn mkt-btn-primary">
              {CTA.findTrainer.label}
              <ArrowRight className="mkt-arrow w-[18px] h-[18px]" aria-hidden="true" />
            </Link>
            <Link to={CTA.forTrainers.to} className="mkt-btn mkt-btn-secondary">
              {CTA.forTrainers.label}
            </Link>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to={CTA.demo.to} className="mkt-btn mkt-btn-tertiary">
              {CTA.demo.label}
            </Link>
            <span className="mkt-small">Opens a sample client workspace. No sign-up.</span>
          </p>
        </div>

        {/* Visual: glass "Today" panel over the athlete photograph. On phones the panel comes first. */}
        <div className="lg:col-span-6 relative" onPointerMove={onPointerMove} onPointerLeave={resetTilt}>
          <div className="flex flex-col lg:block [perspective:1100px]">
            <motion.div
              style={reduce ? undefined : { y: panelY }}
              className="relative z-10 order-1 lg:absolute lg:left-[-8px] xl:left-[-40px] lg:bottom-10 w-full lg:w-[min(380px,60%)] mx-auto max-w-[440px] lg:max-w-none mkt-panel-in"
            >
              <motion.div style={tiltEnabled ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}>
                <TodayPreview glass animate />
              </motion.div>
            </motion.div>

            <div className="order-2 -mt-14 lg:mt-0 lg:ml-auto lg:w-[86%] rounded-[28px] overflow-hidden border border-white/[0.08] mkt-media aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/5] lg:max-h-[680px]">
              <motion.div style={reduce ? undefined : { scale: imageScale }} className="w-full h-full">
                <div className="w-full h-full mkt-hero-settle">
                  <ResponsiveImage
                    image={MEDIA.hero}
                    alt="Indian woman seated in a dimly lit gym, resting after a strength session"
                    sizes="(min-width: 1024px) 560px, 100vw"
                    priority
                    className="block w-full h-full"
                    imgClassName="w-full h-full object-cover object-[50%_22%] lg:object-[60%_50%]"
                  />
                </div>
              </motion.div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080808]/70 via-transparent to-[#080808]/10"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
