// Mirrors firebase-blueprint.json constraints verbatim to guarantee Validation Synchronicity.

export const BLUEPRINT_PATTERNS = {
  id: /^[a-zA-Z0-9_\-]+$/,
  slug: /^[a-z0-9\-]+$/,
  dateKey: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  timeHHMM: /^[0-9]{2}:[0-9]{2}$/,
  e164Phone: /^\+[1-9][0-9]{6,14}$/,
} as const;

export const BLUEPRINT_LIMITS = {
  idMax: 128,
  nameMax: 80,
  displayNameMax: 100,
  slugMax: 80,
  headlineMax: 180,
  bioMax: 1200,
  coachingStyleMax: 600,
  cityMax: 80,
  timezoneMax: 64,
  emailMax: 160,
  phoneE164Max: 20,
  tokenMax: 64,
  titleMax: 140,
  summaryMax: 500,
  draftSummaryMax: 800,
  instructionsMax: 2000,
  constraintsMax: 800,
  noteMax: 400,
  dietaryNotesMax: 500,
  allergiesMax: 400,
  healthLimitationsMax: 600,
  coachingPrefsMax: 500,
  coachNotesMax: 2000,
  overrideNoteMax: 300,
  targetLabelMax: 80,
  dueTimeMax: 24,
  loggedValueMax: 120,
  completionNotesMax: 1000,
  topicMax: 300,
  meetingLinkMax: 300,
  notificationBodyMax: 500,
  actionRouteMax: 128,
  clientLabelMax: 120,
  reviewCommentMax: 600,
  policyVersionMax: 24,
  specialtiesMaxItems: 10,
  languagesMaxItems: 10,
  certificationsMaxItems: 10,
  featuresMaxItems: 10,
  equipmentMaxItems: 15,
  scheduledDatesMaxItems: 31,
  celebratedDateKeysMaxItems: 365,
  workoutDaysMaxItems: 7,
  mealOptionsMaxItems: 10,
  outlineMaxItems: 10,
  exerciseSafetyNotesMax: 400,
  exerciseStepsMaxItems: 10,
  exerciseAlternativeIdsMaxItems: 10,
  workoutExercisesMaxItems: 20,
  workoutNotesMax: 1000,
  nutritionNotesMax: 600,
  nutritionItemsMaxItems: 30,
  nutritionSlotsMaxItems: 5,
  trainerFeedbackMax: 1000,
  checkInChallengesMax: 800,
  achievementDescMax: 400,
  metricSnapshotMax: 120,
} as const;

export function assertValidId(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > BLUEPRINT_LIMITS.idMax || !BLUEPRINT_PATTERNS.id.test(trimmed)) {
    throw new Error(`Invalid ${fieldName}: must match ${BLUEPRINT_PATTERNS.id.source} (1..${BLUEPRINT_LIMITS.idMax} chars).`);
  }
  return trimmed;
}

export function sanitizeOptionalId(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length > BLUEPRINT_LIMITS.idMax || !BLUEPRINT_PATTERNS.id.test(trimmed)) {
    return trimmed.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, BLUEPRINT_LIMITS.idMax);
  }
  return trimmed;
}

export function sanitizeSlug(raw: string, fallback = 'coach'): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, BLUEPRINT_LIMITS.slugMax);
  if (slug.length >= 2 && BLUEPRINT_PATTERNS.slug.test(slug)) {
    return slug;
  }
  return `${fallback}-${Date.now().toString(36)}`.slice(0, BLUEPRINT_LIMITS.slugMax);
}

export function clampString(value: string | undefined, maxLen: number, fallback = ''): string {
  const str = (value ?? fallback).trim();
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen);
}

export function clampNonEmptyString(value: string | undefined, maxLen: number, fallback: string): string {
  const str = clampString(value, maxLen, fallback);
  return str.length > 0 ? str : fallback.slice(0, maxLen);
}

export function clampStringArray(items: string[] | undefined, maxItems: number, maxItemLen: number): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxItemLen));
}

export function sanitizeDateKey(value: string, fallback: string): string {
  const trimmed = value.trim();
  return BLUEPRINT_PATTERNS.dateKey.test(trimmed) ? trimmed : fallback;
}

export function sanitizeTimeHHMM(value: string, fallback = '09:00'): string {
  const trimmed = value.trim();
  return BLUEPRINT_PATTERNS.timeHHMM.test(trimmed) ? trimmed : fallback;
}

export function sanitizeE164Phone(value?: string): string {
  if (!value) return '';
  const cleaned = value.replace(/[\s\-()]/g, '').trim();
  return BLUEPRINT_PATTERNS.e164Phone.test(cleaned) ? cleaned.slice(0, BLUEPRINT_LIMITS.phoneE164Max) : '';
}
