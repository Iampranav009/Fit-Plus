import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Check, ClipboardCheck, Dumbbell, MessageSquare, Pencil, Plus, Shield, Sparkles, UtensilsCrossed } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import * as supabaseService from '../../data/supabaseService';
import { formatIndiaDate } from '../../lib/date';
import { computeClientAdherencePercent, computeStreakSummary } from '../../lib/streak';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';
import type { ClientFeatureAccess, ClientFeatureKey } from '../../types/domain';
import { DEFAULT_FEATURE_ACCESS } from '../../types/domain';
import { TrendChart } from '../../components/ui/TrendChart';
import { ActivityRing } from '../../components/ui/ActivityRing';

export const StudioClientDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    store,
    todayKey,
    isCloudSynced,
    dailyActivities,
    clientGroups,
    clientGroupMembers,
    getClientApprovedRecoveryDates,
    toggleClientGroupMember,
    toggleClientRecoveryDay,
    isClientLinkedToActiveTrainer,
    updateClientCoachNotes,
    updateClientFeatureAccess,
    cancelClientSubscription,
    subscriptions,
    pushToast,
    workoutSessions,
    nutritionLogs,
    weeklyCheckIns,
    saveNutritionTrainerFeedback,
    saveWeeklyCheckInTrainerFeedback,
  } = useApp();

  const isLinked = isClientLinkedToActiveTrainer(id);
  const client = store.clients.find((c) => c.id === id);

  const [notes, setNotes] = useState(client?.coachNotes || '');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [sharedPhotoUrls, setSharedPhotoUrls] = useState<Record<string, string>>({});
  const [editingNutriId, setEditingNutriId] = useState<string | null>(null);
  const [nutriFeedbackText, setNutriFeedbackText] = useState('');
  const [editingCheckInId, setEditingCheckInId] = useState<string | null>(null);
  const [checkInFeedbackText, setCheckInFeedbackText] = useState('');
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({ age: '', weightKg: '', targetWeightKg: '', healthLimitations: '' });
  const [confirmCancelSubId, setConfirmCancelSubId] = useState<string | null>(null);

  useEffect(() => {
    setNotes(client?.coachNotes || '');
  }, [client?.coachNotes]);

  const clientAssignments = useMemo(
    () => store.assignments.filter((a) => a.clientId === id),
    [store.assignments, id],
  );
  const clientCompletions = useMemo(
    () => store.completions.filter((c) => c.clientId === id),
    [store.completions, id],
  );
  const clientProgress = useMemo(
    () => store.progressEvents.filter((p) => p.clientId === id && p.metricType === 'weight'),
    [store.progressEvents, id],
  );
  const sharedPhotoEvents = useMemo(
    () =>
      store.progressEvents
        .filter((p) => p.clientId === id && p.shareWithTrainer && Boolean(p.photoPath))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [store.progressEvents, id],
  );
  const recentMeasurements = useMemo(
    () =>
      store.progressEvents
        .filter((p) => p.clientId === id)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .slice(0, 6),
    [store.progressEvents, id],
  );
  const goal = useMemo(
    () => store.goals.find((g) => g.clientId === id),
    [store.goals, id],
  );

  const activeRelationship = useMemo(
    () => store.relationships.find((r) => r.clientId === id && r.status === 'active'),
    [store.relationships, id],
  );

  const featureAccess: ClientFeatureAccess = activeRelationship?.featureAccess ?? { ...DEFAULT_FEATURE_ACCESS };

  const clientSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.clientId === id),
    [subscriptions, id],
  );

  const clientWorkoutSessions = useMemo(
    () =>
      workoutSessions
        .filter((s) => s.clientId === id)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [workoutSessions, id],
  );

  const clientNutritionLogs = useMemo(
    () =>
      nutritionLogs
        .filter((l) => l.clientId === id)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [nutritionLogs, id],
  );

  const clientWeeklyCheckIns = useMemo(
    () =>
      weeklyCheckIns
        .filter((c) => c.clientId === id)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [weeklyCheckIns, id],
  );

  useEffect(() => {
    if (!isCloudSynced) return;
    let active = true;
    for (const ev of sharedPhotoEvents) {
      if (!ev.photoPath || sharedPhotoUrls[ev.id]) continue;
      void supabaseService
        .getStorageFileDownloadUrl(ev.photoPath)
        .then((url) => {
          if (active) setSharedPhotoUrls((prev) => ({ ...prev, [ev.id]: url }));
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [isCloudSynced, sharedPhotoEvents, sharedPhotoUrls]);

  const approvedRecoveryDates = useMemo(
    () => getClientApprovedRecoveryDates(id),
    [getClientApprovedRecoveryDates, id],
  );

  const isTodayRecoveryApproved = useMemo(
    () =>
      dailyActivities.some(
        (d) => d.clientId === id && d.dateKey === todayKey && d.recoveryApproved === true,
      ),
    [dailyActivities, id, todayKey],
  );

  // Role-scoped access check: never display unrelated client fixtures to the trainer
  if (!client || !isLinked) {
    return (
      <AppShell pageTitle="Client access">
        <div className="max-w-xl mx-auto py-12 surface-card rounded-[22px] p-6 text-center space-y-4">
          <h1 className="text-[22px] font-semibold text-[#F5F5F7]">
            {COPY.trainer.noAccessTitle}
          </h1>
          <p className="text-[14px] text-[#A2A8B5]">
            Trainers can only view clients who have explicitly accepted an invitation or package.
          </p>
          <GlassButton onClick={() => navigate('/studio/clients')}>Back to clients</GlassButton>
        </div>
      </AppShell>
    );
  }

  const adherence = computeClientAdherencePercent(
    id,
    store.assignments,
    store.completions,
    todayKey,
    7,
    approvedRecoveryDates,
  );
  const streak = computeStreakSummary(
    clientAssignments,
    clientCompletions,
    todayKey,
    120,
    approvedRecoveryDates,
  );

  const handleToggleFeature = (key: ClientFeatureKey) => {
    if (!activeRelationship) return;
    const next = { ...featureAccess, [key]: !featureAccess[key] };
    updateClientFeatureAccess(activeRelationship.id, next);
  };

  const handleSaveDetails = () => {
    if (!client) return;
    const updates: Partial<typeof client> = {};
    const ageNum = parseInt(detailsDraft.age, 10);
    if (!isNaN(ageNum) && ageNum > 0 && ageNum !== client.age) updates.age = ageNum;
    const wNum = parseFloat(detailsDraft.weightKg);
    if (!isNaN(wNum) && wNum > 0 && wNum !== client.weightKg) updates.weightKg = wNum;
    const twNum = parseFloat(detailsDraft.targetWeightKg);
    if (!isNaN(twNum) && twNum > 0 && twNum !== client.targetWeightKg) updates.targetWeightKg = twNum;
    if (detailsDraft.healthLimitations !== (client.healthLimitations ?? '')) {
      updates.healthLimitations = detailsDraft.healthLimitations || undefined;
    }
    if (Object.keys(updates).length > 0) {
      if (isCloudSynced) {
        void supabaseService.updateClientProfileDoc(client.id, updates);
      }
      pushToast('Client details saved.');
    }
    setEditingDetails(false);
  };

  const handleToggleRecovery = async () => {
    setRecoveryBusy(true);
    try {
      await toggleClientRecoveryDay(client.id, todayKey, !isTodayRecoveryApproved);
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <AppShell pageTitle={`${client.firstName} ${client.lastName}`}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/studio/clients"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to clients
          </Link>

          <div className="flex flex-wrap gap-2">
            <GlassButton
              size="sm"
              variant={isTodayRecoveryApproved ? 'secondary' : 'glass'}
              disabled={recoveryBusy}
              onClick={() => void handleToggleRecovery()}
            >
              <Sparkles className="w-4 h-4 text-[#C1ACF9]" aria-hidden="true" />
              {isTodayRecoveryApproved
                ? 'Approved recovery today'
                : 'Approve recovery day'}
            </GlassButton>
            <GlassButton
              size="sm"
              onClick={() =>
                navigate('/studio/assign', { state: { preselectedClientIds: [client.id] } })
              }
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Assign commitment
            </GlassButton>
          </div>
        </div>

        {/* Client Header & Derived Metrics */}
        <section className="surface-card rounded-[24px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                {client.firstName} {client.lastName}
              </h1>
              <p className="mt-1 text-[14px] text-[#A2A8B5] capitalize">
                {client.primaryGoal.replaceAll('_', ' ')} · {client.experienceLevel} ·{' '}
                {client.daysPerWeek} days/week · {client.environment}
              </p>
            </div>
            <div className="flex items-center gap-5 tabular-nums">
              <ActivityRing percent={adherence} size={64} strokeWidth={6} label={`${adherence}% adherence`} />
              <div>
                <p className="text-[12px] text-[#7C8393]">7d adherence</p>
                <p className="text-[22px] font-semibold text-[#FF803E]">{adherence}%</p>
              </div>
              <div>
                <p className="text-[12px] text-[#7C8393]">Streak</p>
                <p className="text-[22px] font-semibold text-[#F5F5F7]">
                  {streak.currentStreak}d
                </p>
              </div>
            </div>
          </div>

          {goal ? (
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-[14px]">
              <span className="text-[#F5F5F7] font-medium">Goal: {goal.title}</span>
              <span className="text-[#A2A8B5] tabular-nums">
                Start {goal.startValue} {goal.unit} · Current {goal.currentValue} {goal.unit} · Target{' '}
                {goal.targetValue} {goal.unit}
              </span>
            </div>
          ) : null}
        </section>

        {/* Client Intake Profile & Custom Group Memberships */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-card rounded-[22px] p-5 space-y-2.5 text-[13px]">
            <h2 className="text-[16px] font-semibold text-[#F5F5F7]">Intake profile</h2>
            <p className="text-[#A2A8B5] tabular-nums">
              Age: {client.age ?? 'Not set'} · Height: {client.heightCm ? `${client.heightCm} cm` : 'Not set'} · Weight: {client.weightKg ? `${client.weightKg} kg` : 'Not set'}
              {client.targetWeightKg ? ` → Target ${client.targetWeightKg} kg` : ''}
            </p>
            <p className="text-[#A2A8B5] capitalize">
              Diet: {client.dietaryPreference.replaceAll('_', ' ')}
              {client.preferredLanguage ? ` · Language: ${client.preferredLanguage}` : ''}
            </p>
            {client.foodAllergies ? (
              <p className="text-[#FFB06B]">Allergies: {client.foodAllergies}</p>
            ) : null}
            {client.healthLimitations ? (
              <p className="text-[#A2A8B5]">Limitations: {client.healthLimitations}</p>
            ) : null}
            {client.coachingPreferences ? (
              <p className="text-[#A2A8B5]">Coaching preference: {client.coachingPreferences}</p>
            ) : null}
          </div>

          <div className="surface-card rounded-[22px] p-5 space-y-3">
            <h2 className="text-[16px] font-semibold text-[#F5F5F7]">Custom groups</h2>
            {clientGroups.length === 0 ? (
              <p className="text-[13px] text-[#7C8393]">
                Create groups in the Clients directory to organize this client into batches.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {clientGroups.map((grp) => {
                  const isMember = clientGroupMembers.some(
                    (m) => m.groupId === grp.id && m.clientId === client.id,
                  );
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => toggleClientGroupMember(grp.id, client.id)}
                      aria-pressed={isMember}
                      className={`min-h-[38px] px-3 py-1.5 rounded-[10px] border text-[13px] font-medium cursor-pointer transition-colors ${
                        isMember
                          ? 'bg-[#FF803E]/18 border-[#FF803E] text-[#FFB06B]'
                          : 'bg-[#101218] border-white/[0.08] text-[#A2A8B5] hover:text-[#F5F5F7]'
                      }`}
                    >
                      {isMember ? `✓ ${grp.name}` : `+ ${grp.name}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Feature Access Control */}
        {activeRelationship && (
          <section className="surface-card rounded-[22px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#70C8ED]" />
              <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Feature access</h2>
            </div>
            <p className="text-[13px] text-[#7C8393]">
              Toggle which premium features this client can use. Changes apply immediately.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { key: 'workout_studio' as ClientFeatureKey, label: 'Workout Studio', desc: 'Live workout tracking & logging' },
                { key: 'nutrition_studio' as ClientFeatureKey, label: 'Nutrition Studio', desc: 'Nutrition diary & meal logging' },
                { key: 'exercise_library' as ClientFeatureKey, label: 'Exercise Library', desc: 'Full exercise database & guides' },
              ]).map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggleFeature(key)}
                  className={`p-4 rounded-[16px] border text-left transition-colors cursor-pointer ${
                    featureAccess[key]
                      ? 'bg-[#FF803E]/12 border-[#FF803E]/40'
                      : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[14px] font-semibold ${featureAccess[key] ? 'text-[#FFB06B]' : 'text-[#A2A8B5]'}`}>
                      {label}
                    </span>
                    <div className={`w-9 h-5 rounded-full flex items-center transition-colors ${featureAccess[key] ? 'bg-[#FF803E] justify-end' : 'bg-white/10 justify-start'}`}>
                      <div className="w-4 h-4 rounded-full bg-white mx-0.5" />
                    </div>
                  </div>
                  <p className="text-[12px] text-[#7C8393]">{desc}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Subscription Management */}
        {clientSubscriptions.length > 0 && (
          <section className="surface-card rounded-[22px] p-5 space-y-3">
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Subscriptions</h2>
            {clientSubscriptions.map((sub) => (
              <div key={sub.id} className="rounded-[16px] surface-elevated p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-[#F5F5F7]">{sub.packageName}</p>
                  <p className="text-[12px] text-[#A2A8B5] tabular-nums">
                    ₹{sub.priceInr} / {sub.cadence} ·{' '}
                    <span className={sub.status === 'active' ? 'text-[#B8E66C]' : 'text-[#FF6B70]'}>
                      {sub.status}
                    </span>
                    {sub.currentPeriodEnd ? ` · Ends ${formatIndiaDate(sub.currentPeriodEnd.slice(0, 10), 'short')}` : ''}
                  </p>
                </div>
                {sub.status === 'active' && (
                  <div className="flex gap-2">
                    {confirmCancelSubId === sub.id ? (
                      <>
                        <GlassButton size="sm" variant="secondary" onClick={() => setConfirmCancelSubId(null)}>
                          Keep
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          onClick={() => {
                            cancelClientSubscription(sub.id);
                            setConfirmCancelSubId(null);
                          }}
                        >
                          <Ban className="w-3.5 h-3.5" /> Confirm cancel
                        </GlassButton>
                      </>
                    ) : (
                      <GlassButton size="sm" variant="secondary" onClick={() => setConfirmCancelSubId(sub.id)}>
                        <Ban className="w-3.5 h-3.5" /> Cancel subscription
                      </GlassButton>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Edit Client Details */}
        <section className="surface-card rounded-[22px] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Client details</h2>
            {!editingDetails && (
              <GlassButton
                size="sm"
                variant="glass"
                onClick={() => {
                  setDetailsDraft({
                    age: String(client.age ?? ''),
                    weightKg: String(client.weightKg ?? ''),
                    targetWeightKg: String(client.targetWeightKg ?? ''),
                    healthLimitations: client.healthLimitations ?? '',
                  });
                  setEditingDetails(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </GlassButton>
            )}
          </div>
          {editingDetails ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InputField label="Age" type="number" value={detailsDraft.age} onChange={(e) => setDetailsDraft((d) => ({ ...d, age: e.target.value }))} />
                <InputField label="Weight (kg)" type="number" value={detailsDraft.weightKg} onChange={(e) => setDetailsDraft((d) => ({ ...d, weightKg: e.target.value }))} />
                <InputField label="Target weight (kg)" type="number" value={detailsDraft.targetWeightKg} onChange={(e) => setDetailsDraft((d) => ({ ...d, targetWeightKg: e.target.value }))} />
              </div>
              <TextAreaField
                label="Health limitations"
                value={detailsDraft.healthLimitations}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, healthLimitations: e.target.value }))}
                placeholder="Injuries, conditions, or movement restrictions."
              />
              <div className="flex gap-2">
                <GlassButton size="sm" onClick={handleSaveDetails}>
                  <Check className="w-4 h-4" /> Save changes
                </GlassButton>
                <GlassButton size="sm" variant="secondary" onClick={() => setEditingDetails(false)}>
                  Cancel
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-[#A2A8B5] space-y-1.5">
              <p>Age: {client.age ?? 'Not set'} · Weight: {client.weightKg ? `${client.weightKg} kg` : 'Not set'}{client.targetWeightKg ? ` → Target ${client.targetWeightKg} kg` : ''}</p>
              <p className="capitalize">Goal: {client.primaryGoal.replaceAll('_', ' ')} · Level: {client.experienceLevel} · {client.daysPerWeek} days/week</p>
              {client.healthLimitations && <p>Limitations: {client.healthLimitations}</p>}
            </div>
          )}
        </section>

        {/* Assigned Tasks */}
        <section className="surface-card rounded-[22px] p-5">
          <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Assigned commitments</h2>
          {clientAssignments.length === 0 ? (
            <p className="mt-2 text-[14px] text-[#7C8393]">No commitments assigned yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.08]">
              {clientAssignments.map((asg) => (
                <li key={asg.id} className="py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-medium text-[#F5F5F7]">{asg.title}</span>
                    <span className="text-[12px] text-[#7C8393] tabular-nums">
                      {asg.scheduledDates.length} scheduled dates · {asg.durationMinutes} min
                    </span>
                  </div>
                  {asg.hasCustomOverride && asg.overrideNote ? (
                    <p className="text-[12px] text-[#FFB06B]">
                      Custom override preserved: {asg.overrideNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {clientProgress.length > 0 ? (
          <TrendChart
            title="Logged weight history"
            unit="kg"
            points={clientProgress.map((p) => ({
              id: p.id,
              dateKey: p.dateKey,
              value: p.value,
              note: p.note,
            }))}
          />
        ) : null}

        {recentMeasurements.length > 0 ? (
          <section className="surface-card rounded-[22px] p-5">
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Recent measurements & check-ins</h2>
            <ul className="mt-3 divide-y divide-white/[0.08]">
              {recentMeasurements.map((ev) => (
                <li key={ev.id} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                  <div>
                    <p className="text-[#F5F5F7] font-medium">{ev.label}</p>
                    <p className="text-[#7C8393]">
                      {formatIndiaDate(ev.dateKey, 'short')}
                      {ev.note ? ` · ${ev.note}` : ''}
                    </p>
                  </div>
                  <span className="text-[#F5F5F7] font-semibold tabular-nums">
                    {ev.value} {ev.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {sharedPhotoEvents.length > 0 ? (
          <section className="surface-card rounded-[22px] p-5 space-y-3">
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Shared progress photos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sharedPhotoEvents.map((ev) => (
                <div key={ev.id} className="rounded-[14px] surface-elevated p-3 space-y-2">
                  {sharedPhotoUrls[ev.id] ? (
                    <img
                      src={sharedPhotoUrls[ev.id]}
                      alt={`${client.firstName} check-in ${ev.dateKey}`}
                      className="w-full h-44 object-cover rounded-[10px] bg-[#101218]"
                    />
                  ) : (
                    <div className="w-full h-44 rounded-[10px] bg-[#101218] flex items-center justify-center text-[12px] text-[#7C8393]">
                      Loading shared photo...
                    </div>
                  )}
                  <p className="text-[12px] text-[#A2A8B5] tabular-nums">
                    {formatIndiaDate(ev.dateKey, 'short')} · {ev.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Recent Completions */}
        <section className="surface-card rounded-[22px] p-5">
          <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Recent activity</h2>
          {clientCompletions.length === 0 ? (
            <p className="mt-2 text-[14px] text-[#7C8393]">No completions recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.08]">
              {[...clientCompletions]
                .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
                .slice(0, 6)
                .map((cmp) => {
                  const asg = clientAssignments.find((a) => a.id === cmp.assignmentId);
                  return (
                    <li key={cmp.id} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                      <div>
                        <p className="text-[#F5F5F7] font-medium">
                          {asg?.title || 'Commitment'}
                        </p>
                        {cmp.notes ? (
                          <p className="text-[#7C8393]">{cmp.notes}</p>
                        ) : null}
                      </div>
                      <span className="text-[#A2A8B5] tabular-nums shrink-0">
                        {formatIndiaDate(cmp.dateKey, 'short')}
                        {cmp.loggedValue ? ` · ${cmp.loggedValue}` : ''}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        {/* Live Workout Sessions */}
        {clientWorkoutSessions.length > 0 && (
          <section className="surface-card rounded-[22px] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-[#FF803E]" />
              <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Live workout sessions</h2>
            </div>
            <div className="space-y-2.5">
              {clientWorkoutSessions.slice(0, 5).map((sess) => (
                <div
                  key={sess.id}
                  className="rounded-[16px] surface-elevated p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm">{sess.title}</p>
                      {sess.prCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-bold text-[10px]">
                          {sess.prCount} PR{sess.prCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 mt-0.5">
                      {formatIndiaDate(sess.dateKey, 'short')} · {Math.round(sess.durationSeconds / 60)} mins
                    </p>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-white/80">
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase font-sans">Sets</span>
                      <span className="font-bold text-[#B8E66C]">{sess.completedSetsCount}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase font-sans">Volume</span>
                      <span className="font-bold text-[#FF803E]">{sess.totalVolumeKg.toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Daily Nutrition Reviews & Coach Feedback */}
        {clientNutritionLogs.length > 0 && (
          <section className="surface-card rounded-[22px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#B8E66C]" />
              <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Daily nutrition logs</h2>
            </div>

            <div className="space-y-3">
              {clientNutritionLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="rounded-[16px] surface-elevated p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{formatIndiaDate(log.dateKey, 'short')}</p>
                      <p className="text-white/50">
                        {log.items.length} items logged · {log.waterGlasses} water glasses
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNutriId(editingNutriId === log.id ? null : log.id);
                        setNutriFeedbackText(log.trainerFeedback || '');
                      }}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition-colors"
                    >
                      {log.trainerFeedback ? 'Edit Feedback' : 'Add Coach Feedback'}
                    </button>
                  </div>

                  {/* Summary of items */}
                  <div className="flex flex-wrap gap-1.5">
                    {log.items.slice(0, 6).map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-0.5 rounded-md bg-white/5 text-white/70 text-[11px]"
                      >
                        {item.name} (~{item.estimatedCalories} kcal)
                      </span>
                    ))}
                    {log.items.length > 6 && (
                      <span className="text-[11px] text-white/40 self-center">
                        +{log.items.length - 6} more
                      </span>
                    )}
                  </div>

                  {/* Feedback Form / Display */}
                  {editingNutriId === log.id ? (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <textarea
                        rows={2}
                        value={nutriFeedbackText}
                        onChange={(e) => setNutriFeedbackText(e.target.value)}
                        placeholder="Write nutrition guidance or praise for this day..."
                        className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-white focus:border-[#FF803E] focus:outline-none resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNutriId(null)}
                          className="px-3 py-1 rounded-lg text-white/50 hover:text-white"
                        >
                          Cancel
                        </button>
                        <GlassButton
                          size="sm"
                          onClick={() => {
                            saveNutritionTrainerFeedback(log.id, nutriFeedbackText);
                            setEditingNutriId(null);
                          }}
                        >
                          Save Feedback
                        </GlassButton>
                      </div>
                    </div>
                  ) : log.trainerFeedback ? (
                    <div className="p-2.5 rounded-lg bg-[#FF803E]/10 border border-[#FF803E]/20 text-[#FFB06B] italic">
                      "{log.trainerFeedback}"
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Weekly Check-in Reviews */}
        {clientWeeklyCheckIns.length > 0 && (
          <section className="surface-card rounded-[22px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#FF803E]" />
              <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Weekly check-ins</h2>
            </div>

            <div className="space-y-3">
              {clientWeeklyCheckIns.map((ci) => (
                <div key={ci.id} className="rounded-[16px] surface-elevated p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">Week of {formatIndiaDate(ci.weekKey, 'short')}</p>
                      <p className="text-white/50">
                        {ci.weightKg ? `${ci.weightKg} kg · ` : ''}Submitted {formatIndiaDate(ci.dateKey, 'short')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCheckInId(editingCheckInId === ci.id ? null : ci.id);
                        setCheckInFeedbackText(ci.trainerFeedback || '');
                      }}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition-colors"
                    >
                      {ci.trainerFeedback ? 'Edit Review' : 'Add Coach Review'}
                    </button>
                  </div>

                  {/* Ratings */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <span className="text-white/40 block text-[10px]">Energy</span>
                      <span className="font-bold text-[#F59E0B] font-mono">{ci.energyLevel}/5</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <span className="text-white/40 block text-[10px]">Sleep</span>
                      <span className="font-bold text-[#70C8ED] font-mono">{ci.sleepQuality}/5</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <span className="text-white/40 block text-[10px]">Difficulty</span>
                      <span className="font-bold text-[#FF803E] font-mono">{ci.workoutDifficulty}/5</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <span className="text-white/40 block text-[10px]">Hunger</span>
                      <span className="font-bold text-[#B8E66C] font-mono">{ci.hungerLevel}/5</span>
                    </div>
                  </div>

                  {/* Client Reflections */}
                  {(ci.scheduleChallenges || ci.generalFeedback) && (
                    <div className="space-y-1 text-white/80 p-2.5 rounded-lg bg-[#14171F]">
                      {ci.scheduleChallenges && (
                        <p><span className="text-white/40 font-semibold">Challenges: </span>{ci.scheduleChallenges}</p>
                      )}
                      {ci.generalFeedback && (
                        <p><span className="text-white/40 font-semibold">Notes: </span>{ci.generalFeedback}</p>
                      )}
                    </div>
                  )}

                  {/* Feedback Form / Display */}
                  {editingCheckInId === ci.id ? (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <textarea
                        rows={2}
                        value={checkInFeedbackText}
                        onChange={(e) => setCheckInFeedbackText(e.target.value)}
                        placeholder="Write check-in review for client..."
                        className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-white focus:border-[#FF803E] focus:outline-none resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCheckInId(null)}
                          className="px-3 py-1 rounded-lg text-white/50 hover:text-white"
                        >
                          Cancel
                        </button>
                        <GlassButton
                          size="sm"
                          onClick={() => {
                            saveWeeklyCheckInTrainerFeedback(ci.id, checkInFeedbackText);
                            setEditingCheckInId(null);
                          }}
                        >
                          Save Review
                        </GlassButton>
                      </div>
                    </div>
                  ) : ci.trainerFeedback ? (
                    <div className="p-2.5 rounded-lg bg-[#FF803E]/10 border border-[#FF803E]/20 text-[#FFB06B] italic">
                      "{ci.trainerFeedback}"
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Coach Notes */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateClientCoachNotes(client.id, notes);
          }}
          className="surface-card rounded-[22px] p-5 flex flex-col gap-3"
        >
          <TextAreaField
            label={isCloudSynced ? 'Private coach notes' : 'Private coach notes (demo)'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context on injury considerations, travel weeks, or form cues."
          />
          <GlassButton type="submit" size="sm" className="self-start">
            Save coach notes
          </GlassButton>
        </form>
      </div>
    </AppShell>
  );
};
