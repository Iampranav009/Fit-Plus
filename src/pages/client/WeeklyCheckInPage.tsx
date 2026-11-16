import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Heart,
  MessageSquare,
  Moon,
  Scale,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';
import type { WeeklyCheckIn } from '../../types/domain';

export const WeeklyCheckInPage: React.FC = () => {
  const {
    todayKey,
    activeClient,
    activeCoach,
    weeklyCheckIns,
    submitWeeklyCheckIn,
    pushToast,
  } = useApp();

  // Current week key (e.g., current Monday / week identifier)
  const currentWeekKey = todayKey;

  // Check if client has already checked in this week
  const existingThisWeek = useMemo(() => {
    return weeklyCheckIns.find(
      (c) => (!activeClient || c.clientId === activeClient.id) && c.dateKey === currentWeekKey,
    );
  }, [weeklyCheckIns, activeClient, currentWeekKey]);

  // Form state
  const [weightKg, setWeightKg] = useState<string>(
    existingThisWeek?.weightKg ? String(existingThisWeek.weightKg) : '',
  );
  const [energyLevel, setEnergyLevel] = useState<number>(existingThisWeek?.energyLevel || 4);
  const [sleepQuality, setSleepQuality] = useState<number>(existingThisWeek?.sleepQuality || 3);
  const [workoutDifficulty, setWorkoutDifficulty] = useState<number>(
    existingThisWeek?.workoutDifficulty || 3,
  );
  const [hungerLevel, setHungerLevel] = useState<number>(existingThisWeek?.hungerLevel || 3);
  const [scheduleChallenges, setScheduleChallenges] = useState<string>(
    existingThisWeek?.scheduleChallenges || '',
  );
  const [generalFeedback, setGeneralFeedback] = useState<string>(
    existingThisWeek?.generalFeedback || '',
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [shareWithTrainer, setShareWithTrainer] = useState<boolean>(
    existingThisWeek?.shareWithTrainer !== false,
  );
  const [submitting, setSubmitting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(!existingThisWeek);

  // Past check-in history
  const pastCheckIns = useMemo(() => {
    return weeklyCheckIns
      .filter((c) => !activeClient || c.clientId === activeClient.id)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [weeklyCheckIns, activeClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsedWeight = weightKg.trim() ? parseFloat(weightKg) : undefined;
      await submitWeeklyCheckIn(
        {
          id: existingThisWeek?.id,
          clientId: activeClient?.id || 'cl_aarav',
          weekKey: currentWeekKey,
          dateKey: todayKey,
          weightKg: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : undefined,
          energyLevel,
          sleepQuality,
          workoutDifficulty,
          hungerLevel,
          scheduleChallenges: scheduleChallenges.trim() || undefined,
          generalFeedback: generalFeedback.trim() || undefined,
          shareWithTrainer,
        },
        photoFile,
      );
      setIsFormExpanded(false);
      pushToast('Weekly check-in submitted! Your coach will review shortly.');
    } catch {
      pushToast('Could not submit check-in.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const scaleDescriptors: Record<string, string[]> = {
    energy: ['1 - Exhausted', '2 - Low energy', '3 - Moderate', '4 - Energized', '5 - Peak energy'],
    sleep: ['1 - Poor / <5h', '2 - Restless', '3 - Adequate', '4 - Deep & restful', '5 - Optimal 8h+'],
    difficulty: ['1 - Too easy', '2 - Light', '3 - Just right', '4 - Challenging', '5 - Maximum strain'],
    hunger: ['1 - Never hungry', '2 - Mild hunger', '3 - Well satiated', '4 - Frequent cravings', '5 - Intense hunger'],
  };

  return (
    <AppShell pageTitle="Weekly Check-in">
      <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
            <ClipboardCheck className="w-4 h-4" />
            <span>Weekly Accountability & Coaching Sync</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Weekly Reflection & Check-in
          </h1>
          <p className="text-xs text-white/60">
            Keep your trainer aligned with how training, recovery, and daily nutrition actually feel.
          </p>
        </div>

        {/* Existing Submission Banner */}
        {existingThisWeek && !isFormExpanded && (
          <div className="rounded-[22px] bg-[#B8E66C]/10 border border-[#B8E66C]/30 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B8E66C]/20 text-[#B8E66C] flex items-center justify-center">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Check-in submitted for this week</p>
                <p className="text-xs text-white/60">
                  Logged on {existingThisWeek.dateKey}. Coach will review in your next review cycle.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFormExpanded(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/90 border border-white/10 transition-colors"
            >
              Update
            </button>
          </div>
        )}

        {/* Submission Form */}
        {isFormExpanded && (
          <form
            onSubmit={handleSubmit}
            className="rounded-[26px] surface-card p-6 border border-white/10 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {existingThisWeek ? 'Update This Week’s Check-in' : 'New Weekly Check-in'}
                </h2>
                <p className="text-xs text-white/50">For week of {currentWeekKey}</p>
              </div>
              {existingThisWeek && (
                <button
                  type="button"
                  onClick={() => setIsFormExpanded(false)}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Collapse
                </button>
              )}
            </div>

            {/* Optional Weight Logging */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Scale className="w-4 h-4 text-[#FF803E]" />
                <span>Body Weight (kg)</span>
                <span className="text-white/40 font-normal">(Optional · Morning empty stomach)</span>
              </div>
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="e.g. 78.5"
                className="w-full sm:w-48 p-2.5 rounded-xl bg-[#101218] border border-white/10 text-sm font-mono text-white focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            {/* 1-5 Perception Scales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Energy Level */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Average Energy</span>
                  </span>
                  <span className="font-mono text-[#F59E0B] font-bold">{energyLevel}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyLevel(lvl)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        energyLevel === lvl
                          ? 'bg-[#F59E0B] text-[#101218] shadow-md'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/50 text-center">
                  {scaleDescriptors.energy[energyLevel - 1]}
                </p>
              </div>

              {/* Sleep Quality */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-[#70C8ED]" />
                    <span>Sleep Quality</span>
                  </span>
                  <span className="font-mono text-[#70C8ED] font-bold">{sleepQuality}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSleepQuality(lvl)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        sleepQuality === lvl
                          ? 'bg-[#70C8ED] text-[#101218] shadow-md'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/50 text-center">
                  {scaleDescriptors.sleep[sleepQuality - 1]}
                </p>
              </div>

              {/* Workout Difficulty */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF803E]" />
                    <span>Workout Difficulty</span>
                  </span>
                  <span className="font-mono text-[#FF803E] font-bold">{workoutDifficulty}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setWorkoutDifficulty(lvl)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        workoutDifficulty === lvl
                          ? 'bg-[#FF803E] text-white shadow-md'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/50 text-center">
                  {scaleDescriptors.difficulty[workoutDifficulty - 1]}
                </p>
              </div>

              {/* Hunger Level */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#B8E66C]" />
                    <span>Hunger & Satiety</span>
                  </span>
                  <span className="font-mono text-[#B8E66C] font-bold">{hungerLevel}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setHungerLevel(lvl)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        hungerLevel === lvl
                          ? 'bg-[#B8E66C] text-[#101218] shadow-md'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-white/50 text-center">
                  {scaleDescriptors.hunger[hungerLevel - 1]}
                </p>
              </div>
            </div>

            {/* Schedule Challenges & Work Obstacles */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">
                Schedule Challenges & Travel (Optional)
              </label>
              <textarea
                rows={2}
                value={scheduleChallenges}
                onChange={(e) => setScheduleChallenges(e.target.value)}
                placeholder="E.g., Travel to Bangalore on Thursday reduced sleep; team dinner on Friday."
                className="w-full p-3 rounded-xl bg-[#101218] border border-white/10 text-sm text-white placeholder-white/40 focus:border-[#FF803E] focus:outline-none resize-none"
              />
            </div>

            {/* Wins & General Reflections */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">
                Weekly Wins & General Notes for Coach
              </label>
              <textarea
                rows={2}
                value={generalFeedback}
                onChange={(e) => setGeneralFeedback(e.target.value)}
                placeholder="E.g., Hit 80kg bench cleanly for 8 reps; stuck to daily protein anchors."
                className="w-full p-3 rounded-xl bg-[#101218] border border-white/10 text-sm text-white placeholder-white/40 focus:border-[#FF803E] focus:outline-none resize-none"
              />
            </div>

            {/* Photo Attachment & Privacy Toggle */}
            <div className="p-4 rounded-2xl bg-[#14171F] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#FF803E]" />
                  <span>Optional Weekly Progress Photo</span>
                </span>
                <span className="text-[11px] text-white/40">Max 5 MB · JPG/PNG</span>
              </div>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
              />

              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={shareWithTrainer}
                  onChange={(e) => setShareWithTrainer(e.target.checked)}
                  className="rounded bg-[#101218] border-white/20 text-[#FF803E] focus:ring-0"
                />
                <span>Share this check-in and photo with my designated personal trainer</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <GlassButton
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-[#FF803E] to-[#E15A1C] text-white"
              >
                {submitting ? 'Submitting...' : 'Submit Weekly Check-in'}
              </GlassButton>
            </div>
          </form>
        )}

        {/* Past Check-ins History */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-lg font-bold text-white">Past Check-in History</h3>

          {pastCheckIns.length > 0 ? (
            <div className="space-y-4">
              {pastCheckIns.map((ci) => (
                <div
                  key={ci.id}
                  className="rounded-[22px] surface-card p-5 border border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <p className="text-sm font-bold text-white">Week of {ci.dateKey}</p>
                      <p className="text-xs text-white/40">
                        Submitted {new Date(ci.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {ci.weightKg && (
                      <span className="text-xs font-mono font-bold text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                        {ci.weightKg} kg
                      </span>
                    )}
                  </div>

                  {/* Ratings Row */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white/5">
                      <p className="text-white/40 uppercase text-[10px]">Energy</p>
                      <p className="font-bold text-[#F59E0B] font-mono mt-0.5">{ci.energyLevel}/5</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <p className="text-white/40 uppercase text-[10px]">Sleep</p>
                      <p className="font-bold text-[#70C8ED] font-mono mt-0.5">{ci.sleepQuality}/5</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <p className="text-white/40 uppercase text-[10px]">Difficulty</p>
                      <p className="font-bold text-[#FF803E] font-mono mt-0.5">{ci.workoutDifficulty}/5</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <p className="text-white/40 uppercase text-[10px]">Hunger</p>
                      <p className="font-bold text-[#B8E66C] font-mono mt-0.5">{ci.hungerLevel}/5</p>
                    </div>
                  </div>

                  {/* Challenges or Reflections */}
                  {(ci.scheduleChallenges || ci.generalFeedback) && (
                    <div className="space-y-1.5 text-xs text-white/70">
                      {ci.scheduleChallenges && (
                        <p><span className="text-white/40 font-medium">Challenges: </span>{ci.scheduleChallenges}</p>
                      )}
                      {ci.generalFeedback && (
                        <p><span className="text-white/40 font-medium">Notes: </span>{ci.generalFeedback}</p>
                      )}
                    </div>
                  )}

                  {/* Coach Written Review */}
                  {ci.trainerFeedback ? (
                    <div className="p-3.5 rounded-xl bg-[#FF803E]/10 border border-[#FF803E]/20 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-[#FF803E] font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Coach Feedback</span>
                      </div>
                      <p className="text-white/90 italic leading-relaxed">
                        "{ci.trainerFeedback}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 italic">Awaiting coach review.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40 italic">No past weekly check-ins found.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
};
