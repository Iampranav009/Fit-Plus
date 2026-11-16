import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { COPY, formatCopy } from '../../data/copy';
import { useApp, type OnboardingTrainerDraft } from '../../context/AppContext';
import { formatINR } from '../../lib/date';
import { BrandMark } from '../../components/ui/BrandMark';
import { GlassButton } from '../../components/ui/GlassButton';
import { InputField, TextAreaField } from '../../components/ui/InputField';

const TRAINER_DRAFT_STORAGE_KEY = 'fitplus_trainer_onboarding_draft';
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
  const { firebaseUser, isCloudSynced, completeTrainerOnboarding } = useApp();
  const isCloudMode = Boolean(firebaseUser && isCloudSynced);

  const stepIndex = Math.max(0, TRAINER_STEPS.indexOf(step as TrainerStep));
  const currentStep = TRAINER_STEPS[stepIndex] || 'profile';

  const savedDraft = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(TRAINER_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Partial<OnboardingTrainerDraft>;
    } catch {
      return null;
    }
  }, []);

  const [hasSavedDraftBanner, setHasSavedDraftBanner] = useState(Boolean(savedDraft));
  const [draft, setDraft] = useState<OnboardingTrainerDraft>({
    displayName: savedDraft?.displayName ?? (firebaseUser?.displayName || ''),
    city: savedDraft?.city ?? 'Mumbai',
    experienceYears: savedDraft?.experienceYears ?? 4,
    coachingMode: savedDraft?.coachingMode ?? 'hybrid',
    specialties: savedDraft?.specialties ?? ['Weight management', 'Habit coaching'],
    languages: savedDraft?.languages ?? ['English', 'Hindi'],
    headline: savedDraft?.headline ?? 'Strength & practical home-meal habits for working adults',
    bio: savedDraft?.bio ?? '',
    coachingStyle: savedDraft?.coachingStyle ?? 'Calm weekly programming with practical accountability.',
    certifications: savedDraft?.certifications ?? [],
    whatsappBusinessE164: savedDraft?.whatsappBusinessE164 ?? '',
    photoFile: null,
    submitVerification: savedDraft?.submitVerification,
    packageName: savedDraft?.packageName ?? 'Personal Coaching',
    packagePriceInr: savedDraft?.packagePriceInr ?? 1499,
    packageSummary: savedDraft?.packageSummary ?? 'Weekly workout & nutrition guidance with bi-weekly check-ins.',
  });

  const [certsInput, setCertsInput] = useState((savedDraft?.certifications || []).join(', '));
  const [wantVerification, setWantVerification] = useState(Boolean(savedDraft?.submitVerification));
  const [qualTitle, setQualTitle] = useState(savedDraft?.submitVerification?.qualificationTitle || '');
  const [issuingBody, setIssuingBody] = useState(savedDraft?.submitVerification?.issuingBody || '');
  const [credentialRef, setCredentialRef] = useState(savedDraft?.submitVerification?.credentialRef || '');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const { photoFile: _ignored, ...serializable } = draft;
      window.localStorage.setItem(TRAINER_DRAFT_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }
  }, [draft]);

  React.useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const discardSavedDraft = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TRAINER_DRAFT_STORAGE_KEY);
    }
    setHasSavedDraftBanner(false);
    setCertsInput('');
    setWantVerification(false);
    setQualTitle('');
    setIssuingBody('');
    setCredentialRef('');
    setDraft({
      displayName: firebaseUser?.displayName || '',
      city: 'Mumbai',
      experienceYears: 4,
      coachingMode: 'hybrid',
      specialties: ['Weight management', 'Habit coaching'],
      languages: ['English', 'Hindi'],
      headline: 'Strength & practical home-meal habits for working adults',
      bio: '',
      coachingStyle: 'Calm weekly programming with practical accountability.',
      certifications: [],
      whatsappBusinessE164: '',
      photoFile: null,
      submitVerification: undefined,
      packageName: 'Personal Coaching',
      packagePriceInr: 1499,
      packageSummary: 'Weekly workout & nutrition guidance with bi-weekly check-ins.',
    });
    navigate('/onboarding/trainer/profile');
  };

  const goStep = (idx: number) => {
    setError('');
    const clamped = Math.max(0, Math.min(TRAINER_STEPS.length - 1, idx));
    navigate(`/onboarding/trainer/${TRAINER_STEPS[clamped]}`);
  };

  const toggleItem = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((i) => i !== value) : [...list, value];

  const handleNext = () => {
    if (currentStep === 'profile') {
      if (!draft.displayName.trim()) {
        setError('Enter your coaching display name.');
        return;
      }
      if (
        draft.whatsappBusinessE164?.trim() &&
        !/^\+[1-9]\d{6,14}$/.test(draft.whatsappBusinessE164.trim())
      ) {
        setError('Enter WhatsApp Business number in E.164 format (e.g., +919876543210), or leave empty.');
        return;
      }
    }
    if (currentStep === 'specialties' && draft.specialties.length === 0) {
      setError('Select at least one coaching speciality.');
      return;
    }
    if (currentStep === 'storefront') {
      if (wantVerification && (!qualTitle.trim() || !issuingBody.trim())) {
        setError('Enter both qualification title and issuing body, or uncheck credential submission.');
        return;
      }
      const parsedCerts = certsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      setDraft((prev) => ({
        ...prev,
        certifications: parsedCerts,
        submitVerification:
          wantVerification && qualTitle.trim() && issuingBody.trim()
            ? {
                qualificationTitle: qualTitle.trim(),
                issuingBody: issuingBody.trim(),
                credentialRef: credentialRef.trim() || undefined,
              }
            : undefined,
      }));
    }
    if (currentStep === 'package' && (!draft.packageName.trim() || draft.packagePriceInr < 0)) {
      setError('Enter a package title and valid INR amount.');
      return;
    }
    goStep(stepIndex + 1);
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TRAINER_DRAFT_STORAGE_KEY);
    }
    const parsedCerts = certsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    completeTrainerOnboarding({
      ...draft,
      displayName: draft.displayName.trim() || 'Demo Coach',
      certifications: parsedCerts,
      whatsappBusinessE164: draft.whatsappBusinessE164?.trim() || undefined,
      submitVerification:
        wantVerification && qualTitle.trim() && issuingBody.trim()
          ? {
              qualificationTitle: qualTitle.trim(),
              issuingBody: issuingBody.trim(),
              credentialRef: credentialRef.trim() || undefined,
            }
          : undefined,
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
          {hasSavedDraftBanner ? (
            <div className="rounded-[16px] bg-[#252A35] border border-white/[0.1] px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#A2A8B5]">
                Resuming your saved trainer setup draft.
              </p>
              <button
                type="button"
                onClick={discardSavedDraft}
                className="text-[12px] font-medium text-[#FFB06B] hover:text-[#FF803E] whitespace-nowrap cursor-pointer"
              >
                Start fresh
              </button>
            </div>
          ) : null}

          <div>
            <p className="text-[12px] text-[#FFB06B]">
              {isCloudMode
                ? 'Trainer Studio setup · Credentials verified separately by admin'
                : 'Demo trainer setup · No credentials marked verified'}
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
              <InputField
                label="WhatsApp Business number"
                optionalTag={COPY.onboarding.optional}
                value={draft.whatsappBusinessE164 || ''}
                onChange={(e) => setDraft({ ...draft, whatsappBusinessE164: e.target.value })}
                placeholder="+919876543210"
                helper="Optional E.164 format for client consultation & check-in messaging."
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
              <TextAreaField
                label="Coaching style"
                optionalTag={COPY.onboarding.optional}
                value={draft.coachingStyle || ''}
                onChange={(e) => setDraft({ ...draft, coachingStyle: e.target.value })}
                placeholder="Describe how you structure weekly check-ins, programming, and accountability."
              />
              <InputField
                label="Certifications"
                optionalTag={COPY.onboarding.optional}
                value={certsInput}
                onChange={(e) => setCertsInput(e.target.value)}
                placeholder="e.g., ACE CPT, Precision Nutrition L1"
                helper="Separate multiple certifications with commas."
              />

              <div className="rounded-[16px] surface-card p-4 space-y-2.5">
                <p className="text-[13px] font-medium text-[#F5F5F7]">
                  Profile photo <span className="text-[#7C8393] font-normal">(optional · JPG/PNG/WebP under 5 MB)</span>
                </p>
                <div className="flex items-center gap-3">
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Selected coach avatar"
                      className="w-14 h-14 rounded-[14px] object-cover border border-white/15 shrink-0"
                    />
                  ) : null}
                  <label className="glass-control min-h-[40px] px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-[#F5F5F7] cursor-pointer inline-flex items-center">
                    <span>{draft.photoFile ? draft.photoFile.name : 'Choose profile photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                        setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
                        setDraft({ ...draft, photoFile: file });
                      }}
                    />
                  </label>
                  {draft.photoFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                        setPhotoPreviewUrl(null);
                        setDraft({ ...draft, photoFile: null });
                      }}
                      className="text-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] cursor-pointer"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              {isCloudMode ? (
                <div className="rounded-[16px] surface-card p-4 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantVerification}
                      onChange={(e) => setWantVerification(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#FF803E]"
                    />
                    <span className="text-[13px] text-[#F5F5F7]">
                      Submit coaching credentials for admin verification now (optional)
                    </span>
                  </label>
                  {wantVerification ? (
                    <div className="space-y-3 pt-1">
                      <InputField
                        label="Qualification title"
                        value={qualTitle}
                        onChange={(e) => setQualTitle(e.target.value)}
                        placeholder="e.g., Certified Strength & Conditioning Specialist"
                      />
                      <InputField
                        label="Issuing body"
                        value={issuingBody}
                        onChange={(e) => setIssuingBody(e.target.value)}
                        placeholder="e.g., NSCA / ACE / K11"
                      />
                      <InputField
                        label="Credential reference ID"
                        optionalTag={COPY.onboarding.optional}
                        value={credentialRef}
                        onChange={(e) => setCredentialRef(e.target.value)}
                        placeholder="Certificate or registration number"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
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
                label="Monthly price (INR)"
                unit="INR"
                type="number"
                min={0}
                value={draft.packagePriceInr}
                onChange={(e) =>
                  setDraft({ ...draft, packagePriceInr: Math.max(0, Number(e.target.value) || 0) })
                }
                helper={isCloudMode ? 'Shown on your public storefront & invite links.' : 'Demo sample pricing only.'}
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
              {certsInput.trim() ? (
                <div className="p-4 flex justify-between gap-3">
                  <span className="text-[#7C8393]">Certifications</span>
                  <span className="text-[#F5F5F7] text-right">{certsInput.trim()}</span>
                </div>
              ) : null}
              {draft.whatsappBusinessE164?.trim() ? (
                <div className="p-4 flex justify-between gap-3 tabular-nums">
                  <span className="text-[#7C8393]">WhatsApp Business</span>
                  <span className="text-[#F5F5F7]">{draft.whatsappBusinessE164.trim()}</span>
                </div>
              ) : null}
              <div className="p-4 flex justify-between gap-3 tabular-nums">
                <span className="text-[#7C8393]">Starter package</span>
                <span className="text-[#F5F5F7]">
                  {draft.packageName} · {formatINR(draft.packagePriceInr)}/mo
                </span>
              </div>
              <div className="p-4 flex justify-between gap-3">
                <span className="text-[#7C8393]">Verification</span>
                <span className="text-[#A2A8B5]">
                  {isCloudMode
                    ? wantVerification
                      ? 'Credential queued for admin review'
                      : 'Independent coach (request verification anytime in Studio Settings)'
                    : 'Unverified demo listing'}
                </span>
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
