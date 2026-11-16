import React, { useMemo, useState } from 'react';
import type { DayConsistency } from '../../types/domain';
import { formatIndiaDate, getWeekdayIndexMonFirst } from '../../lib/date';
import { GlassSegmentedControl } from './GlassSegmentedControl';

interface HeatmapProps {
  days: DayConsistency[];
  title?: string;
}

export const Heatmap: React.FC<HeatmapProps> = ({ days, title = 'Consistency over time' }) => {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    days[days.length - 1]?.dateKey ?? null,
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const weeks = useMemo(() => {
    if (days.length === 0) return [];
    const cols: (DayConsistency | null)[][] = [];
    const firstWeekday = getWeekdayIndexMonFirst(days[0].dateKey);
    let currentCol: (DayConsistency | null)[] = Array(firstWeekday).fill(null);

    for (const day of days) {
      currentCol.push(day);
      if (currentCol.length === 7) {
        cols.push(currentCol);
        currentCol = [];
      }
    }
    if (currentCol.length > 0) {
      while (currentCol.length < 7) currentCol.push(null);
      cols.push(currentCol);
    }
    return cols;
  }, [days]);

  const selectedDay = useMemo(
    () => days.find((d) => d.dateKey === selectedDateKey) ?? days[days.length - 1],
    [days, selectedDateKey],
  );

  const getCellStyle = (day: DayConsistency) => {
    if (day.status === 'future') return 'bg-[#101218] border border-white/[0.04] opacity-40';
    if (day.status === 'neutral') return 'bg-[#252A35] border border-white/[0.07]';
    if (day.status === 'recovery_completed') return 'bg-[#C1ACF9]/75 border border-[#C1ACF9]';
    if (day.status === 'missed' && day.requiredCompleted === 0)
      return 'bg-[#151820] border border-white/[0.08]';
    if (day.intensity === 1) return 'bg-[#542B16] border border-[#FF803E]/35';
    if (day.intensity === 2) return 'bg-[#94471F] border border-[#FF803E]/55';
    if (day.intensity === 3) return 'bg-[#CC6128] border border-[#FF803E]/75';
    if (day.intensity === 4) return 'bg-[#FF803E] border border-[#FFB37A]/80 shadow-[0_0_8px_rgba(255,128,62,0.3)]';
    return 'bg-[#252A35] border border-white/[0.08]';
  };

  const describeDay = (day: DayConsistency) => {
    if (day.status === 'neutral') return 'No scheduled commitments (neutral)';
    if (day.status === 'recovery_completed') return 'Recovery commitment complete';
    if (day.status === 'completed') return `All ${day.requiredTotal} commitments complete`;
    if (day.status === 'pending') return `${day.requiredCompleted} of ${day.requiredTotal} complete today`;
    if (day.status === 'missed') return `${day.requiredCompleted} of ${day.requiredTotal} complete`;
    return 'Upcoming scheduled day';
  };

  return (
    <div className="surface-card rounded-[22px] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[18px] font-semibold text-[#F5F5F7]">{title}</h3>
          <p className="text-[12px] text-[#A2A8B5] mt-0.5">
            12 weeks · Tap or focus any day for details
          </p>
        </div>

        <GlassSegmentedControl
          ariaLabel="Heatmap display mode"
          size="sm"
          tone="neutral"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: 'grid', label: 'Grid' },
            { id: 'list', label: 'Text summary' },
          ]}
        />
      </div>

      {viewMode === 'grid' ? (
        <>
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex gap-2 min-w-full justify-between" role="grid" aria-label={title}>
              <div className="grid grid-rows-7 gap-1.5 pr-1 text-[11px] text-[#7C8393] select-none">
                <span>M</span>
                <span className="opacity-0">T</span>
                <span>W</span>
                <span className="opacity-0">T</span>
                <span>F</span>
                <span className="opacity-0">S</span>
                <span>S</span>
              </div>
              <div className="flex gap-1.5 flex-1 justify-between">
                {weeks.map((col, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                    {col.map((day, dIdx) =>
                      day ? (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => setSelectedDateKey(day.dateKey)}
                          aria-label={`View day ${formatIndiaDate(day.dateKey, 'short')}: ${describeDay(day)}`}
                          aria-pressed={selectedDay?.dateKey === day.dateKey}
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[5px] transition-transform cursor-pointer ${getCellStyle(
                            day,
                          )} ${
                            selectedDay?.dateKey === day.dateKey
                              ? 'ring-2 ring-[#FFB06B] ring-offset-1 ring-offset-[#1C2029]'
                              : ''
                          }`}
                        />
                      ) : (
                        <span key={`empty_${wIdx}_${dIdx}`} className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#A2A8B5]">
            <div className="flex flex-wrap items-center gap-2">
              <span>Rest</span>
              <span className="w-3 h-3 rounded-[3px] bg-[#252A35] border border-white/10" aria-hidden="true" />
              <span className="ml-1">Recovery</span>
              <span className="w-3 h-3 rounded-[3px] bg-[#C1ACF9]/75" aria-hidden="true" />
              <span className="ml-1">Less</span>
              <span className="w-3 h-3 rounded-[3px] bg-[#542B16]" aria-hidden="true" />
              <span className="w-3 h-3 rounded-[3px] bg-[#94471F]" aria-hidden="true" />
              <span className="w-3 h-3 rounded-[3px] bg-[#CC6128]" aria-hidden="true" />
              <span className="w-3 h-3 rounded-[3px] bg-[#FF803E]" aria-hidden="true" />
              <span>More</span>
            </div>
            {selectedDay ? (
              <p className="text-[13px] text-[#F5F5F7] font-medium tabular-nums">
                {formatIndiaDate(selectedDay.dateKey, 'short')} · {describeDay(selectedDay)}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <ul className="divide-y divide-white/[0.08] max-h-64 overflow-y-auto" aria-label="Recent 14 days activity log">
          {days
            .slice(-14)
            .reverse()
            .map((day) => (
              <li key={day.dateKey} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                <span className="text-[#F5F5F7] font-medium tabular-nums">
                  {formatIndiaDate(day.dateKey, 'short')}
                </span>
                <span className="text-[#A2A8B5] text-right">{describeDay(day)}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};
