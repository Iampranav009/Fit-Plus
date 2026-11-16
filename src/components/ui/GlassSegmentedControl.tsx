import React, { useId } from 'react';
import { motion } from 'motion/react';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface GlassSegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  tone?: 'accent' | 'neutral';
  className?: string;
}

export function GlassSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  tone = 'accent',
  className = '',
}: GlassSegmentedControlProps<T>) {
  const layoutGroupId = useId();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`glass-control inline-flex items-center rounded-[14px] p-1 gap-1 ${className}`}
    >
      {options.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative rounded-[10px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              size === 'sm' ? 'min-h-[38px] px-3 text-[13px]' : 'min-h-[44px] px-4 text-[14px]'
            } ${
              active
                ? tone === 'accent'
                  ? 'text-[#101218] font-semibold'
                  : 'text-[#F5F5F7] font-semibold'
                : 'text-[#A2A8B5] hover:text-[#F5F5F7]'
            }`}
          >
            {active ? (
              <motion.span
                layoutId={`seg_${layoutGroupId}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className={`absolute inset-0 rounded-[10px] ${
                  tone === 'accent'
                    ? 'bg-[#FF803E] shadow-[0_4px_14px_-4px_rgba(255,128,62,0.55)]'
                    : 'bg-[#252A35] border border-white/12'
                }`}
                aria-hidden="true"
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
