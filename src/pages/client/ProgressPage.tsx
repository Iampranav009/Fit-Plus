import React, { useMemo, useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { addDaysToKey, formatIndiaDate } from '../../lib/date';
import { computeHeatmapGrid, computeStreakSummary } from '../../lib/streak';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { Heatmap } from '../../components/ui/Heatmap';
import { TrendChart } from '../../components/ui/TrendChart';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { InputField } from '../../components/ui/InputField';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/ui/MetricCard';
import { GlassSegmentedControl } from '../../components/ui/GlassSegmentedControl';
import { FloatingActionButton } from '../../components/ui/FloatingActionButton';
import { MediaImage } from '../../components/ui/MediaImage';
import {
  AchievementBadgeSvg,
  StreakFlameSvg,
  WeightManagementSvg,
} from '../../components/ui/FitnessIllustrations';

export const ProgressPage: React.FC = () => {
  const { store, todayKey, activeClient, addProgressMeasurement } = useApp();
  const [range, setRange] = useState<'7d' | '30d' | '12w'>('12w');
  const [metricTab, setMetricTab] = useState<'weight' | 'strength'>('weight');
  const [modalOpen, setModalOpen] = useState(false);

  const [entryDate, setEntryDate] = useState(todayKey);
  const [entryValue, setEntryValue] = useState(
    activeClient?.weightKg ? String(activeClient.weightKg) : '78.0',
  );
  const [entryNote, setEntryNote] = useState('');
  const [formError, setFormError] = useState('');

  const clientAssignments = useMemo(
    () => store.assignments.filter((a) => a.clientId === activeClient?.id),
    [store.assignments, activeClient?.id],
  );
  const clientCompletions = useMemo(
    () => store.completions.filter((c) => c.clientId === activeClient?.id),
    [store.completions, activeClient?.id],
  );

  const streak = useMemo(
    () => computeStreakSummary(clientAssignments, clientCompletions, todayKey),
    [clientAssignments, clientCompletions, todayKey],
  );

  const heatmapDays = useMemo(
    () => computeHeatmapGrid(todayKey, 12, clientAssignments, clientCompletions),
    [todayKey, clientAssignments, clientCompletions],
  );

  const cutoffDate = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 84;
    return addDaysToKey(todayKey, -days);
  }, [todayKey, range]);

  const progressPoints = useMemo(() => {
    return store.progressEvents
      .filter(
        (e) =>
          e.clientId === activeClient?.id &&
          e.metricType === metricTab &&
          e.dateKey >= cutoffDate,
      )
      .map((e) => ({
        id: e.id,
        dateKey: e.dateKey,
        value: e.value,
        note: e.note,
      }));
  }, [store.progressEvents, activeClient?.id, metricTab, cutoffDate]);

  const allClientEvents = useMemo(
    () =>
      store.progressEvents
        .filter((e) => e.clientId === activeClient?.id)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [store.progressEvents, activeClient?.id],
  );

  const completedDaysCount = useMemo(
    () =>
      heatmapDays.filter((d) => d.status === 'completed' || d.status === 'recovery_completed').length,
    [heatmapDays],
  );

  const achievements = useMemo(
    () => [
      {
        kind: 'streak_7' as const,
        title: '7-day steady streak',
        subtitle: streak.longestStreak >= 7 ? 'Earned' : `${streak.longestStreak}/7 days`,
        unlocked: streak.longestStreak >= 7,
      },
      {
        kind: 'consistency' as const,
        title: '10 active days',
        subtitle: completedDaysCount >= 10 ? 'Earned' : `${completedDaysCount}/10 days`,
        unlocked: completedDaysCount >= 10,
      },
      {
        kind: 'strength' as const,
        title: 'Strength benchmark',
        subtitle: allClientEvents.some((e) => e.metricType === 'strength')
          ? 'Earned'
          : 'Log 1 strength entry',
        unlocked: allClientEvents.some((e) => e.metricType === 'strength'),
      },
      {
        kind: 'hydration' as const,
        title: 'Logged 3+ check-ins',
        subtitle:
          allClientEvents.length >= 3
            ? 'Earned'
            : `${allClientEvents.length}/3 logged`,
        unlocked: allClientEvents.length >= 3,
      },
    ],
    [streak.longestStreak, completedDaysCount, allClientEvents],
  );

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(entryValue);
    if (!Number.isFinite(num) || num <= 0 || num > 400) {
      setFormError('Enter a valid positive number.');
      return;
    }
    if (!entryDate) {
      setFormError('Choose a date.');
      return;
    }
    setFormError('');
    addProgressMeasurement({
      dateKey: entryDate,
      metricType: metricTab,
      label: metricTab === 'weight' ? 'Body weight' : 'Goblet squat',
      value: Math.round(num * 10) / 10,
      unit: 'kg',
      note: entryNote.trim() || undefined,
    });
    setEntryNote('');
    setModalOpen(false);
  };

  return (
    <AppShell pageTitle="Progress">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">Your activity & measurements</p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.client.progressTitle}
            </h1>
          </div>
          <GlassButton
            size="sm"
            onClick={() => {
              setEntryValue(
                metricTab === 'weight' ? String(activeClient?.weightKg || 75) : '28',
              );
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Log progress
          </GlassButton>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Current streak"
            value={streak.currentStreak}
            unit="days"
            accentColor="#FF803E"
            icon={<StreakFlameSvg size={20} active={streak.currentStreak > 0} />}
          />
          <MetricCard
            label="Longest streak"
            value={streak.longestStreak}
            unit="days"
            accentColor="#F5F5F7"
          />
          <MetricCard
            className="col-span-2 sm:col-span-1"
            label="Latest weight"
            value={activeClient?.weightKg ? activeClient.weightKg : 'Optional'}
            unit={activeClient?.weightKg ? 'kg' : undefined}
            accentColor="#B8E66C"
            icon={<WeightManagementSvg size={32} />}
          />
        </div>

        {/* Metric & Range Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <GlassSegmentedControl
            ariaLabel="Select metric type"
            value={metricTab}
            onChange={setMetricTab}
            size="sm"
            options={[
              { id: 'weight', label: 'Weight (kg)' },
              { id: 'strength', label: 'Strength (kg)' },
            ]}
          />

          <GlassSegmentedControl
            ariaLabel="Select time range"
            value={range}
            onChange={setRange}
            size="sm"
            tone="neutral"
            options={[
              { id: '7d', label: '7 days' },
              { id: '30d', label: '30 days' },
              { id: '12w', label: '12 weeks' },
            ]}
          />
        </div>

        {progressPoints.length === 0 ? (
          <EmptyState
            artwork="progress"
            title={COPY.client.noProgressTitle}
            description={COPY.client.noProgressSupport}
            actionLabel="Add measurement"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <TrendChart
            title={metricTab === 'weight' ? 'Weight history' : 'Strength benchmark (Goblet squat)'}
            unit="kg"
            points={progressPoints}
          />
        )}

        {/* 12-Week Activity Heatmap */}
        <Heatmap days={heatmapDays} title={COPY.client.heatmapTitle} />

        {/* Achievement Badges Gallery */}
        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MediaImage
                assetKey="illusTrophy"
                alt=""
                aspectClass="w-11 h-11 rounded-[12px] shrink-0"
              />
              <div>
                <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Consistency milestones</h2>
                <p className="text-[12px] text-[#7C8393]">
                  Derived directly from your logged completions and check-ins
                </p>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-[#FFB06B] tabular-nums">
              {achievements.filter((a) => a.unlocked).length}/{achievements.length} earned
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {achievements.map((item) => (
              <div
                key={item.title}
                className={`rounded-[16px] p-3.5 border flex flex-col items-center text-center gap-2 ${
                  item.unlocked
                    ? 'surface-elevated border-white/[0.12]'
                    : 'bg-[#101218]/60 border-white/[0.06] opacity-75'
                }`}
              >
                <AchievementBadgeSvg kind={item.kind} unlocked={item.unlocked} size={46} />
                <p className="text-[13px] font-semibold text-[#F5F5F7] leading-snug">
                  {item.title}
                </p>
                <p className="text-[11px] text-[#A2A8B5] tabular-nums">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Check-ins & Measurements */}
        <section className="surface-card rounded-[20px] p-5">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Recent measurements</h2>
          {allClientEvents.length === 0 ? (
            <p className="mt-2 text-[14px] text-[#7C8393]">No entries logged yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.08]">
              {allClientEvents.slice(0, 6).map((ev) => (
                <li key={ev.id} className="py-3 flex items-center justify-between gap-3 text-[14px]">
                  <div>
                    <p className="text-[#F5F5F7] font-medium">{ev.label}</p>
                    <p className="text-[12px] text-[#7C8393]">
                      {formatIndiaDate(ev.dateKey, 'short')}
                      {ev.note ? ` · ${ev.note}` : ''}
                    </p>
                  </div>
                  <span className="text-[15px] font-semibold text-[#F5F5F7] tabular-nums">
                    {ev.value} {ev.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Private Journal Placeholder */}
        <section className="surface-card rounded-[20px] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-[12px] bg-[#252A35] border border-white/[0.08] flex items-center justify-center text-[#A2A8B5] shrink-0">
            <Camera className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#F5F5F7]">
              {COPY.client.journalTitle}
            </h2>
            <p className="text-[13px] text-[#7C8393] mt-0.5">
              {COPY.client.journalSupport} Private media storage is deferred until Stage 2B.
            </p>
          </div>
        </section>
      </div>

      {/* Floating Log Action Button */}
      <div className="fixed right-4 bottom-24 lg:right-8 lg:bottom-8 z-20">
        <FloatingActionButton
          label="Log new measurement"
          onClick={() => {
            setEntryValue(metricTab === 'weight' ? String(activeClient?.weightKg || 75) : '28');
            setModalOpen(true);
          }}
        />
      </div>

      {/* Add Measurement Sheet */}
      <GlassSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add measurement"
        description="Stored locally or in your private FitPlus workspace."
      >
        <form onSubmit={handleSaveMeasurement} className="flex flex-col gap-4">
          <InputField
            label="Date"
            type="date"
            value={entryDate}
            max={todayKey}
            onChange={(e) => setEntryDate(e.target.value)}
          />
          <InputField
            label={metricTab === 'weight' ? 'Body weight' : 'Goblet squat load'}
            unit="kg"
            inputMode="decimal"
            value={entryValue}
            onChange={(e) => setEntryValue(e.target.value)}
            error={formError}
          />
          <InputField
            label="Note"
            optionalTag="Optional"
            value={entryNote}
            onChange={(e) => setEntryNote(e.target.value)}
            placeholder="e.g., Morning weight before breakfast"
          />
          <div className="flex gap-2.5 pt-2">
            <GlassButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth>
              Save measurement
            </GlassButton>
          </div>
        </form>
      </GlassSheet>
    </AppShell>
  );
};
