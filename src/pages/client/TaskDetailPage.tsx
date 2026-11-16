import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';
import { MuscleGroupEmblem } from '../../components/ui/FitnessIllustrations';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    store,
    todayKey,
    activeClient,
    toggleAssignmentCompletion,
    saveAssignmentLog,
  } = useApp();

  const assignment = useMemo(
    () =>
      store.assignments.find(
        (a) => a.id === id && (!activeClient || a.clientId === activeClient.id),
      ),
    [store.assignments, id, activeClient],
  );

  const completion = useMemo(() => {
    if (!assignment || !activeClient) return undefined;
    return store.completions.find(
      (c) =>
        c.assignmentId === assignment.id &&
        c.clientId === activeClient.id &&
        c.dateKey === todayKey,
    );
  }, [assignment, activeClient, store.completions, todayKey]);

  const [loggedValue, setLoggedValue] = useState(
    completion?.loggedValue ||
      (assignment?.completionType === 'log_value'
        ? '8200'
        : assignment?.durationMinutes
          ? `${assignment.durationMinutes} min`
          : ''),
  );
  const [notes, setNotes] = useState(completion?.notes || '');

  if (!assignment) {
    return (
      <AppShell pageTitle="Commitment">
        <div className="max-w-xl mx-auto py-12 text-center space-y-4">
          <h1 className="text-[24px] font-semibold text-[#F5F5F7]">Commitment not found</h1>
          <GlassButton onClick={() => navigate('/app/home')}>Back to Today</GlassButton>
        </div>
      </AppShell>
    );
  }

  const isCompleted = Boolean(completion);

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    saveAssignmentLog(assignment.id, todayKey, loggedValue, notes);
  };

  return (
    <AppShell pageTitle="Commitment detail">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link
          to="/app/home"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] min-h-[44px] self-start"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Today
        </Link>

        <section className="rounded-[24px] surface-card p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#7C8393] tabular-nums">
                <span className="capitalize">
                  {assignment.category.replace('_', ' ')} · {assignment.durationMinutes} min · Due{' '}
                  {assignment.dueTime}
                </span>
                {assignment.isOptional ? <span>· {COPY.client.optional}</span> : null}
              </div>

              <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em] text-[#F5F5F7]">
                {assignment.title}
              </h1>
            </div>
            <MuscleGroupEmblem
              focus={
                assignment.category === 'recovery'
                  ? 'core'
                  : assignment.category === 'habit'
                    ? 'conditioning'
                    : 'upper'
              }
              size={48}
            />
          </div>

          {assignment.targetLabel ? (
            <p className="text-[14px] font-medium text-[#FFB06B]">
              Target: {assignment.targetLabel}
            </p>
          ) : null}

          <div className="pt-3 border-t border-white/[0.08]">
            <h2 className="text-[14px] font-semibold text-[#F5F5F7]">Coach's instructions</h2>
            <p className="mt-1.5 text-[15px] text-[#A2A8B5] leading-relaxed whitespace-pre-line">
              {assignment.instructions}
            </p>
          </div>

          {assignment.hasCustomOverride && assignment.overrideNote ? (
            <div className="rounded-[14px] surface-elevated p-3.5 text-[13px] text-[#A2A8B5]">
              <span className="text-[#FFB06B] font-medium">Coach adjustment: </span>
              {assignment.overrideNote}
            </div>
          ) : null}
        </section>

        <form
          onSubmit={handleSaveLog}
          className="rounded-[24px] surface-card p-6 flex flex-col gap-4"
        >
          <h2 className="text-[18px] font-semibold text-[#F5F5F7]">
            {assignment.completionType === 'checkbox' ? 'Completion & notes' : COPY.client.logActivity}
          </h2>

          {assignment.completionType !== 'checkbox' ? (
            <InputField
              label={
                assignment.completionType === 'log_value'
                  ? 'Logged value (e.g., steps or weight)'
                  : 'Session summary (e.g., 45 min · all working sets)'
              }
              value={loggedValue}
              onChange={(e) => setLoggedValue(e.target.value)}
            />
          ) : null}

          <TextAreaField
            label="Session notes"
            optionalTag="Optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did energy, tempo, or meals feel today?"
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <GlassButton type="submit" fullWidth>
              {isCompleted ? 'Save updated log' : 'Complete & save log'}
            </GlassButton>
            {isCompleted ? (
              <GlassButton
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => toggleAssignmentCompletion(assignment.id, todayKey)}
              >
                {COPY.client.undo}
              </GlassButton>
            ) : null}
          </div>

          {isCompleted ? (
            <p className="text-[13px] text-[#B8E66C] flex items-center gap-1.5">
              <Check className="w-4 h-4" aria-hidden="true" />
              Completed for today ({todayKey}).
            </p>
          ) : null}
        </form>
      </div>
    </AppShell>
  );
};
