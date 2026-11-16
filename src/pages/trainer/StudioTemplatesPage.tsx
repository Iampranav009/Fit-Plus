import React, { useMemo, useState } from 'react';
import { Archive, Copy, Edit3, Plus } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type { CompletionType, TaskCategory, TaskTemplate } from '../../types/domain';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassSheet } from '../../components/ui/GlassSheet';
import { InputField, TextAreaField } from '../../components/ui/InputField';

export const StudioTemplatesPage: React.FC = () => {
  const {
    store,
    activeTrainer,
    saveTemplate,
    duplicateTemplate,
    toggleArchiveTemplate,
  } = useApp();

  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('workout');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [completionType, setCompletionType] = useState<CompletionType>('checkbox');
  const [instructions, setInstructions] = useState('');
  const [isRecoveryDefault, setIsRecoveryDefault] = useState(false);
  const [isOptionalDefault, setIsOptionalDefault] = useState(false);

  const templates = useMemo(
    () =>
      store.templates.filter(
        (t) => t.trainerId === activeTrainer?.id && (showArchived ? t.archived : !t.archived),
      ),
    [store.templates, activeTrainer?.id, showArchived],
  );

  const openNew = () => {
    setEditingId(undefined);
    setTitle('');
    setCategory('workout');
    setDurationMinutes(35);
    setCompletionType('checkbox');
    setInstructions('');
    setIsRecoveryDefault(false);
    setIsOptionalDefault(false);
    setModalOpen(true);
  };

  const openEdit = (tpl: TaskTemplate) => {
    setEditingId(tpl.id);
    setTitle(tpl.title);
    setCategory(tpl.category);
    setDurationMinutes(tpl.durationMinutes);
    setCompletionType(tpl.completionType);
    setInstructions(tpl.instructions);
    setIsRecoveryDefault(tpl.isRecoveryDefault);
    setIsOptionalDefault(tpl.isOptionalDefault);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveTemplate({
      id: editingId,
      title: title.trim(),
      category,
      durationMinutes,
      completionType,
      instructions: instructions.trim() || 'Follow coach instructions.',
      targetLabel: `${durationMinutes} min`,
      isRecoveryDefault,
      isOptionalDefault,
      archived: false,
    });
    setModalOpen(false);
  };

  return (
    <AppShell pageTitle="Templates">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] text-[#7C8393]">Reusable task playbook</p>
            <h1 className="mt-1 text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
              {COPY.trainer.templatesTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Show active' : 'View archived'}
            </GlassButton>
            <GlassButton size="sm" onClick={openNew}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              New template
            </GlassButton>
          </div>
        </div>

        <div className="grid gap-3">
          {templates.length === 0 ? (
            <div className="surface-card rounded-[22px] p-8 text-center text-[14px] text-[#A2A8B5]">
              {showArchived ? 'No archived templates.' : 'Create your first template to speed up client assignments.'}
            </div>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="surface-card rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-[16px] font-semibold text-[#F5F5F7]">{tpl.title}</p>
                  <p className="text-[12px] text-[#7C8393] capitalize tabular-nums">
                    {tpl.category} · {tpl.durationMinutes} min · {tpl.completionType.replace('_', ' ')}
                    {tpl.isRecoveryDefault ? ' · Recovery' : ''}
                    {tpl.isOptionalDefault ? ' · Optional' : ''}
                  </p>
                  <p className="text-[14px] text-[#A2A8B5] line-clamp-2">{tpl.instructions}</p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <GlassButton size="sm" variant="secondary" onClick={() => openEdit(tpl)}>
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    Edit
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => duplicateTemplate(tpl.id)}
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Duplicate
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="tertiary"
                    onClick={() => toggleArchiveTemplate(tpl.id)}
                  >
                    <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                    {tpl.archived ? 'Restore' : 'Archive'}
                  </GlassButton>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <GlassSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit template' : 'New template'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <InputField
            label="Template title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
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
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value) || 5))}
            />
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
              Completion type
              <select
                value={completionType}
                onChange={(e) => setCompletionType(e.target.value as CompletionType)}
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
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <div className="flex flex-wrap gap-4 text-[13px] text-[#F5F5F7]">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecoveryDefault}
                onChange={(e) => setIsRecoveryDefault(e.target.checked)}
                className="h-4 w-4 accent-[#FF803E]"
              />
              Recovery default
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOptionalDefault}
                onChange={(e) => setIsOptionalDefault(e.target.checked)}
                className="h-4 w-4 accent-[#FF803E]"
              />
              Optional default
            </label>
          </div>
          <div className="flex gap-2.5 pt-2">
            <GlassButton type="button" variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" fullWidth>
              Save template
            </GlassButton>
          </div>
        </form>
      </GlassSheet>
    </AppShell>
  );
};
