import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EASE = [0.22, 0.61, 0.36, 1] as const;

const canObserve = typeof window !== 'undefined' && 'IntersectionObserver' in window;

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article' | 'header';
  id?: string;
}

/**
 * Fades content up ~16px once when it enters the viewport.
 * If IntersectionObserver is unavailable or the visitor prefers reduced
 * motion, content renders in its final state with no animation.
 */
export const Reveal: React.FC<RevealProps> = ({ children, className, delay = 0, as = 'div', id }) => {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  if (!canObserve || reduce) {
    const Static = as;
    return (
      <Static className={className} id={id}>
        {children}
      </Static>
    );
  }
  return (
    <Tag
      id={id}
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.01, margin: '0px 0px -6% 0px' }}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
};

/** Delay helper for staggering related items by ~70ms. */
export const stagger = (index: number, step = 0.07) => index * step;
