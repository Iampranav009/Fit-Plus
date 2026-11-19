/**
 * Faithful, static recreations of real FitPlus screens (Client "Today", the
 * coach directory, progress + weekly check-in, and Trainer Studio views).
 * Every preview uses the same sample people that ship in the demo sandbox
 * (Aarav, Coach Arjun, Rohan, Priya…) and is clearly labelled as sample data.
 * Pure HTML/CSS — readable in a static screenshot, no animation required.
 */
import React from 'react';
import {
  Check,
  ChevronRight,
  Dumbbell,
  Footprints,
  MessageSquareText,
  Search,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { getAssetSrc } from '../../lib/assets';
import { MEDIA } from './marketingMedia';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ── Frame ──────────────────────────────────────────────────────────── */

interface FrameProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  glass?: boolean;
  className?: string;
  /** Shown in the top-right corner. */
  badge?: string;
}

export const PreviewFrame: React.FC<FrameProps> = ({
  title,
  subtitle,
  children,
  glass = false,
  className,
  badge = 'Sample data',
}) => (
  <figure
    className={cx(
      '@container rounded-[22px] p-4 sm:p-5 text-left',
      glass ? 'mkt-glass' : 'mkt-matte shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]',
      className,
    )}
  >
    <figcaption className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <p className="text-[1.0625rem] font-semibold leading-tight text-[#F3EEE7]">{title}</p>
        {subtitle ? <p className="mt-0.5 text-[0.8125rem] text-[#ABA59D] truncate">{subtitle}</p> : null}
      </div>
      <span className="mkt-chip mkt-chip-sample shrink-0">{badge}</span>
    </figcaption>
    {children}
  </figure>
);

const Avatar: React.FC<{ asset?: string; initials?: string; size?: number }> = ({
  asset,
  initials,
  size = 32,
}) =>
  asset ? (
    <img
      src={getAssetSrc(asset)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="rounded-full object-cover shrink-0 bg-[#1E1E23]"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="rounded-full shrink-0 bg-[#26262C] text-[#F3EEE7] text-[0.75rem] font-semibold inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );

const Done: React.FC<{ animate?: boolean }> = ({ animate }) => (
  <span
    className={cx(
      'w-6 h-6 rounded-full bg-[#FF803E] text-[#0B0B0B] inline-flex items-center justify-center shrink-0',
      animate && 'mkt-check-pop',
    )}
    aria-label="Completed"
    role="img"
  >
    <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
  </span>
);

const Todo: React.FC = () => (
  <span
    className="w-6 h-6 rounded-full border-2 border-white/25 shrink-0"
    aria-label="Not done yet"
    role="img"
  />
);

const Bar: React.FC<{ value: number; animate?: boolean; tone?: 'accent' | 'success'; label?: string }> = ({
  value,
  animate,
  tone = 'accent',
  label = 'Progress',
}) => (
  <div
    className="h-1.5 rounded-full bg-white/10 overflow-hidden"
    role="progressbar"
    aria-label={label}
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className={cx('h-full rounded-full', animate && 'mkt-fill', tone === 'success' ? 'bg-[#B8E66C]' : 'bg-[#FF803E]')}
      style={{ width: `${value}%` }}
    />
  </div>
);

/* ── Client: Today ──────────────────────────────────────────────────── */

export const TodayPreview: React.FC<{ glass?: boolean; animate?: boolean; className?: string; compact?: boolean }> = ({
  glass,
  animate,
  className,
  compact,
}) => (
  <PreviewFrame title="Today" subtitle="Aarav · Week 3 of Lean Strength" glass={glass} className={className}>
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1">
        <div className="flex items-baseline justify-between text-[0.8125rem] mb-1.5">
          <span className="text-[#F3EEE7] font-medium">2 of 3 done</span>
          <span className="text-[#ABA59D]">12-day streak</span>
        </div>
        <Bar value={66} animate={animate} label="Today’s plan completed" />
      </div>
    </div>

    <ul className="space-y-2">
      <li className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-3">
        <span className="w-9 h-9 rounded-[10px] bg-[#FF803E]/12 text-[#FF803E] inline-flex items-center justify-center shrink-0">
          <Dumbbell className="w-[18px] h-[18px]" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.875rem] font-medium text-[#F3EEE7] truncate">Upper body strength A</p>
          <p className="text-[0.75rem] text-[#ABA59D]">Workout · 5 exercises · 45 min</p>
        </div>
        <Done animate={animate} />
      </li>
      <li className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-3">
        <img
          src={MEDIA.meal.src}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="w-9 h-9 rounded-[10px] object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[0.875rem] font-medium text-[#F3EEE7] truncate">2 rotis, tadka dal &amp; sabzi</p>
          <p className="text-[0.75rem] text-[#ABA59D]">
            <Utensils className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden="true" />
            Lunch · about 24 g protein
          </p>
        </div>
        <Done animate={animate} />
      </li>
      {!compact ? (
        <li className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] border border-white/[0.06] p-3">
          <span className="w-9 h-9 rounded-[10px] bg-white/[0.06] text-[#F3EEE7] inline-flex items-center justify-center shrink-0">
            <Footprints className="w-[18px] h-[18px]" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[0.875rem] font-medium text-[#F3EEE7]">8,000 steps</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1">
                <Bar value={65} animate={animate} tone="success" label="Steps toward 8,000" />
              </div>
              <span className="text-[0.75rem] text-[#ABA59D] tabular-nums">5,240</span>
            </div>
          </div>
          <Todo />
        </li>
      ) : null}
    </ul>

    <div className="mt-3 rounded-[14px] border border-[#FF803E]/25 bg-[#FF803E]/[0.07] p-3 flex gap-3">
      <Avatar asset="coachArjun" size={32} />
      <div className="min-w-0">
        <p className="text-[0.75rem] font-semibold text-[#FFC08F]">Coach Arjun · check-in reply</p>
        <p className="mt-0.5 text-[0.8125rem] text-[#F3EEE7] leading-snug">
          Strong week. Add 2.5 kg to rows on Thursday and keep dinner protein the same.
        </p>
      </div>
    </div>
  </PreviewFrame>
);

/* ── Client: directory search ───────────────────────────────────────── */

const DIRECTORY_ROWS = [
  {
    name: 'Arjun Kulkarni',
    asset: 'coachArjun',
    meta: 'Mumbai · Online + in person',
    langs: 'English, Hindi, Marathi',
    focus: 'Strength · Weight management',
    price: '₹499',
  },
  {
    name: 'Meera Subramanian',
    asset: 'coachMeera',
    meta: 'Bengaluru · Online',
    langs: 'English, Tamil, Hindi',
    focus: 'Muscle & strength · Mobility',
    price: '₹1,999',
  },
];

export const DirectoryPreview: React.FC<{ className?: string; highlight?: boolean }> = ({ className, highlight }) => (
  <PreviewFrame title="Find a trainer" subtitle="Directory · searched for “strength”" className={className} badge="Example profiles">
    <div className="flex items-center gap-2 rounded-full bg-[#080808] border border-white/[0.14] px-3.5 min-h-[40px] text-[0.8125rem] text-[#ABA59D]">
      <Search className="w-4 h-4" aria-hidden="true" />
      strength
    </div>
    <ul className="mt-3 space-y-2">
      {DIRECTORY_ROWS.map((row, i) => (
        <li
          key={row.name}
          className={cx(
            'rounded-[14px] border p-3 flex gap-3',
            highlight && i === 0 ? 'border-[#FF803E]/50 bg-[#FF803E]/[0.06]' : 'border-white/[0.07] bg-white/[0.03]',
          )}
        >
          <Avatar asset={row.asset} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[0.875rem] font-semibold text-[#F3EEE7] truncate">{row.name}</p>
              <p className="text-[0.8125rem] text-[#F3EEE7] tabular-nums shrink-0">
                <span className="text-[#ABA59D]">from </span>
                {row.price}
                <span className="text-[#ABA59D]">/mo</span>
              </p>
            </div>
            <p className="text-[0.75rem] text-[#ABA59D] truncate">{row.meta}</p>
            <p className="mt-1 text-[0.75rem] text-[#ABA59D] truncate">
              {row.focus} · {row.langs}
            </p>
          </div>
        </li>
      ))}
    </ul>
    <div className="mt-3 flex items-center justify-between text-[0.8125rem]">
      <span className="text-[#ABA59D]">Weekly check-ins · 2 calls/month</span>
      <span className="inline-flex items-center gap-1 font-semibold text-[#FF803E]">
        Request coaching <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </span>
    </div>
  </PreviewFrame>
);

/* ── Client: progress + weekly check-in ─────────────────────────────── */

const WEIGHTS = [82.0, 81.4, 80.9, 80.6, 79.8, 79.4, 79.0, 78.4];

const Sparkline: React.FC<{ animate?: boolean }> = ({ animate }) => {
  const w = 260;
  const h = 70;
  const min = 77.5;
  const max = 82.5;
  const pts = WEIGHTS.map((v, i) => [(i / (WEIGHTS.length - 1)) * w, h - ((v - min) / (max - min)) * h]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[70px]" role="img" aria-label="Body weight trend from 82.0 kg to 78.4 kg over 8 weeks">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="rgba(255,128,62,0.10)" />
      <path
        d={d}
        fill="none"
        stroke="#FF803E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={animate ? { strokeDasharray: 1, strokeDashoffset: 1, animation: 'mkt-draw 1100ms cubic-bezier(.22,.61,.36,1) 150ms forwards' } : undefined}
      />
      <circle cx={pts[pts.length - 1][0] - 3} cy={pts[pts.length - 1][1]} r="4" fill="#FF803E" />
    </svg>
  );
};

export const ProgressPreview: React.FC<{ className?: string; animate?: boolean }> = ({ className, animate }) => (
  <PreviewFrame title="Weekly check-in" subtitle="Aarav → Coach Arjun · Week 8" className={className}>
    <div className="grid grid-cols-3 gap-2 mb-3">
      {[
        ['78.4 kg', 'Weight', '−0.6'],
        ['3 of 4', 'Sessions', ''],
        ['7.2 h', 'Avg sleep', ''],
      ].map(([v, l, d]) => (
        <div key={l} className="rounded-[12px] bg-white/[0.04] border border-white/[0.06] p-2.5">
          <p className="text-[0.9375rem] font-semibold text-[#F3EEE7] tabular-nums">
            {v} {d ? <span className="text-[0.75rem] text-[#B8E66C]">{d}</span> : null}
          </p>
          <p className="text-[0.6875rem] text-[#ABA59D]">{l}</p>
        </div>
      ))}
    </div>
    <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.06] px-3 pt-2.5 pb-1">
      <p className="text-[0.75rem] text-[#ABA59D]">Body weight · 8 weeks</p>
      <Sparkline animate={animate} />
    </div>
    <div className="mt-3 rounded-[14px] border border-white/[0.07] p-3 flex gap-3 items-start">
      <Avatar asset="coachArjun" size={30} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.75rem] font-semibold text-[#F3EEE7]">Coach Arjun</p>
          <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#B8E66C]">
            <Done animate={animate} /> Reviewed
          </span>
        </div>
        <p className="mt-1 text-[0.8125rem] text-[#ABA59D] leading-snug">
          Travel week handled well. Next week: same split, one extra 20-minute walk after dinner.
        </p>
      </div>
    </div>
  </PreviewFrame>
);

/* ── Trainer: client list ───────────────────────────────────────────── */

const CLIENT_ROWS = [
  { name: 'Aarav Sharma', initials: 'AS', plan: 'Lean Strength · Wk 3', pct: 86, status: 'Check-in ready', tone: 'accent' },
  { name: 'Priya Nair', initials: 'PN', plan: 'RDL strength · Wk 6', pct: 92, status: 'On track', tone: 'ok' },
  { name: 'Rohan Deshmukh', initials: 'RD', plan: '3-day home · Wk 2', pct: 40, status: 'Missed 2 check-ins', tone: 'warn' },
  { name: 'Sneha Reddy', initials: 'SR', plan: 'Plant protein · Wk 9', pct: 78, status: 'Renews in 4 days', tone: 'muted' },
] as const;

const toneClass: Record<string, string> = {
  accent: 'text-[#FFC08F] bg-[#FF803E]/12 border-[#FF803E]/30',
  ok: 'text-[#B8E66C] bg-[#B8E66C]/10 border-[#B8E66C]/25',
  warn: 'text-[#F5C25C] bg-[#F5C25C]/10 border-[#F5C25C]/25',
  muted: 'text-[#ABA59D] bg-white/[0.04] border-white/10',
};

export const CoachClientsPreview: React.FC<{ className?: string; rows?: number; glass?: boolean }> = ({
  className,
  rows = 4,
  glass,
}) => (
  <PreviewFrame title="Clients" subtitle="Trainer Studio · this week's completion" className={className} glass={glass}>
    <ul className="divide-y divide-white/[0.07]">
      {CLIENT_ROWS.slice(0, rows).map((c) => (
        <li key={c.name} className="py-2.5 flex items-center gap-3">
          <Avatar initials={c.initials} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.875rem] font-medium text-[#F3EEE7] truncate">{c.name}</p>
            <p className="text-[0.75rem] text-[#ABA59D] truncate">
              {c.plan} <span className="@[420px]:hidden">· {c.pct}% done</span>
            </p>
          </div>
          <div className="hidden @[420px]:block w-16">
            <p className="text-[0.75rem] text-[#F3EEE7] tabular-nums text-right mb-1">{c.pct}%</p>
            <Bar value={c.pct} tone={c.pct >= 75 ? 'success' : 'accent'} label={`${c.name} weekly completion`} />
          </div>
          <span className={cx('mkt-chip shrink-0 !text-[0.6875rem]', toneClass[c.tone])}>{c.status}</span>
        </li>
      ))}
    </ul>
  </PreviewFrame>
);

/* ── Trainer: assign a plan ─────────────────────────────────────────── */

export const AssignPlanPreview: React.FC<{ className?: string; showAi?: boolean }> = ({ className, showAi = true }) => (
  <PreviewFrame title="Assign plan" subtitle="Template → 3 clients, one adjusted" className={className}>
    <div className="rounded-[14px] bg-white/[0.04] border border-white/[0.07] p-3">
      <p className="text-[0.75rem] text-[#ABA59D]">Template</p>
      <p className="text-[0.9375rem] font-semibold text-[#F3EEE7]">4-day lean strength &amp; conditioning</p>
      <p className="mt-1 text-[0.75rem] text-[#ABA59D]">4 sessions/week · Indian vegetarian meal guide attached</p>
    </div>
    <ul className="mt-2 space-y-1.5">
      {[
        ['Aarav Sharma', 'As template'],
        ['Priya Nair', 'As template'],
        ['Rohan Deshmukh', 'Back squat → goblet squat (knee)'],
      ].map(([n, note], i) => (
        <li key={n} className="flex items-center gap-3 rounded-[12px] px-3 py-2 bg-white/[0.02] border border-white/[0.05]">
          <span className="w-5 h-5 rounded-[6px] bg-[#FF803E] text-[#0B0B0B] inline-flex items-center justify-center shrink-0" aria-hidden="true">
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
          <span className="text-[0.8125rem] text-[#F3EEE7] flex-1 truncate">{n}</span>
          <span className={cx('text-[0.75rem] truncate max-w-[55%]', i === 2 ? 'text-[#FFC08F]' : 'text-[#8E8880]')}>
            {note}
          </span>
        </li>
      ))}
    </ul>
    {showAi ? (
      <div className="mt-3 rounded-[14px] border border-dashed border-white/20 p-3 flex gap-2.5">
        <Sparkles className="w-4 h-4 text-[#FFC08F] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[0.8125rem] text-[#ABA59D] leading-snug">
          <span className="text-[#F3EEE7] font-medium">AI draft:</span> week 4 progression suggested. You review and edit
          before anything reaches a client.
        </p>
      </div>
    ) : null}
  </PreviewFrame>
);

/* ── Trainer: check-in review ───────────────────────────────────────── */

export const CheckInReviewPreview: React.FC<{ className?: string; animate?: boolean }> = ({ className, animate }) => (
  <PreviewFrame title="Check-in review" subtitle="Aarav Sharma · submitted this morning" className={className}>
    <div className="grid grid-cols-2 gap-2">
      {[
        ['Completed', '3 of 4 sessions'],
        ['Weight', '78.4 kg (−0.6)'],
        ['Energy', '4 / 5'],
        ['Meals logged', '18 of 21'],
      ].map(([l, v]) => (
        <div key={l} className="rounded-[12px] bg-white/[0.04] border border-white/[0.06] p-2.5">
          <p className="text-[0.6875rem] text-[#ABA59D]">{l}</p>
          <p className="text-[0.8125rem] font-semibold text-[#F3EEE7] tabular-nums">{v}</p>
        </div>
      ))}
    </div>
    <p className="mt-3 text-[0.8125rem] text-[#ABA59D] leading-snug">
      <MessageSquareText className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
      “Pune trip midweek, missed Friday. Knees feel fine.”
    </p>
    <div className="mt-3 flex items-center gap-2">
      <div className="flex-1 min-h-[40px] rounded-full bg-[#080808] border border-white/[0.14] px-3.5 flex items-center text-[0.8125rem] text-[#8E8880] truncate">
        Reply to Aarav…
      </div>
      <span className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full bg-[#FF803E] text-[#0B0B0B] text-[0.8125rem] font-semibold">
        {animate ? <Check className="w-4 h-4 mkt-check-pop" strokeWidth={3} aria-hidden="true" /> : null}
        Mark reviewed
      </span>
    </div>
  </PreviewFrame>
);
