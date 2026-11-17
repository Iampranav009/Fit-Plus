import React, { useEffect, useState } from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  subtitle?: string;
  accentColor?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtitle,
  accentColor = '#F5F5F7',
  icon,
  className = '',
}) => {
  const numericTarget = typeof value === 'number' ? value : null;
  const [displayNum, setDisplayNum] = useState<number>(numericTarget ?? 0);

  useEffect(() => {
    if (numericTarget === null) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplayNum(numericTarget);
      return;
    }

    const start = displayNum;
    const delta = numericTarget - start;
    if (delta === 0) return;

    const duration = 480;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayNum(
        Number.isInteger(numericTarget)
          ? Math.round(start + delta * eased)
          : Number((start + delta * eased).toFixed(1)),
      );
      if (t < 1) rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericTarget]);

  return (
    <div
      className={`surface-card rounded-[20px] p-4 sm:p-5 flex flex-col justify-between gap-2.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-[#7C8393] uppercase tracking-[0.06em]">
          {label}
        </p>
        {icon ? (
          <span className="shrink-0 opacity-70">{icon}</span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span
          className="text-[28px] sm:text-[32px] font-bold tracking-[-0.03em] leading-none"
          style={{ color: accentColor }}
        >
          {numericTarget !== null ? displayNum : value}
        </span>
        {unit ? (
          <span className="text-[13px] font-medium text-[#A2A8B5]">{unit}</span>
        ) : null}
      </div>

      {subtitle ? (
        <p className="text-[11.5px] text-[#7C8393] leading-snug">{subtitle}</p>
      ) : null}
    </div>
  );
};
