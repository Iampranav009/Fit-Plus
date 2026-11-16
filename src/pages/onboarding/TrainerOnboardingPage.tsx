import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp, type OnboardingTrainerDraft } from '../../context/AppContext';
import { formatINR } from '../../lib/date';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';

const TRAINER_STEPS = ['profile', 'specialties', 'storefront', 'package', 'review'] as const;
type TrainerStep = (typeof TRAINER_STEPS)[number];

const SPECIALTY_CHOICES = [
  'Weight management',
  'Strength training',
  'Build muscle and strength',
  'General fitness',
  'Mobility',
  'Habit coaching',
];

const LANGUAGE_CHOICES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];

export const TrainerOnboardingPage: React.FC = () => {
  const { step = 'profile' } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { firebaseUser, completeTrainerOnboarding } = useApp();

  const stepIndex = Math.max(0, TRAINER_STEPS.indexOf(step as TrainerStep));
  const currentStep = TRAINER_STEPS[stepIndex] || 'profile';

  const [draft, setDraft] = useState<OnboardingTrainerDraft>({
    displayName: firebaseUser?.displayName || '',
    city: 'Mumbai',
    experienceYears: 4,
    coachingMode: 'hybrid',
    specialties: ['Weight management', 'Habit coaching'],
    languages: ['English', 'Hindi'],
    headline: 'Strength & practical home-meal habits for working adults',
    bio: '',
    packageName: 'Personal Coaching',
    packagePriceInr: 1499,
    packageSummary: 'Weekly workout & nutrition guidance with bi-weekly check-ins.',
  });

  const [error, setError] = useState('');

  const goStep = (idx: number) => {
    setError('');
    const clamped = Math.max(0, Math.min(TRAINER_STEPS.length - 1, idx));
    navigate(`/onboarding/trainer/${TRAINER_STEPS[clamped]}`);
  };

  const toggleItem = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((i) => i !== value) : [...list, value];

  const handleNext = () => {
    if (currentStep === 'profile' && !draft.displayName.trim()) {
      setError('Enter your coaching display name.');
      return;
    }
    if (currentStep === 'specialties' && draft.specialties.length === 0) {
      setError('Select at least one coaching speciality.');
      return;
    }
    if (currentStep === 'package' && (!draft.packageName.trim() || draft.packagePriceInr < 0)) {
      setError('Enter a package title and valid INR amount.');
      return;
    }
    goStep(stepIndex + 1);
  };

  const handleFinish = () => {
    completeTrainerOnboarding({
      ...draft,
      displayName: draft.displayName.trim() || 'Demo Coach',
    });
    navigate('/studio/overview');
  };

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
            {formatCopy(COPY.onboarding.stepOf, {
              current: stepIndex + 1,
              total: TRAINER_STEPS.length,
            })}
          </span>

          <Link to="/" aria-label="Exit onboarding" className="text-[13px] text-[#7C8393] hover:text-[#F5F5F7]">
            <BrandMark size="sm" />
          </Link>
        </div>
      </header>

      <div className="max-w-xl w-full mx-auto px-4 pt-4">
        <div className="h-1.5 rounded-full bg-[#1C2029] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#FF803E] transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / TRAINER_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 flex flex-col justify-between gap-8">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[12px] text-[#FFB06B]">
              Demo trainer setup · No credentials marked verified
            </p>
            <h1 className="mt-1 text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
              {COPY.onboarding.trainer.title}
            </h1>
          </div>

          {currentStep === 'profile' ? (
            <>
              <InputField
                label="Your coaching name"
                value={draft.displayName}
                onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                placeholder="e.g., Siddharth Rao"
                autoFocus
              />
              <InputField
                label="City or region"
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="Mumbai"
              />
              <InputField
                label="Years of coaching experience"
                type="number"
                min={1}
                max={40}
                value={draft.experienceYears}
                onChange={(e) =>
                  setDraft({ ...draft, experienceYears: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </>
          ) : null}

          {currentStep === 'specialties' ? (
            <>
              <div>
                <p className="text-[13px] font-medium text-[#F5F5F7] mb-2">Coaching specialties</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_CHOICES.map((spec) => {
                    const active = draft.specialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() =>
                          setDraft({ ...draft, specialties: toggleItem(draft.specialties, spec) })
                        }
                        aria-pressed={active}
                        className={`min-h-[44px] px-3.5 rounded-[12px] border text-[13px] font-medium cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                            : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[13px] font-medium text-[#F5F5F7] mb-2">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_CHOICES.map((lang) => {
                    const active = draft.languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() =>
                          setDraft({ ...draft, languages: toggleItem(draft.languages, lang) })
                        }
                        aria-pressed={active}
                        className={`min-h-[44px] px-3.5 rounded-[12px] border text-[13px] font-medium cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                            : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[13px] font-medium text-[#F5F5F7] mb-2">Coaching mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: 'online', l: 'Online' },
                      { v: 'hybrid', l: 'Hybrid' },
                      { v: 'in_person', l: 'In person' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => setDraft({ ...draft, coachingMode: m.v })}
                      aria-pressed={draft.coachingMode === m.v}
                      className={`min-h-[44px] rounded-[12px] border text-[13px] font-medium cursor-pointer transition-colors ${
                        draft.coachingMode === m.v
                          ? 'bg-[#FF803E]/14 border-[#FF803E] text-[#F5F5F7]'
                          : 'surface-card text-[#A2A8B5] hover:text-[#F5F5F7]'
                      }`}
                    >
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {currentStep === 'storefront' ? (
            <>
              <InputField
                label="Storefront headline"
                value={draft.headline}
                onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
              />
              <TextAreaField
                label="Short bio"
                optionalTag={COPY.onboarding.optional}
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                placeholder="Share your coaching approach and who you help best."
              />
              <InputField
                label="Demo contact note"
                disabled
                value="WhatsApp & phone calls are disabled in Stage 1 demo"
                helper="External phone numbers are not verified in demo preview."
              />
            </>
          ) : null}

          {currentStep === 'package' ? (
            <>
              <InputField
                label="Starter package name"
                value={draft.packageName}
                onChange={(e) => setDraft({ ...draft, packageName: e.target.value })}
              />
              <InputField
                label="Monthly price (example INR)"
                unit="INR"
                type="number"
                min={0}
                value={draft.packagePriceInr}
                onChange={(e) =>
                  setDraft({ ...draft, packagePriceInr: Math.max(0, Number(e.target.value) || 0) })
                }
                helper="Demo sample pricing only — no live billing."
              />
              <TextAreaField
                label="Package summary"
                value={draft.packageSummary}
                onChange={(e) => setDraft({ ...draft, packageSummary: e.target.value })}
              />
            </>
          ) : null}

          {currentStep === 'review' ? (
            <div className="rounded-[20px] surface-card divide-y divide-white/[0.08] text-[14px]">
              <div className="p-4 flex justify-between gap-3">
                <span className="text-[#7C8393]">Coach name</span>
                <span className="text-[#F5F5F7] font-medium">{draft.displayName || 'Demo Coach'}</span>
              </div>
              <div className="p-4 flex justify-between gap-3">
                <span className="text-[#7C8393]">Location & mode</span>
                <span className="text-[#F5F5F7]">
                  {draft.city} · {draft.coachingMode.replace('_', ' ')}
                </span>
              </div>
              <div className="p-4 flex justify-between gap-3">
                <span className="text-[#7C8393]">Specialties</span>
                <span className="text-[#F5F5F7] text-right">{draft.specialties.join(', ')}</span>
              </div>
              <div className="p-4 flex justify-between gap-3 tabular-nums">
                <span className="text-[#7C8393]">Starter package</span>
                <span className="text-[#F5F5F7]">
                  {draft.packageName} · {formatINR(draft.packagePriceInr)}/mo
                </span>
              </div>
              <div className="p-4 flex justify-between gap-3">
                <span className="text-[#7C8393]">Verification</span>
                <span className="text-[#A2A8B5]">Unverified demo listing</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-[13px] text-[#FF6B70]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="pt-4 border-t border-white/[0.08]">
          {currentStep === 'review' ? (
            <GlassButton fullWidth onClick={handleFinish}>
              {COPY.onboarding.trainer.finishSetup}
            </GlassButton>
          ) : (
            <GlassButton fullWidth onClick={handleNext}>
              {COPY.onboarding.next}
            </GlassButton>
          )}
        </div>
      </main>
    </div>
  );
};
