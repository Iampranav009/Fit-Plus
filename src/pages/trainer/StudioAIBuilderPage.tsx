import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
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
  const { generateAIDraft, updateAIDraft, approveAndSaveAIDraftAsTemplate } = useApp();
  const navigate = useNavigate();

  const [objective, setObjective] = useState<GoalFocus>('weight_management');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [environment, setEnvironment] = useState<TrainingEnvironment>('home');
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>('vegetarian');
  const [constraints, setConstraints] = useState('Mild knee sensitivity; prefers 40-min sessions');

  const [activeDraft, setActiveDraft] = useState<AIPlanDraft | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = generateAIDraft({
      objective,
      experienceLevel,
      daysPerWeek,
      environment,
      dietaryPreference,
      constraints,
    });
    setActiveDraft(draft);
    setEditTitle(draft.title);
    setEditSummary(draft.summary);
  };

  const handleSaveEdits = () => {
    if (!activeDraft) return;
    const updated: AIPlanDraft = {
      ...activeDraft,
      title: editTitle.trim() || activeDraft.title,
      summary: editSummary.trim() || activeDraft.summary,
      status: 'approved',
    };
    setActiveDraft(updated);
    updateAIDraft(updated);
  };

  const handleApproveToTemplates = () => {
    if (!activeDraft) return;
    const updated: AIPlanDraft = {
      ...activeDraft,
      title: editTitle.trim() || activeDraft.title,
      summary: editSummary.trim() || activeDraft.summary,
      status: 'approved',
    };
    updateAIDraft(updated);
    approveAndSaveAIDraftAsTemplate(activeDraft.id);
    navigate('/studio/templates');
  };

  return (
    <AppShell pageTitle="AI Plan Builder (Preview)">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="rounded-[20px] bg-[#FF803E]/12 border border-[#FF803E]/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-[#FFB06B]">
              Preview only — no live Gemini call
            </p>
            <p className="text-[13px] text-[#F5F5F7] mt-0.5">
              {COPY.trainer.aiNotice} {COPY.trainer.aiMedicalNotice}
            </p>
          </div>
          <GlassTooltip content="Drafts are never sent to clients until you review, edit, and approve them into your template library.">
            <span className="text-[12px] text-[#FFB06B] underline underline-offset-4 whitespace-nowrap cursor-help">
              Trainer approval required
            </span>
          </GlassTooltip>
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

            <GlassButton type="submit" fullWidth>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Generate sample draft
            </GlassButton>
          </form>

          {/* Draft Review & Approval Panel */}
          <div className="lg:col-span-7 surface-card rounded-[22px] p-5 sm:p-6">
            {!activeDraft ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-[17px] font-semibold text-[#F5F5F7]">
                  Deterministic draft preview
                </p>
                <p className="text-[14px] text-[#A2A8B5] max-w-md mx-auto">
                  Select an objective and context on the left to generate an editable sample draft. Nothing is shared with clients automatically.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#FFB06B]">
                    Status: {activeDraft.status === 'approved' ? 'Approved by trainer' : 'Draft — awaiting review'}
                  </span>
                  <span className="text-[12px] text-[#7C8393]">Deterministic sample</span>
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
                    Proposed weekly schedule
                  </h3>
                  <ul className="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
                    {activeDraft.workoutDays.map((day) => (
                      <li key={day.dayLabel} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[13px]">
                        <span className="font-medium text-[#F5F5F7]">
                          {day.dayLabel} · {day.focus}
                        </span>
                        <span className="text-[#A2A8B5]">{day.sampleSession}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-1.5">
                    Sample Indian nutrition outline
                  </h3>
                  <ul className="text-[13px] text-[#A2A8B5] space-y-1 list-disc list-inside">
                    {activeDraft.nutritionOutline.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <GlassButton variant="secondary" fullWidth onClick={handleSaveEdits}>
                    Save draft edits
                  </GlassButton>
                  <GlassButton fullWidth onClick={handleApproveToTemplates}>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Approve & save template
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
