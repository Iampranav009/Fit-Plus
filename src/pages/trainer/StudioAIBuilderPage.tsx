import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';
import { COPY } from '../../data/copy';
import { useApp } from '../../context/AppContext';
import type {
  AIPlanDraft,
  DietaryPreference,
  ExperienceLevel,
  GoalFocus,
  TrainingEnvironment,
} from '../../types/domain';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassTooltip } from '../../components/ui/GlassTooltip';
import { InputField, TextAreaField } from '../../components/ui/InputField';

export const StudioAIBuilderPage: React.FC = () => {
  const {
    isCloudSynced,
    isDemoSandbox,
    linkedClientsForActiveTrainer,
    aiQuotaRemaining,
    generateAIPlanWithCopilot,
    updateAIDraft,
    approveAndSaveAIDraftAsTemplate,
  } = useApp();
  const navigate = useNavigate();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [objective, setObjective] = useState<GoalFocus>('weight_management');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [environment, setEnvironment] = useState<TrainingEnvironment>('home');
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('vegetarian');
  const [constraints, setConstraints] = useState('Mild knee sensitivity; prefers 40-min sessions');

  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [activeDraft, setActiveDraft] = useState<AIPlanDraft | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editDays, setEditDays] = useState<{ dayLabel: string; focus: string; sampleSession: string }[]>([]);
  const [editNutrition, setEditNutrition] = useState('');
  const [editHabits, setEditHabits] = useState('');

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = linkedClientsForActiveTrainer.find((c) => c.id === clientId);
    if (!client) return;
    setObjective(client.primaryGoal);
    setExperienceLevel(client.experienceLevel);
    setDaysPerWeek(Math.max(2, Math.min(6, client.daysPerWeek || 3)));
    setEnvironment(client.environment);
    setDietaryPreference(client.dietaryPreference);
    const notesParts = [
      client.healthLimitations ? `Limitations: ${client.healthLimitations}` : '',
      client.foodAllergies ? `Allergies: ${client.foodAllergies}` : '',
      client.equipment.length > 0 ? `Equipment: ${client.equipment.join(', ')}` : '',
      client.coachingPreferences ? `Preferences: ${client.coachingPreferences}` : '',
    ].filter(Boolean);
    if (notesParts.length > 0) {
      setConstraints(notesParts.join(' · '));
    }
  };

  const loadDraftIntoEditor = (draft: AIPlanDraft) => {
    setActiveDraft(draft);
    setEditTitle(draft.title);
    setEditSummary(draft.summary);
    setEditDays(draft.workoutDays.map((d) => ({ ...d })));
    setEditNutrition(draft.nutritionOutline.join('\n'));
    setEditHabits(draft.habitCommitments.join('\n'));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setBusy(true);
    try {
      const res = await generateAIPlanWithCopilot({
        objective,
        experienceLevel,
        daysPerWeek,
        environment,
        dietaryPreference,
        constraints,
        clientId: selectedClientId || undefined,
      });
      if (!res.ok || !res.draft) {
        setApiError(res.error || 'Could not generate AI draft right now.');
        return;
      }
      loadDraftIntoEditor(res.draft);
    } finally {
      setBusy(false);
    }
  };

  const buildEditedDraft = (status: AIPlanDraft['status']): AIPlanDraft | null => {
    if (!activeDraft) return null;
    return {
      ...activeDraft,
      title: editTitle.trim() || activeDraft.title,
      summary: editSummary.trim() || activeDraft.summary,
      workoutDays: editDays,
      nutritionOutline: editNutrition
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 10),
      habitCommitments: editHabits
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 10),
      status,
    };
  };

  const handleSaveEdits = () => {
    const updated = buildEditedDraft('approved');
    if (!updated) return;
    setActiveDraft(updated);
    updateAIDraft(updated);
  };

  const handleApproveToTemplates = (redirectToAssign = false) => {
    const updated = buildEditedDraft('approved');
    if (!updated) return;
    updateAIDraft(updated);
    approveAndSaveAIDraftAsTemplate(updated.id);
    if (redirectToAssign) {
      navigate('/studio/assign', {
        state: selectedClientId ? { preselectedClientIds: [selectedClientId] } : undefined,
      });
    } else {
      navigate('/studio/templates');
    }
  };

  return (
    <AppShell pageTitle={isCloudSynced ? 'AI Plan Copilot' : 'AI Plan Builder (Preview)'}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="rounded-[20px] bg-[#FF803E]/12 border border-[#FF803E]/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-[#FFB06B]">
              {isCloudSynced
                ? 'Gemini AI Plan Copilot · Coach review & approval required'
                : 'Preview only — deterministic sample draft'}
            </p>
            <p className="text-[13px] text-[#F5F5F7] mt-0.5">
              {COPY.trainer.aiNotice} {COPY.trainer.aiMedicalNotice}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isCloudSynced && aiQuotaRemaining !== null ? (
              <span className="text-[12px] font-medium text-[#A2A8B5] tabular-nums">
                {aiQuotaRemaining} daily drafts left
              </span>
            ) : null}
            <GlassTooltip content="Drafts are never sent to clients until you review, edit, and approve them into your template library.">
              <span className="text-[12px] text-[#FFB06B] underline underline-offset-4 whitespace-nowrap cursor-help">
                Trainer approval required
              </span>
            </GlassTooltip>
          </div>
        </div>

        <div>
          <h1 className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] text-[#F5F5F7]">
            {COPY.trainer.aiTitle}
          </h1>
          <p className="mt-1 text-[15px] text-[#A2A8B5]">{COPY.trainer.aiSupport}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Context Form */}
          <form
            onSubmit={handleGenerate}
            className="lg:col-span-5 surface-card rounded-[22px] p-5 flex flex-col gap-4"
          >
            <h2 className="text-[17px] font-semibold text-[#F5F5F7]">Client training context</h2>

            {linkedClientsForActiveTrainer.length > 0 ? (
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                Pre-fill from active client
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
                >
                  <option value="">Custom client context</option>
                  {linkedClientsForActiveTrainer.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
              Objective
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as GoalFocus)}
                className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
              >
                <option value="weight_management">Weight management</option>
                <option value="healthy_weight_gain">Healthy weight gain</option>
                <option value="muscle_strength">Build muscle and strength</option>
                <option value="general_fitness">General fitness</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                Level
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                  className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="experienced">Experienced</option>
                </select>
              </label>

              <InputField
                label="Days / week"
                type="number"
                min={2}
                max={6}
                value={daysPerWeek}
                onChange={(e) =>
                  setDaysPerWeek(Math.max(2, Math.min(6, Number(e.target.value) || 3)))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                Equipment / setting
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as TrainingEnvironment)}
                  className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
                >
                  <option value="gym">Full gym</option>
                  <option value="home">Home (dumbbells / mat)</option>
                  <option value="outdoors">Outdoors</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#F5F5F7]">
                Food preference
                <select
                  value={dietaryPreference}
                  onChange={(e) => setDietaryPreference(e.target.value as DietaryPreference)}
                  className="min-h-[48px] rounded-[12px] bg-[#101218] border border-white/[0.1] px-3 text-[14px]"
                >
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="non_vegetarian">Non-vegetarian</option>
                </select>
              </label>
            </div>

            <TextAreaField
              label="Constraints & notes"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Schedule limits, equipment gaps, or recovery considerations"
            />

            {apiError ? (
              <div
                role="alert"
                className="rounded-[12px] bg-[#FF6B70]/12 border border-[#FF6B70]/40 p-3 flex items-start gap-2 text-[13px] text-[#FF6B70]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{apiError}</span>
              </div>
            ) : null}

            <GlassButton type="submit" fullWidth disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Generating draft...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  {isCloudSynced ? 'Generate draft with Gemini' : 'Generate sample draft'}
                </>
              )}
            </GlassButton>
          </form>

          {/* Draft Review & Approval Panel */}
          <div className="lg:col-span-7 surface-card rounded-[22px] p-5 sm:p-6">
            {!activeDraft ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-[17px] font-semibold text-[#F5F5F7]">
                  {isCloudSynced ? 'Gemini AI Copilot ready' : 'Deterministic draft preview'}
                </p>
                <p className="text-[14px] text-[#A2A8B5] max-w-md mx-auto">
                  {isCloudSynced
                    ? 'Select an active client or training context on the left to draft an editable 7-day plan, Indian nutrition outline, and daily habits.'
                    : 'Select an objective and context on the left to generate an editable sample draft. Nothing is shared with clients automatically.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#FFB06B]">
                    Status: {activeDraft.status === 'approved' ? 'Approved by trainer' : 'Draft — awaiting review'}
                  </span>
                  <span className="text-[12px] text-[#7C8393]">
                    {isDemoSandbox || !isCloudSynced
                      ? 'Deterministic sample'
                      : activeDraft.model
                        ? `Generated by ${activeDraft.model}`
                        : 'Gemini Copilot draft'}
                  </span>
                </div>

                <InputField
                  label="Draft title (editable)"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />

                <TextAreaField
                  label="Coach summary (editable)"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                />

                <div>
                  <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-2">
                    Proposed weekly schedule (editable)
                  </h3>
                  <div className="space-y-2.5">
                    {editDays.map((day, idx) => (
                      <div
                        key={day.dayLabel}
                        className="rounded-[14px] bg-[#101218] border border-white/[0.08] p-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <span className="sm:col-span-2 text-[13px] font-semibold text-[#FFB06B]">
                          {day.dayLabel}
                        </span>
                        <input
                          type="text"
                          value={day.focus}
                          aria-label={`${day.dayLabel} focus`}
                          onChange={(e) =>
                            setEditDays((prev) =>
                              prev.map((d, i) => (i === idx ? { ...d, focus: e.target.value } : d)),
                            )
                          }
                          className="sm:col-span-4 rounded-[10px] bg-[#1C2029] border border-white/[0.08] px-2.5 py-1.5 text-[13px] text-[#F5F5F7]"
                        />
                        <input
                          type="text"
                          value={day.sampleSession}
                          aria-label={`${day.dayLabel} session`}
                          onChange={(e) =>
                            setEditDays((prev) =>
                              prev.map((d, i) =>
                                i === idx ? { ...d, sampleSession: e.target.value } : d,
                              ),
                            )
                          }
                          className="sm:col-span-6 rounded-[10px] bg-[#1C2029] border border-white/[0.08] px-2.5 py-1.5 text-[13px] text-[#A2A8B5]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextAreaField
                    label="Indian nutrition outline (one per line)"
                    value={editNutrition}
                    onChange={(e) => setEditNutrition(e.target.value)}
                    rows={4}
                  />
                  <TextAreaField
                    label="Daily habit commitments (one per line)"
                    value={editHabits}
                    onChange={(e) => setEditHabits(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <GlassButton variant="secondary" fullWidth onClick={handleSaveEdits}>
                    Save draft edits
                  </GlassButton>
                  <GlassButton fullWidth onClick={() => handleApproveToTemplates(false)}>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Approve & save template
                  </GlassButton>
                  <GlassButton
                    variant="glass"
                    fullWidth
                    onClick={() => handleApproveToTemplates(true)}
                  >
                    Approve & assign
                  </GlassButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
