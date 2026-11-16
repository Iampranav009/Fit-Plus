import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { formatIndiaDate } from '../../lib/date';
import { computeClientAdherencePercent, computeStreakSummary } from '../../lib/streak';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { TextAreaField } from '../../components/ui/InputField';
import { TrendChart } from '../../components/ui/TrendChart';
import { ActivityRing } from '../../components/ui/ActivityRing';

export const StudioClientDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    store,
    todayKey,
    isClientLinkedToActiveTrainer,
    updateClientCoachNotes,
  } = useApp();

  const isLinked = isClientLinkedToActiveTrainer(id);
  const client = store.clients.find((c) => c.id === id);

  const [notes, setNotes] = useState(client?.coachNotes || '');

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
  const goal = useMemo(
    () => store.goals.find((g) => g.clientId === id),
    [store.goals, id],
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

  const adherence = computeClientAdherencePercent(id, store.assignments, store.completions, todayKey, 7);
  const streak = computeStreakSummary(clientAssignments, clientCompletions, todayKey);

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

        {/* Coach Notes */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateClientCoachNotes(client.id, notes);
          }}
          className="surface-card rounded-[22px] p-5 flex flex-col gap-3"
        >
          <TextAreaField
            label="Private coach notes (demo)"
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
