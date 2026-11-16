import React from 'react';
import { motion } from 'motion/react';

export interface RingMetric {
  label: string;
  percent: number;
  color: string;
  trackColor?: string;
}

interface ActivityRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  rings?: RingMetric[];
  centerValue?: string;
  centerCaption?: string;
}

export const ActivityRing: React.FC<ActivityRingProps> = ({
  percent,
  size = 128,
  strokeWidth = 10,
  label,
  rings,
  centerValue,
  centerCaption,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const activeColor = clamped >= 100 ? '#B8E66C' : '#FF803E';

  const ringList: RingMetric[] =
    rings && rings.length > 0
      ? rings
      : [
          {
            label: 'Daily commitments',
            percent: clamped,
            color: activeColor,
          },
        ];

  const gap = 4;
  const ringThickness = ringList.length > 1 ? Math.max(7, strokeWidth - (ringList.length - 1)) : strokeWidth;

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${clamped}% complete`}
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        {ringList.map((ring, idx) => {
          const r = (size - ringThickness) / 2 - idx * (ringThickness + gap);
          if (r <= 8) return null;
          const circumference = 2 * Math.PI * r;
          const pct = Math.max(0, Math.min(100, Math.round(ring.percent)));
          const targetOffset = circumference - (pct / 100) * circumference;

          return (
            <g key={ring.label}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ring.trackColor || 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={ringThickness}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={ringThickness}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: targetOffset }}
                transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
                style={{
                  filter: `drop-shadow(0 0 6px ${ring.color}40)`,
                }}
              />
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
        <span
          className={`font-semibold leading-none tracking-[-0.025em] text-[#F5F5F7] tabular-nums ${
            size >= 120 ? 'text-[24px]' : 'text-[20px]'
          }`}
        >
          {centerValue ?? `${clamped}%`}
        </span>
        {centerCaption ? (
          <span className="mt-1 text-[10px] font-medium text-[#A2A8B5] leading-none">
            {centerCaption}
          </span>
        ) : null}
      </div>
    </div>
  );
};
