import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp, type OnboardingClientDraft } from '../../context/AppContext';
import type { DietaryPreference, ExperienceLevel, GoalFocus, TrainingEnvironment } from '../../types/domain';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';
import { MediaImage } from '../../components/ui/MediaImage';

const STEPS = ['basics', 'measurements', 'goal', 'training', 'food', 'review'] as const;
type ClientStep = (typeof STEPS)[number];

const GOAL_OPTIONS: { value: GoalFocus; label: string; imageKey: string }[] = [
  { value: 'weight_management', label: 'Weight management', imageKey: 'programWeightLoss' },
  { value: 'healthy_weight_gain', label: 'Healthy weight gain', imageKey: 'goalNutrition' },
  { value: 'muscle_strength', label: 'Build muscle and strength', imageKey: 'programMuscleBuilding' },
  { value: 'general_fitness', label: 'General fitness', imageKey: 'goalBalance' },
  { value: 'exploring', label: 'Not sure yet', imageKey: 'illusKettlebell' },
];

export const ClientOnboardingPage: React.FC = () => {
  const { step = 'basics' } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { store, firebaseUser, isCloudSynced, completeClientOnboarding } = useApp();

  const stepIndex = Math.max(0, STEPS.indexOf(step as ClientStep));
  const currentStep = STEPS[stepIndex] || 'basics';

  const nameParts = (firebaseUser?.displayName || '').trim().split(/\s+/);
  const [draft, setDraft] = useState<OnboardingClientDraft>({
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    isAdultConfirmed: false,
    heightCm: undefined,
    weightKg: undefined,
    primaryGoal: 'general_fitness',
    experienceLevel: 'beginner',
    daysPerWeek: 3,
    environment: 'home',
    equipment: ['Yoga mat'],
    dietaryPreference: 'vegetarian',
    dietaryNotes: '',
  });

  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const pendingInvite = useMemo(() => {
    if (!store.session.pendingInviteToken) return undefined;
    return store.invites.find(
      (i) => i.token.toUpperCase() === store.session.pendingInviteToken?.toUpperCase(),
    );
  }, [store.session.pendingInviteToken, store.invites]);

  const goStep = (idx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
    setErrors({});
    navigate(`/onboarding/client/${STEPS[clamped]}`);
  };

  const handleNext = () => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 'basics') {
      if (!draft.firstName.trim()) nextErrors.firstName = COPY.onboarding.errors.enterName;
      if (!draft.isAdultConfirmed) nextErrors.adult = COPY.onboarding.errors.confirmAdult;
    }

    if (currentStep === 'measurements') {
      if (heightInput.trim()) {
        const h = Number(heightInput);
        if (!Number.isFinite(h) || h <= 0) {
          nextErrors.heightCm = COPY.onboarding.errors.positiveNumber;
        }
      }
      if (weightInput.trim()) {
        const w = Number(weightInput);
        if (!Number.isFinite(w) || w <= 0) {
          nextErrors.weightKg = COPY.onboarding.errors.positiveNumber;
        }
      }
    }

    if (currentStep === 'goal' && !draft.primaryGoal) {
      nextErrors.goal = COPY.onboarding.errors.selectGoal;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (currentStep === 'measurements') {
      setDraft((prev) => ({
        ...prev,
        heightCm: heightInput.trim() ? Number(heightInput) : undefined,
        weightKg: weightInput.trim() ? Number(weightInput) : undefined,
      }));
    }

    if (stepIndex < STEPS.length - 1) {
      goStep(stepIndex + 1);
    }
  };

  const handleSkipOptional = () => {
    setErrors({});
    if (currentStep === 'measurements') {
      setHeightInput('');
      setWeightInput('');
      setDraft((prev) => ({ ...prev, heightCm: undefined, weightKg: undefined }));
    }
    goStep(stepIndex + 1);
  };

  const handleFinish = () => {
    completeClientOnboarding({
      ...draft,
      firstName: draft.firstName.trim() || 'Guest',
      isAdultConfirmed: true,
    });
    if (pendingInvite) {
      navigate(`/join/${pendingInvite.token}`);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
        <header className="sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
          <div className="glass-nav max-w-[1280px] mx-auto h-14 rounded-[18px] px-4 sm:px-6 flex items-center justify-between">
            <BrandMark />
            <span className="text-[12px] text-[#7C8393]">{COPY.onboarding.demoDataOnly}</span>
          </div>
        </header>
        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-12 flex flex-col justify-center gap-6">
          <div className="surface-card rounded-[26px] p-6 sm:p-8 flex flex-col gap-6">
            <div>
              <p className="text-[13px] font-medium text-[#FFB06B]">Setup complete (demo)</p>
              <h1 className="mt-2 text-[28px] font-semibold text-[#F5F5F7]">
                {COPY.onboarding.client.nextChoiceTitle}
              </h1>
              <p className="mt-2 text-[15px] text-[#A2A8B5]">
                A coach relationship only activates when you explicitly accept an invitation or enroll in a demo package.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <GlassButton fullWidth onClick={() => navigate('/discover')}>
                {COPY.onboarding.client.findTrainer}
              </GlassButton>
              <GlassButton
                variant="glass"
                fullWidth
                onClick={() => navigate('/join/FIT-ARJUN-2026')}
              >
                {COPY.onboarding.client.haveInvite} (sample)
              </GlassButton>
              <GlassButton
                variant="tertiary"
                fullWidth
                onClick={() => navigate('/app/home')}
              >
                {COPY.onboarding.client.continueOwn}
              </GlassButton>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen fp-ambient-canvas text-[#F5F5F7] flex flex-col">
      <header className="sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
        <div className="glass-nav max-w-[1280px] mx-auto h-14 rounded-[18px] px-4 sm:px-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (stepIndex === 0 ? navigate('/onboarding/role') : goStep(stepIndex - 1))}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#A2A8B5] hover:text-[#F5F5F7] min-h-[44px] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {COPY.onboarding.back}
          </button>

          <span className="text-[13px] text-[#A2A8B5] tabular-nums">
            {formatCopy(COPY.onboarding.stepOf, { current: stepIndex + 1, total: STEPS.length })}
          </span>

          <Link to="/" className="text-[13px] text-[#7C8393] hover:text-[#F5F5F7] min-h-[44px] inline-flex items-center">
            Exit
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-xl w-full mx-auto px-4 pt-4">
        <div className="h-1.5 rounded-full bg-[#1C2029] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#FF803E] transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 flex flex-col justify-between gap-8">
        <div className="flex flex-col gap-6">
          {currentStep === 'basics' ? (
            <>
              <div>
                <p className="text-[12px] text-[#7C8393]">{COPY.onboarding.demoDataOnly}</p>
                <h1 className="mt-1 text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
                  {COPY.onboarding.client.basicsTitle}
                </h1>
                <p className="mt-2 text-[15px] text-[#A2A8B5]">
                  {COPY.onboarding.client.basicsSupport}
                </p>
              </div>
              <InputField
                label="First name"
                value={draft.firstName}
                onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                placeholder="e.g., Aarav"
                error={errors.firstName}
                autoFocus
              />
              <InputField
                label="Last name"
                optionalTag={COPY.onboarding.optional}
                value={draft.lastName}
                onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                placeholder="e.g., Mehta"
              />
              <label className="flex items-start gap-3 rounded-[16px] surface-card p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.isAdultConfirmed}
                  onChange={(e) => setDraft({ ...draft, isAdultConfirmed: e.target.checked })}
                  className="mt-1 h-5 w-5 accent-[#FF803E]"
                />
                <span className="text-[14px] text-[#F5F5F7]">
                  I confirm I am 18 years or older. FitPlus is for adult coaching use only.
                </span>
              </label>
              {errors.adult ? (
                <p role="alert" className="text-[12px] text-[#FF6B70]">
                  {errors.adult}
                </p>
              ) : null}
            </>
          ) : null}

          {currentStep === 'measurements' ? (
            <>
              <div>
                <p className="text-[12px] text-[#7C8393]">{COPY.onboarding.optional}</p>
                <h1 className="mt-1 text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
                  {COPY.onboarding.client.measurementsTitle}
                </h1>
                <p className="mt-2 text-[15px] text-[#A2A8B5]">
                  {COPY.onboarding.client.measurementsSupport}
                </p>
              </div>
              <InputField
                label="Height"
                unit="cm"
                inputMode="decimal"
                optionalTag={COPY.onboarding.optional}
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                placeholder="170"
                error={errors.heightCm}
              />
              <InputField
                label="Current weight"
                unit="kg"
                inputMode="decimal"
                optionalTag={COPY.onboarding.optional}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="72"
                error={errors.weightKg}
                helper="Stored locally or in your private FitPlus workspace."
              />
            </>
          ) : null}

          {currentStep === 'goal' ? (
            <>
              <div>
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
                  {COPY.onboarding.client.goalTitle}
                </h1>
              </div>
              <div className="grid gap-3">
                {GOAL_OPTIONS.map((opt) => {
                  const selected = draft.primaryGoal === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, primaryGoal: opt.value })}
                      aria-pressed={selected}
                      className={`text-left rounded-[18px] p-3.5 border flex items-center gap-4 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#FF803E]/12 border-[#FF803E]'
                          : 'surface-card hover:border-white/20'
                      }`}
                    >
                      <MediaImage
                        assetKey={opt.imageKey}
                        alt=""
                        aspectClass="w-16 h-14 rounded-[12px] shrink-0"
                      />
                      <span className="text-[16px] font-medium text-[#F5F5F7]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {currentStep === 'training' ? (
            <>
              <div>
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
                  {COPY.onboarding.client.trainingTitle}
                </h1>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-[13px] font-medium text-[#F5F5F7] mb-2">Experience level</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['beginner', 'intermediate', 'experienced'] as ExperienceLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDraft({ ...draft, experienceLevel: lvl })}
                        aria-pressed={draft.experienceLevel === lvl}
                        className={`min-h-[44px] rounded-[12px] border text-[13px] font-medium capitalize cursor-pointer transition-colors ${
                          draft.experienceLevel === lvl
                            ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                            : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-[#F5F5F7] mb-2">
                    Days available per week
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {[2, 3, 4, 5, 6].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDraft({ ...draft, daysPerWeek: d })}
                        aria-pressed={draft.daysPerWeek === d}
                        className={`min-h-[44px] rounded-[12px] border text-[14px] font-semibold tabular-nums cursor-pointer transition-colors ${
                          draft.daysPerWeek === d
                            ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                            : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-[#F5F5F7] mb-2">Training setting</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { v: 'gym', l: 'Gym' },
                        { v: 'home', l: 'Home' },
                        { v: 'outdoors', l: 'Outdoors' },
                      ] as { v: TrainingEnvironment; l: string }[]
                    ).map((env) => (
                      <button
                        key={env.v}
                        type="button"
                        onClick={() => setDraft({ ...draft, environment: env.v })}
                        aria-pressed={draft.environment === env.v}
                        className={`min-h-[44px] rounded-[12px] border text-[14px] font-medium cursor-pointer transition-colors ${
                          draft.environment === env.v
                            ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                            : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                        }`}
                      >
                        {env.l}
                      </button>
                    ))}
                  </div>
                </div>

                <InputField
                  label="Available equipment"
                  optionalTag={COPY.onboarding.optional}
                  value={draft.equipment.join(', ')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      equipment: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Dumbbells, resistance bands, yoga mat"
                />
              </div>
            </>
          ) : null}

          {currentStep === 'food' ? (
            <>
              <div>
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
                  {COPY.onboarding.client.foodTitle}
                </h1>
              </div>

              <div className="grid gap-2.5">
                {(
                  [
                    { v: 'vegetarian', l: 'Vegetarian' },
                    { v: 'vegan', l: 'Vegan' },
                    { v: 'non_vegetarian', l: 'Non-vegetarian' },
                    { v: 'other', l: 'Other' },
                    { v: 'prefer_not_to_say', l: 'Prefer not to say' },
                  ] as { v: DietaryPreference; l: string }[]
                ).map((item) => (
                  <button
                    key={item.v}
                    type="button"
                    onClick={() => setDraft({ ...draft, dietaryPreference: item.v })}
                    aria-pressed={draft.dietaryPreference === item.v}
                    className={`min-h-[48px] px-4 rounded-[14px] border text-left text-[15px] font-medium cursor-pointer transition-colors ${
                      draft.dietaryPreference === item.v
                        ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                        : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                    }`}
                  >
                    {item.l}
                  </button>
                ))}
              </div>

              <TextAreaField
                label="Dietary preferences or allergies"
                optionalTag="Optional · sample data only"
                value={draft.dietaryNotes}
                onChange={(e) => setDraft({ ...draft, dietaryNotes: e.target.value })}
                placeholder="e.g., Prefer no eggs; lactose tolerant"
              />
            </>
          ) : null}

          {currentStep === 'review' ? (
            <>
              <div>
                <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
                  {COPY.onboarding.client.reviewTitle}
                </h1>
                <p className="mt-2 text-[15px] text-[#A2A8B5]">
                  {COPY.onboarding.client.reviewSupport}
                </p>
              </div>

              <div className="rounded-[20px] surface-card divide-y divide-white/[0.08] text-[14px]">
                <div className="p-4 flex justify-between gap-3">
                  <span className="text-[#7C8393]">Name</span>
                  <span className="text-[#F5F5F7] font-medium">
                    {draft.firstName || 'Guest'} {draft.lastName}
                  </span>
                </div>
                <div className="p-4 flex justify-between gap-3 tabular-nums">
                  <span className="text-[#7C8393]">Measurements</span>
                  <span className="text-[#F5F5F7]">
                    {draft.heightCm ? `${draft.heightCm} cm` : 'Skipped'} ·{' '}
                    {draft.weightKg ? `${draft.weightKg} kg` : 'Skipped'}
                  </span>
                </div>
                <div className="p-4 flex justify-between gap-3">
                  <span className="text-[#7C8393]">Goal</span>
                  <span className="text-[#F5F5F7]">
                    {GOAL_OPTIONS.find((g) => g.value === draft.primaryGoal)?.label}
                  </span>
                </div>
                <div className="p-4 flex justify-between gap-3 tabular-nums">
                  <span className="text-[#7C8393]">Training</span>
                  <span className="text-[#F5F5F7] capitalize">
                    {draft.experienceLevel} · {draft.daysPerWeek} days/wk · {draft.environment}
                  </span>
                </div>
                <div className="p-4 flex justify-between gap-3">
                  <span className="text-[#7C8393]">Food preference</span>
                  <span className="text-[#F5F5F7] capitalize">
                    {draft.dietaryPreference.replaceAll('_', ' ')}
                  </span>
                </div>
              </div>

              <p className="text-[12px] text-[#7C8393]">
                {isCloudSynced || firebaseUser
                  ? 'Account privacy notice: Your FitPlus profile and plan are stored in your Google-authenticated Firestore workspace. Avoid entering sensitive medical records.'
                  : 'Local demo privacy notice: Details entered here are stored in browser localStorage only for this demo preview. Do not enter sensitive personal or medical data.'}
              </p>
            </>
          ) : null}
        </div>

        {/* Bottom Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2.5">
          {currentStep === 'review' ? (
            <>
              <GlassButton fullWidth onClick={handleFinish}>
                {COPY.onboarding.client.finishSetup}
              </GlassButton>
              <GlassButton variant="secondary" fullWidth onClick={() => goStep(0)}>
                {COPY.onboarding.client.editDetails}
              </GlassButton>
            </>
          ) : (
            <div className="flex gap-3">
              {(currentStep === 'measurements' || currentStep === 'food') && (
                <GlassButton variant="glass" onClick={handleSkipOptional}>
                  {COPY.onboarding.skip}
                </GlassButton>
              )}
              <GlassButton fullWidth onClick={handleNext}>
                {COPY.onboarding.next}
              </GlassButton>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
