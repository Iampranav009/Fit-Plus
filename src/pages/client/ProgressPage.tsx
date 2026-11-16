import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Eye, EyeOff, Loader2, Plus, Sparkles, Trophy } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import * as fsService from '../../data/firestoreService';
import { addDaysToKey, formatIndiaDate } from '../../lib/date';
import { computeHeatmapGrid, computeStreakSummary } from '../../lib/streak';
import { evaluateAchievementsState } from '../../lib/achievementsEngine';
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

type ProgressMetricTab = 'weight' | 'strength' | 'waist' | 'steps' | 'checkin';

const METRIC_META: Record<
  ProgressMetricTab,
  { label: string; defaultLabel: string; unit: string; defaultVal: string; max: number }
> = {
  weight: { label: 'Weight (kg)', defaultLabel: 'Body weight', unit: 'kg', defaultVal: '75.0', max: 400 },
  strength: { label: 'Strength (kg)', defaultLabel: 'Goblet squat', unit: 'kg', defaultVal: '28', max: 500 },
  waist: { label: 'Waist (cm)', defaultLabel: 'Waist circumference', unit: 'cm', defaultVal: '84', max: 250 },
  steps: { label: 'Steps', defaultLabel: 'Daily steps', unit: 'steps', defaultVal: '8000', max: 100000 },
  checkin: { label: 'Check-ins', defaultLabel: 'Weekly check-in', unit: 'score', defaultVal: '8', max: 10 },
};

export const ProgressPage: React.FC = () => {
  const {
    store,
    todayKey,
    activeClient,
    activeCoach,
    isCloudSynced,
    getClientApprovedRecoveryDates,
    addProgressMeasurement,
    toggleProgressPhotoShare,
  } = useApp();
  const [range, setRange] = useState<'7d' | '30d' | '12w'>('12w');
  const [metricTab, setMetricTab] = useState<ProgressMetricTab>('weight');
  const [modalOpen, setModalOpen] = useState(false);

  const [entryDate, setEntryDate] = useState(todayKey);
  const [entryValue, setEntryValue] = useState(
    activeClient?.weightKg ? String(activeClient.weightKg) : '78.0',
  );
  const [entryNote, setEntryNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [shareWithCoach, setShareWithCoach] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const clientAssignments = useMemo(
    () => store.assignments.filter((a) => a.clientId === activeClient?.id),
    [store.assignments, activeClient?.id],
  );
  const clientCompletions = useMemo(
    () => store.completions.filter((c) => c.clientId === activeClient?.id),
    [store.completions, activeClient?.id],
  );

  const approvedRecoveryDates = useMemo(() => {
    if (!activeClient) return [];
    return getClientApprovedRecoveryDates(activeClient.id);
  }, [activeClient, getClientApprovedRecoveryDates]);

  const streak = useMemo(
    () =>
      computeStreakSummary(
        clientAssignments,
        clientCompletions,
        todayKey,
        120,
        approvedRecoveryDates,
      ),
    [clientAssignments, clientCompletions, todayKey, approvedRecoveryDates],
  );

  const heatmapDays = useMemo(
    () =>
      computeHeatmapGrid(
        todayKey,
        12,
        clientAssignments,
        clientCompletions,
        approvedRecoveryDates,
      ),
    [todayKey, clientAssignments, clientCompletions, approvedRecoveryDates],
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

  const photoEvents = useMemo(
    () => allClientEvents.filter((ev) => Boolean(ev.photoPath)),
    [allClientEvents],
  );

  useEffect(() => {
    if (!isCloudSynced) return;
    let active = true;
    for (const ev of photoEvents) {
      if (!ev.photoPath || photoUrls[ev.id]) continue;
      void fsService
        .getStorageFileDownloadUrl(ev.photoPath)
        .then((url) => {
          if (active) setPhotoUrls((prev) => ({ ...prev, [ev.id]: url }));
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [isCloudSynced, photoEvents, photoUrls]);

  const completedDaysCount = useMemo(
    () =>
      heatmapDays.filter((d) => d.status === 'completed' || d.status === 'recovery_completed').length,
    [heatmapDays],
  );

  const achievementProgress = useMemo(() => {
    return evaluateAchievementsState({
      clientId: activeClient?.id || '',
      todayKey,
      assignments: clientAssignments,
      completions: clientCompletions,
      approvedRecoveryDates,
      workoutSessions: store.workoutSessions || [],
      progressEvents: store.progressEvents,
      existingUnlocks: store.achievements || [],
    }).items;
  }, [
    activeClient,
    todayKey,
    clientAssignments,
    clientCompletions,
    approvedRecoveryDates,
    store.workoutSessions,
    store.progressEvents,
    store.achievements,
  ]);

  const openModalForTab = (tab: ProgressMetricTab = metricTab) => {
    setMetricTab(tab);
    setEntryValue(
      tab === 'weight'
        ? String(activeClient?.weightKg || METRIC_META.weight.defaultVal)
        : METRIC_META[tab].defaultVal,
    );
    setPhotoFile(null);
    setShareWithCoach(false);
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    const meta = METRIC_META[metricTab];
    const num = Number(entryValue);
    if (!Number.isFinite(num) || num <= 0 || num > meta.max) {
      setFormError(`Enter a valid positive number up to ${meta.max}.`);
      return;
    }
    if (!entryDate) {
      setFormError('Choose a date.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await addProgressMeasurement({
        dateKey: entryDate,
        metricType: metricTab,
        label: meta.defaultLabel,
        value: metricTab === 'steps' ? Math.round(num) : Math.round(num * 10) / 10,
        unit: meta.unit,
        note: entryNote.trim() || undefined,
        photoFile,
        shareWithTrainer: Boolean(photoFile && shareWithCoach && activeCoach),
      });
      setEntryNote('');
      setPhotoFile(null);
      setShareWithCoach(false);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
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
          <GlassButton size="sm" onClick={() => openModalForTab(metricTab)}>
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select metric type">
            {(Object.keys(METRIC_META) as ProgressMetricTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMetricTab(tab)}
                aria-pressed={metricTab === tab}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-[12px] text-[13px] font-medium border cursor-pointer transition-colors ${
                  metricTab === tab
                    ? 'bg-[#FF803E] border-[#FF803E] text-[#101218] font-semibold'
                    : 'bg-[#101218] border-white/[0.08] text-[#A2A8B5] hover:text-[#F5F5F7]'
                }`}
              >
                {METRIC_META[tab].label}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <GlassSegmentedControl
              ariaLabel="Select time range"
              value={range}
              onChange={(v) => setRange(v as '7d' | '30d' | '12w')}
              size="sm"
              tone="neutral"
              options={[
                { id: '7d', label: '7 days' },
                { id: '30d', label: '30 days' },
                { id: '12w', label: '12 weeks' },
              ]}
            />
          </div>
        </div>

        {progressPoints.length === 0 ? (
          <EmptyState
            artwork="progress"
            title={COPY.client.noProgressTitle}
            description={COPY.client.noProgressSupport}
            actionLabel={`Add ${METRIC_META[metricTab].defaultLabel.toLowerCase()}`}
            onAction={() => openModalForTab(metricTab)}
          />
        ) : (
          <TrendChart
            title={`${METRIC_META[metricTab].defaultLabel} history`}
            unit={METRIC_META[metricTab].unit}
            points={progressPoints}
          />
        )}

        {/* 12-Week Activity Heatmap */}
        <Heatmap days={heatmapDays} title={COPY.client.heatmapTitle} />

        {/* Achievement Badges Gallery */}
        <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <MediaImage
                assetKey="illusTrophy"
                alt=""
                aspectClass="w-11 h-11 rounded-[12px] shrink-0"
              />
              <div>
                <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Milestone Gallery</h2>
                <p className="text-[12px] text-[#7C8393]">
                  9 verifiable milestones derived from workouts, streaks, and consistency
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-[13px] font-semibold text-[#FFB06B] tabular-nums">
                {achievementProgress.filter((a) => a.unlocked).length}/{achievementProgress.length} unlocked
              </span>
              <Link
                to="/app/wrapped"
                className="px-3 py-1.5 rounded-xl bg-[#FF803E]/15 hover:bg-[#FF803E]/25 text-[#FF803E] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>FitPlus Wrapped</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {achievementProgress.map((item) => (
              <div
                key={item.badgeId}
                className={`rounded-[18px] p-4 border flex flex-col justify-between gap-3 transition-all ${
                  item.unlocked
                    ? 'surface-elevated border-white/[0.12] shadow-sm'
                    : 'bg-[#101218]/60 border-white/[0.06] opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AchievementBadgeSvg kind={item.badgeId} unlocked={item.unlocked} size={48} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-white truncate">
                        {item.title}
                      </p>
                      {item.unlocked && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#B8E66C]/20 text-[#B8E66C] font-semibold uppercase">
                          Earned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
                    <span>Progress</span>
                    <span>{item.currentValue} / {item.targetValue}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.unlocked ? 'bg-[#B8E66C]' : 'bg-[#FF803E]'
                      }`}
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Private Progress Photos */}
        <section className="surface-card rounded-[20px] p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[12px] bg-[#252A35] border border-white/[0.08] flex items-center justify-center text-[#FF803E] shrink-0">
                <Camera className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-[#F5F5F7]">
                  {COPY.client.journalTitle}
                </h2>
                <p className="text-[13px] text-[#7C8393] mt-0.5">
                  {isCloudSynced
                    ? 'Stored privately in encrypted cloud storage. Only visible to your active coach if you enable sharing.'
                    : 'Sign in with a verified FitPlus account to upload private check-in photos.'}
                </p>
              </div>
            </div>
            {isCloudSynced ? (
              <GlassButton size="sm" variant="glass" onClick={() => openModalForTab('checkin')}>
                Add check-in photo
              </GlassButton>
            ) : null}
          </div>

          {photoEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {photoEvents.map((ev) => {
                const url = photoUrls[ev.id];
                const shared = Boolean(ev.shareWithTrainer);
                return (
                  <div
                    key={ev.id}
                    className="rounded-[16px] surface-elevated p-3 flex flex-col gap-2.5"
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={`Check-in on ${ev.dateKey}`}
                        className="w-full h-44 object-cover rounded-[12px] bg-[#101218]"
                      />
                    ) : (
                      <div className="w-full h-44 rounded-[12px] bg-[#101218] flex items-center justify-center text-[12px] text-[#7C8393]">
                        Loading private photo...
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-[#F5F5F7] font-medium tabular-nums">
                        {formatIndiaDate(ev.dateKey, 'short')} · {ev.label}
                      </span>
                      {activeCoach ? (
                        <button
                          type="button"
                          onClick={() => void toggleProgressPhotoShare(ev.id, !shared)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] border cursor-pointer transition-colors ${
                            shared
                              ? 'bg-[#B8E66C]/15 border-[#B8E66C]/45 text-[#B8E66C]'
                              : 'bg-[#101218] border-white/[0.1] text-[#A2A8B5] hover:text-[#F5F5F7]'
                          }`}
                        >
                          {shared ? (
                            <>
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              Shared with coach
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                              Private only
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[#7C8393]">Private</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Recent Check-ins & Measurements */}
        <section className="surface-card rounded-[20px] p-5">
          <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Recent measurements</h2>
          {allClientEvents.length === 0 ? (
            <p className="mt-2 text-[14px] text-[#7C8393]">No entries logged yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.08]">
              {allClientEvents.slice(0, 8).map((ev) => (
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
      </div>

      {/* Floating Log Action Button */}
      <div className="fixed right-4 bottom-24 lg:right-8 lg:bottom-8 z-20">
        <FloatingActionButton
          label="Log new measurement"
          onClick={() => openModalForTab(metricTab)}
        />
      </div>

      {/* Add Measurement Sheet */}
      <GlassSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Log ${METRIC_META[metricTab].defaultLabel.toLowerCase()}`}
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
            label={METRIC_META[metricTab].defaultLabel}
            unit={METRIC_META[metricTab].unit}
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
            placeholder="e.g., Morning check-in before breakfast"
          />

          {isCloudSynced ? (
            <div className="rounded-[14px] surface-elevated p-3.5 space-y-2.5">
              <p className="text-[13px] font-medium text-[#F5F5F7]">
                Check-in photo <span className="text-[#7C8393] font-normal">(optional · max 5 MB)</span>
              </p>
              <label className="glass-control min-h-[40px] px-3 py-2 rounded-[10px] text-[13px] text-[#F5F5F7] cursor-pointer inline-flex items-center">
                <span>{photoFile ? photoFile.name : 'Attach private photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
              </label>
              {photoFile && activeCoach ? (
                <label className="flex items-center gap-2 text-[13px] text-[#A2A8B5] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareWithCoach}
                    onChange={(e) => setShareWithCoach(e.target.checked)}
                    className="h-4 w-4 accent-[#FF803E]"
                  />
                  Share this photo with {activeCoach.displayName}
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-2.5 pt-2">
            <GlassButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save measurement'
              )}
            </GlassButton>
          </div>
        </form>
      </GlassSheet>
    </AppShell>
  );
};
