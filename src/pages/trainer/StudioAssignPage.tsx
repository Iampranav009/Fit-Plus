import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { CompletionType, GoalFocus, TaskCategory } from '../../types/domain';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSegmentedControl } from '../../components/ui/GlassSegmentedControl';
import { InputField, TextAreaField } from '../../components/ui/InputField';
import { GlassModal } from '../../components/ui/GlassModal';

export const StudioAssignPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    store,
    todayKey,
    activeTrainer,
    linkedClientsForActiveTrainer,
    runBulkAssignment,
    switchDemoPersona,
  } = useApp();

  const preselected =
    (location.state as { preselectedClientIds?: string[] } | null)?.preselectedClientIds ??
    [];

  const activeTemplates = useMemo(
    () => store.templates.filter((t) => t.trainerId === activeTrainer?.id && !t.archived),
    [store.templates, activeTrainer?.id],
  );

  const [sourceMode, setSourceMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    activeTemplates[0]?.id || '',
  );

  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState<TaskCategory>('habit');
  const [customInstructions, setCustomInstructions] = useState('');
  const [customDuration, setCustomDuration] = useState(20);
  const [customCompletionType, setCustomCompletionType] = useState<CompletionType>('checkbox');
  const [isRecovery, setIsRecovery] = useState(false);
  const [isOptional, setIsOptional] = useState(false);

  const [recipientIds, setRecipientIds] = useState<string[]>(
    preselected.length > 0 ? preselected : ['cl_aarav'],
  );
  const [startDateKey, setStartDateKey] = useState(todayKey);
  const [recurrenceDays, setRecurrenceDays] = useState(3);
  const [dueTime, setDueTime] = useState('8:00 PM');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  const selectedTemplate = activeTemplates.find((t) => t.id === selectedTemplateId);

  const toggleRecipient = (id: string) => {
    setRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectGoalGroup = (focus: GoalFocus) => {
    const matching = linkedClientsForActiveTrainer
      .filter((c) => c.primaryGoal === focus)
      .map((c) => c.id);
    setRecipientIds(matching);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceMode === 'template' && !selectedTemplate) {
      setError('Select a task template or switch to custom task.');
      return;
    }
    if (sourceMode === 'custom' && !customTitle.trim()) {
      setError('Enter a task title.');
      return;
    }
    if (recipientIds.length === 0) {
      setError('Select at least one client recipient.');
      return;
    }
    setError('');
    setConfirmOpen(true);
  };

  const handleConfirmBulk = () => {
    const res = runBulkAssignment({
      clientIds: recipientIds,
      template: sourceMode === 'template' ? selectedTemplate : undefined,
      customTask:
        sourceMode === 'custom'
          ? {
              title: customTitle,
              category: customCategory,
              instructions: customInstructions || 'Follow coach instructions.',
              durationMinutes: customDuration,
              completionType: customCompletionType,
              isRecovery,
              isOptional,
            }
          : undefined,
      startDateKey,
      recurrenceDays,
      dueTime,
      skipDuplicates,
    });
    setConfirmOpen(false);
    setLastResult({ created: res.createdCount, skipped: res.skippedCount });
  };

  const impactedClients = linkedClientsForActiveTrainer.filter((c) =>
    recipientIds.includes(c.id),
  );

  return (
    <AppShell pageTitle="Assign commitments">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <p className="text-[13px] text-[#7C8393]">Bulk & individual programming</p>
          <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
            {COPY.trainer.assignTitle}
          </h1>
        </div>

        {lastResult ? (
          <div className="surface-card rounded-[20px] border-[#B8E66C]/45 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#B8E66C] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-[15px] font-semibold text-[#F5F5F7]">
                  Created {lastResult.created} individual assignment record
                  {lastResult.created === 1 ? '' : 's'}
                  {lastResult.skipped > 0 ? ` (${lastResult.skipped} duplicate skipped)` : ''}.
                </p>
                <p className="text-[13px] text-[#A2A8B5]">
                  Resulting tasks are now live in the client demo view while preserving individual overrides.
                </p>
              </div>
            </div>
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => {
                switchDemoPersona('usr_client_aarav');
                navigate('/app/home');
              }}
            >
              Preview in Aarav's Today
            </GlassButton>
          </div>
        ) : null}

        <form onSubmit={handleReviewSubmit} className="flex flex-col gap-6">
          {/* Step 1: Template or Custom Task */}
          <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold text-[#F5F5F7]">1. Choose commitment</h2>
              <GlassSegmentedControl
                ariaLabel="Assignment source"
                value={sourceMode}
                onChange={setSourceMode}
                size="sm"
                options={[
                  { id: 'template', label: 'Use template' },
                  { id: 'custom', label: 'Create task' },
                ]}
              />
            </div>

            {sourceMode === 'template' ? (
              <div className="grid gap-2.5">
                {activeTemplates.map((tpl) => {
                  const selected = selectedTemplateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      aria-pressed={selected}
                      className={`text-left rounded-[16px] p-4 border cursor-pointer transition-colors ${
                        selected
                          ? 'bg-[#FF803E]/12 border-[#FF803E]'
                          : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold text-[#F5F5F7]">
                          {tpl.title}
                        </span>
                        <span className="text-[12px] text-[#7C8393] capitalize tabular-nums">
                          {tpl.category} · {tpl.durationMinutes} min
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[#A2A8B5] line-clamp-2">
                        {tpl.instructions}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <InputField
                  label="Task title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., 15-min post-dinner walk"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                    Category
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as TaskCategory)}
                      className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
                    >
                      <option value="workout">Workout</option>
                      <option value="nutrition">Nutrition</option>
                      <option value="habit">Habit</option>
                      <option value="recovery">Recovery</option>
                      <option value="check_in">Check-in</option>
                    </select>
                  </label>
                  <InputField
                    label="Duration"
                    unit="min"
                    type="number"
                    min={5}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Math.max(5, Number(e.target.value) || 5))}
                  />
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                    Completion type
                    <select
                      value={customCompletionType}
                      onChange={(e) =>
                        setCustomCompletionType(e.target.value as CompletionType)
                      }
                      className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
                    >
                      <option value="checkbox">Checkbox</option>
                      <option value="log_value">Log value</option>
                      <option value="session_log">Session log</option>
                    </select>
                  </label>
                </div>
                <TextAreaField
                  label="Instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Clear, calm guidance for the client."
                />
                <div className="flex flex-wrap gap-4 pt-1 text-[13px] text-[#F5F5F7]">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecovery}
                      onChange={(e) => setIsRecovery(e.target.checked)}
                      className="h-4 w-4 accent-[#FF803E]"
                    />
                    Counts as recovery commitment
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOptional}
                      onChange={(e) => setIsOptional(e.target.checked)}
                      className="h-4 w-4 accent-[#FF803E]"
                    />
                    Optional (does not affect streak)
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Choose Recipients or Group */}
          <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold text-[#F5F5F7]">2. Choose recipients</h2>
              <div className="flex flex-wrap gap-1.5">
                <GlassButton
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => selectGoalGroup('weight_management')}
                >
                  Weight management group
                </GlassButton>
                <GlassButton
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => selectGoalGroup('muscle_strength')}
                >
                  Muscle gain group
                </GlassButton>
                <GlassButton
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => selectGoalGroup('general_fitness')}
                >
                  General fitness group
                </GlassButton>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {linkedClientsForActiveTrainer.map((client) => {
                const checked = recipientIds.includes(client.id);
                return (
                  <label
                    key={client.id}
                    className={`rounded-[14px] p-3.5 border flex items-center gap-3 cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[#FF803E]/12 border-[#FF803E]'
                        : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecipient(client.id)}
                      className="h-4 w-4 accent-[#FF803E]"
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#F5F5F7] truncate">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-[12px] text-[#7C8393] capitalize truncate">
                        {client.primaryGoal.replaceAll('_', ' ')}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Step 3: Schedule & Duplicate Rules */}
          <section className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">3. Schedule & safeguards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InputField
                label="Start date"
                type="date"
                value={startDateKey}
                onChange={(e) => setStartDateKey(e.target.value)}
              />
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                Recurrence
                <select
                  value={recurrenceDays}
                  onChange={(e) => setRecurrenceDays(Number(e.target.value))}
                  className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
                >
                  <option value={1}>Single day (1 day)</option>
                  <option value={3}>3 consecutive days</option>
                  <option value={7}>Full week (7 days)</option>
                  <option value={14}>2 weeks (14 days)</option>
                </select>
              </label>
              <InputField
                label="Due time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="8:00 PM"
              />
            </div>

            <label className="inline-flex items-center gap-2.5 text-[14px] text-[#F5F5F7] cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="h-4 w-4 accent-[#FF803E]"
              />
              Skip duplicates if client already has this commitment scheduled in the date range
            </label>
          </section>

          {error ? (
            <p role="alert" className="text-[13px] text-[#FF6B70]">
              {error}
            </p>
          ) : null}

          <GlassButton type="submit" fullWidth>
            Review assignments ({recipientIds.length} client{recipientIds.length === 1 ? '' : 's'})
          </GlassButton>
        </form>
      </div>

      {/* Bulk Confirmation Modal */}
      <GlassModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={formatCopy(COPY.trainer.bulkConfirmTitle, { count: impactedClients.length })}
        description={COPY.trainer.bulkConfirmSupport}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] surface-elevated p-4 space-y-2 text-[14px]">
            <p className="font-semibold text-[#F5F5F7]">
              {sourceMode === 'template' ? selectedTemplate?.title : customTitle}
            </p>
            <p className="text-[#A2A8B5] tabular-nums">
              Starts {startDateKey} · {recurrenceDays} day{recurrenceDays === 1 ? '' : 's'} · Due{' '}
              {dueTime}
            </p>
            <p className="text-[13px] text-[#7C8393]">
              Recipients: {impactedClients.map((c) => `${c.firstName} ${c.lastName}`).join(', ')}
            </p>
          </div>

          <div className="flex gap-2.5">
            <GlassButton variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton fullWidth onClick={handleConfirmBulk}>
              Confirm assignments
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </AppShell>
  );
};
