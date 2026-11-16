import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Download,
  Dumbbell,
  Flame,
  Lock,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import {
  computeMonthlyWrappedSummary,
  renderWrappedCardToDataUrl,
} from '../../lib/wrappedEngine';

export const WrappedPage: React.FC = () => {
  const {
    todayKey,
    activeClient,
    activeUser,
    workoutSessions,
    store,
    achievements,
    pushToast,
    getClientApprovedRecoveryDates,
  } = useApp();

  // Month selector (default current month e.g. "2026-02")
  const currentMonthKey = todayKey.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Privacy toggles (Default OFF as strictly required by specification)
  const [includeWeight, setIncludeWeight] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [format, setFormat] = useState<'story_9_16' | 'post_4_5'>('story_9_16');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Compute monthly stats
  const summary = useMemo(() => {
    const clientId = activeClient?.id || 'cl_aarav';
    const clientSessions = workoutSessions.filter((s) => s.clientId === clientId);
    const clientUnlocks = achievements.filter((a) => a.clientId === clientId);
    const approvedRecoveryDates = getClientApprovedRecoveryDates(clientId);

    return computeMonthlyWrappedSummary({
      clientId,
      monthKey: selectedMonth,
      todayKey,
      assignments: store.assignments,
      completions: store.completions,
      approvedRecoveryDates,
      workoutSessions: clientSessions,
      achievements: clientUnlocks,
      progressEvents: store.progressEvents,
      includeWeightChange: includeWeight,
    });
  }, [
    selectedMonth,
    todayKey,
    workoutSessions,
    store.assignments,
    store.completions,
    store.progressEvents,
    achievements,
    activeClient,
    getClientApprovedRecoveryDates,
    includeWeight,
  ]);

  // Generate preview card image
  useEffect(() => {
    setGenerating(true);
    const url = renderWrappedCardToDataUrl({
      summary,
      memberFirstName: activeClient?.firstName || activeUser.firstName,
      format,
      includeWeightChange: includeWeight,
      highlightNote: includeNotes ? 'Member Notes Active' : undefined,
    });
    setPreviewDataUrl(url);
    setGenerating(false);
  }, [summary, activeClient, activeUser, format, includeWeight, includeNotes]);

  const handleDownload = () => {
    if (!previewDataUrl) return;
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = `FitPlus_Wrapped_${summary.monthKey}_${format}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    pushToast('Wrapped card downloaded to your device!');
  };

  const handleShare = async () => {
    if (!previewDataUrl) return;
    try {
      const blob = await (await fetch(previewDataUrl)).blob();
      const file = new File([blob], `FitPlus_Wrapped_${summary.monthKey}.png`, {
        type: 'image/png',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My FitPlus Wrapped — ${summary.monthLabel}`,
          text: `Crushed ${summary.workoutsCompleted} workouts and ${summary.totalVolumeKg} kg volume this month on FitPlus!`,
          files: [file],
        });
        return;
      }
    } catch {
      // Fallback
    }
    handleDownload();
  };

  return (
    <AppShell pageTitle="FitPlus Wrapped">
      <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Personal Milestone Story</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-1">
              FitPlus Wrapped
            </h1>
            <p className="text-xs text-white/60 mt-1 max-w-xl">
              Celebrate your monthly discipline, total volume lifted, and consistency streaks with Apple-inspired shareable cards.
            </p>
          </div>

          {/* Month selector dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-white/50" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="py-2 px-3 rounded-xl bg-[#1C2029] border border-white/10 text-xs font-medium text-white focus:border-[#FF803E] focus:outline-none"
            >
              <option value="2026-02">February 2026</option>
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
            </select>
          </div>
        </div>

        {/* Liquid Glass Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-[22px] surface-card p-4 border border-white/10 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Dumbbell className="w-3.5 h-3.5 text-[#FF803E]" />
              <span>Workouts</span>
            </div>
            <p className="text-3xl font-bold font-mono text-white tabular-nums">
              {summary.workoutsCompleted}
            </p>
            <p className="text-[11px] text-white/40">{summary.totalTrainingMinutes} mins active</p>
          </div>

          <div className="rounded-[22px] surface-card p-4 border border-white/10 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Total Volume</span>
            </div>
            <p className="text-2xl font-bold font-mono text-[#F59E0B] tabular-nums mt-0.5">
              {summary.totalVolumeKg.toLocaleString()} kg
            </p>
            <p className="text-[11px] text-white/40">Total load moved</p>
          </div>

          <div className="rounded-[22px] surface-card p-4 border border-white/10 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Flame className="w-3.5 h-3.5 text-[#B8E66C]" />
              <span>Consistency</span>
            </div>
            <p className="text-3xl font-bold font-mono text-[#B8E66C] tabular-nums">
              {summary.consistencyPercent}%
            </p>
            <p className="text-[11px] text-white/40">{summary.longestStreakDays}-day best streak</p>
          </div>

          <div className="rounded-[22px] surface-card p-4 border border-white/10 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Trophy className="w-3.5 h-3.5 text-[#A855F7]" />
              <span>PRs / Badges</span>
            </div>
            <p className="text-3xl font-bold font-mono text-[#A855F7] tabular-nums">
              {summary.prsAchieved + summary.achievementsEarned}
            </p>
            <p className="text-[11px] text-white/40">{summary.prsAchieved} PRs · {summary.achievementsEarned} badges</p>
          </div>
        </div>

        {/* Card Customization & Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-[24px] surface-card p-5 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Story Card Options
              </h3>

              {/* Format Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/60 font-medium">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('story_9_16')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      format === 'story_9_16'
                        ? 'bg-[#FF803E] text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    9:16 Story (WhatsApp/IG)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('post_4_5')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      format === 'post_4_5'
                        ? 'bg-[#FF803E] text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    4:5 Feed Post (Instagram)
                  </button>
                </div>
              </div>

              {/* Privacy Toggles (Default OFF) */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                  <Lock className="w-3.5 h-3.5 text-[#FF803E]" />
                  <span>Privacy-First Controls</span>
                </div>

                <label className="flex items-center justify-between text-xs text-white/70 cursor-pointer p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <span>Include body weight change</span>
                  <input
                    type="checkbox"
                    checked={includeWeight}
                    onChange={(e) => setIncludeWeight(e.target.checked)}
                    className="rounded bg-[#101218] border-white/20 text-[#FF803E] focus:ring-0 cursor-pointer"
                  />
                </label>

                <p className="text-[11px] text-white/40 italic">
                  Private health metrics and coach notes are excluded by default for client privacy.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <GlassButton
                  fullWidth
                  onClick={handleShare}
                  className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Story Card</span>
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  fullWidth
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download High-Res PNG</span>
                </GlassButton>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-sm rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-[#0A0C10] p-2 flex items-center justify-center min-h-[420px]">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt={`FitPlus Wrapped for ${summary.monthLabel}`}
                  className="w-full h-auto rounded-[18px] object-contain shadow-lg"
                />
              ) : (
                <div className="text-center text-xs text-white/40 py-12">
                  <Sparkles className="w-6 h-6 text-[#FF803E] mx-auto mb-2 animate-pulse" />
                  <span>Rendering Wrapped Card...</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-white/40 mt-2 text-center">
              Rendered on-device using HTML5 Canvas · 0 server data leaks
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
