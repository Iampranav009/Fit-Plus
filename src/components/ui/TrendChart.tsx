import React, { useId, useMemo, useState } from 'react';
import { formatIndiaDate } from '../../lib/date';
import { GlassSegmentedControl } from './GlassSegmentedControl';

export interface ChartPoint {
  id: string;
  dateKey: string;
  value: number;
  note?: string;
}

interface TrendChartProps {
  title: string;
  unit: string;
  points: ChartPoint[];
  accentColor?: string;
  emptyMessage?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  unit,
  points,
  accentColor = '#FF803E',
  emptyMessage = 'Add a sample progress entry to see your trend.',
}) => {
  const gradId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(points[points.length - 1]?.id ?? null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [points],
  );

  const selectedPoint =
    sorted.find((p) => p.id === selectedId) ?? sorted[sorted.length - 1];

  const width = 560;
  const height = 216;
  const padLeft = 46;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 34;

  const { minY, maxY, coords } = useMemo(() => {
    if (sorted.length === 0) return { minY: 0, maxY: 100, coords: [] };
    const vals = sorted.map((p) => p.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const span = Math.max(2, rawMax - rawMin);
    const lo = Math.floor(rawMin - span * 0.2);
    const hi = Math.ceil(rawMax + span * 0.2);

    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const pts = sorted.map((p, idx) => {
      const x =
        sorted.length === 1
          ? padLeft + innerW / 2
          : padLeft + (idx / (sorted.length - 1)) * innerW;
      const y = padTop + ((hi - p.value) / Math.max(1, hi - lo)) * innerH;
      return { ...p, x, y };
    });

    return { minY: lo, maxY: hi, coords: pts };
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <div className="surface-card rounded-[22px] p-6 text-[14px] text-[#A2A8B5]">
        {emptyMessage}
      </div>
    );
  }

  const midY = Math.round(((minY + maxY) / 2) * 10) / 10;
  const baselineY = height - padBottom;
  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `M ${coords[0].x} ${baselineY} ` +
        coords.map((c) => `L ${c.x} ${c.y}`).join(' ') +
        ` L ${coords[coords.length - 1].x} ${baselineY} Z`
      : '';

  return (
    <div className="surface-card rounded-[22px] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[18px] font-semibold text-[#F5F5F7]">{title}</h3>
          {selectedPoint ? (
            <p className="mt-0.5 text-[13px] text-[#A2A8B5] tabular-nums">
              {formatIndiaDate(selectedPoint.dateKey, 'short')} ·{' '}
              <span className="text-[#F5F5F7] font-semibold">
                {selectedPoint.value} {unit}
              </span>
              {selectedPoint.note ? ` · ${selectedPoint.note}` : ''}
            </p>
          ) : null}
        </div>

        <GlassSegmentedControl
          ariaLabel="Trend display mode"
          size="sm"
          tone="neutral"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: 'chart', label: 'Chart' },
            { id: 'table', label: 'Values' },
          ]}
        />
      </div>

      {viewMode === 'chart' ? (
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            role="img"
            aria-label={`${title} trend in ${unit}`}
          >
            <defs>
              <linearGradient id={`area_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.26" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {[
              { val: maxY, y: padTop },
              { val: midY, y: padTop + (height - padTop - padBottom) / 2 },
              { val: minY, y: baselineY },
            ].map((tick) => (
              <g key={tick.val}>
                <line
                  x1={padLeft}
                  y1={tick.y}
                  x2={width - padRight}
                  y2={tick.y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 4"
                />
                <text
                  x={padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="#7C8393"
                  fontSize="11"
                  className="tabular-nums"
                >
                  {tick.val}
                </text>
              </g>
            ))}

            {areaPath ? <path d={areaPath} fill={`url(#area_${gradId})`} /> : null}

            {coords.length > 1 ? (
              <polyline
                fill="none"
                stroke={accentColor}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            ) : null}

            {coords.map((pt, idx) => {
              const isSelected = selectedPoint?.id === pt.id;
              const showLabel =
                idx === 0 || idx === coords.length - 1 || idx === Math.floor(coords.length / 2);
              return (
                <g key={pt.id}>
                  {isSelected ? (
                    <line
                      x1={pt.x}
                      y1={padTop}
                      x2={pt.x}
                      y2={baselineY}
                      stroke="rgba(255,255,255,0.16)"
                      strokeDasharray="2 3"
                    />
                  ) : null}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? accentColor : '#1C2029'}
                    stroke={accentColor}
                    strokeWidth="2.2"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="16"
                    fill="transparent"
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`${formatIndiaDate(pt.dateKey, 'short')}: ${pt.value} ${unit}`}
                    onClick={() => setSelectedId(pt.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(pt.id);
                      }
                    }}
                  />
                  {showLabel ? (
                    <text
                      x={pt.x}
                      y={height - 10}
                      textAnchor="middle"
                      fill="#7C8393"
                      fontSize="11"
                    >
                      {formatIndiaDate(pt.dateKey, 'short')}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <p className="text-[11px] text-[#7C8393] mt-1">
            Unit: {unit} · Sample & logged progress entries
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#7C8393]">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium text-right">Value ({unit})</th>
                <th className="py-2 pl-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {[...sorted].reverse().map((pt) => (
                <tr key={pt.id}>
                  <td className="py-2.5 text-[#F5F5F7] tabular-nums">
                    {formatIndiaDate(pt.dateKey, 'short')}
                  </td>
                  <td className="py-2.5 text-right text-[#F5F5F7] font-semibold tabular-nums">
                    {pt.value} {unit}
                  </td>
                  <td className="py-2.5 pl-4 text-[#A2A8B5]">{pt.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
