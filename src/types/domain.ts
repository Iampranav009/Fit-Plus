export type UserRole = 'client' | 'trainer';

export type LocaleCode = 'en-IN';

export type GoalFocus =
  | 'weight_management'
  | 'healthy_weight_gain'
  | 'muscle_strength'
  | 'general_fitness'
  | 'exploring';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';

export type TrainingEnvironment = 'gym' | 'home' | 'outdoors';

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'non_vegetarian'
  | 'other'
  | 'prefer_not_to_say';

export type CoachingMode = 'online' | 'in_person' | 'hybrid';

export type TaskCategory = 'workout' | 'nutrition' | 'habit' | 'recovery' | 'check_in';

export type CompletionType = 'checkbox' | 'log_value' | 'session_log';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  timezone: string;
  locale: LocaleCode;
  isAdultConfirmed: boolean;
  createdAt: string;
}

export interface TrainerProfile {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  coachingStyle: string;
  city: string;
  coachingMode: CoachingMode;
  specialties: string[];
  languages: string[];
  experienceYears: number;
  avatarKey: string;
  coverKey: string;
  isDemoVerified: boolean;
  demoVerificationNote: string;
  demoPhoneLabel: string;
  acceptingClients: boolean;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  primaryGoal: GoalFocus;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  environment: TrainingEnvironment;
  equipment: string[];
  dietaryPreference: DietaryPreference;
  dietaryNotes?: string;
  coachNotes?: string;
  scenarioTag?: string;
  renewalDueDate?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  clientId: string;
  focus: GoalFocus;
  title: string;
  metricName: string;
  unit: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  updatedAt: string;
}

export type RelationshipStatus = 'pending' | 'active' | 'ended';

export interface CoachingRelationship {
  id: string;
  trainerId: string;
  clientId: string;
  packageId?: string;
  status: RelationshipStatus;
  startedAt: string;
  endedAt?: string;
}

export type InviteStatus = 'active' | 'redeemed' | 'expired' | 'revoked';

export interface Invite {
  id: string;
  token: string;
  trainerId: string;
  clientEmailOrLabel: string;
  suggestedPackageId?: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  redeemedByClientId?: string;
}

export type BillingCadence = 'monthly' | 'quarterly' | 'free';

export interface Package {
  id: string;
  trainerId: string;
  name: string;
  summary: string;
  priceInr: number;
  cadence: BillingCadence;
  features: string[];
  status: 'active' | 'paused';
  isDemoSample: boolean;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  clientId: string;
  trainerId: string;
  packageId: string;
  status: 'active' | 'ended';
  isDemoCheckout: true;
  enrolledAt: string;
  endedAt?: string;
}

export interface TaskTemplate {
  id: string;
  trainerId: string;
  title: string;
  category: TaskCategory;
  instructions: string;
  durationMinutes: number;
  completionType: CompletionType;
  targetLabel?: string;
  isRecoveryDefault: boolean;
  isOptionalDefault: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  clientId: string;
  trainerId?: string;
  templateId?: string;
  title: string;
  category: TaskCategory;
  instructions: string;
  durationMinutes: number;
  dueTime: string;
  completionType: CompletionType;
  targetLabel?: string;
  scheduledDates: string[]; // Local YYYY-MM-DD keys
  isOptional: boolean;
  isRecovery: boolean;
  hasCustomOverride: boolean;
  overrideNote?: string;
  createdAt: string;
}

export interface CompletionEvent {
  id: string;
  assignmentId: string;
  clientId: string;
  dateKey: string; // Local YYYY-MM-DD key
  completedAt: string;
  loggedValue?: string;
  notes?: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  cue?: string;
}

export interface WorkoutDayPlan {
  dayIndex: number; // 0 = Mon .. 6 = Sun
  dayLabel: string;
  focusTitle: string;
  isRecoveryDay: boolean;
  durationMinutes: number;
  coachInstructions: string;
  exercises: ExerciseItem[];
}

export interface WorkoutPlan {
  id: string;
  clientId: string;
  trainerId?: string;
  title: string;
  weekLabel: string;
  coachNotes: string;
  days: WorkoutDayPlan[];
  updatedAt: string;
}

export interface MealOption {
  id: string;
  slotLabel: string;
  title: string;
  portionNote: string;
  substitutions: string[];
  imageKey?: string;
}

export interface MealPlan {
  id: string;
  clientId: string;
  trainerId?: string;
  title: string;
  dietaryLabel: string;
  coachNotes: string;
  meals: MealOption[];
  updatedAt: string;
}

export interface ProgressEvent {
  id: string;
  clientId: string;
  dateKey: string;
  metricType: 'weight' | 'strength' | 'waist' | 'steps';
  label: string;
  value: number;
  unit: string;
  note?: string;
  createdAt: string;
}

export interface ConsultationSlot {
  id: string;
  trainerId: string;
  dateKey: string;
  startTime: string; // HH:mm
  endTime: string;
  timezone: string;
  mode: 'online' | 'in_person';
  status: 'available' | 'booked' | 'blocked';
}

export type BookingStatus = 'booked' | 'completed' | 'canceled' | 'rescheduled';

export interface Booking {
  id: string;
  slotId: string;
  trainerId: string;
  clientId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  timezone: string;
  topic: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  category: 'assignment' | 'consultation' | 'invite' | 'streak' | 'system';
  read: boolean;
  actionRoute?: string;
  createdAt: string;
}

export interface AIPlanDraft {
  id: string;
  trainerId: string;
  objective: GoalFocus;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  environment: TrainingEnvironment;
  dietaryPreference: DietaryPreference;
  constraints: string;
  title: string;
  summary: string;
  workoutDays: { dayLabel: string; focus: string; sampleSession: string }[];
  nutritionOutline: string[];
  habitCommitments: string[];
  status: 'draft' | 'approved' | 'saved';
  createdAt: string;
  updatedAt: string;
}

export interface DemoSessionState {
  isAuthenticated: boolean;
  activeUserId: string;
  activeRole: UserRole;
  onboardingCompleted: boolean;
  pendingInviteToken?: string;
  celebratedDateKeys: string[]; // Ensures at most once-per-day celebration
  simulateLoading: boolean;
  simulateError: boolean;
}

export interface StoreSnapshot {
  schemaVersion: number;
  generatedAt: string;
  anchorDateKey: string;
  session: DemoSessionState;
  users: User[];
  trainers: TrainerProfile[];
  clients: ClientProfile[];
  goals: Goal[];
  relationships: CoachingRelationship[];
  invites: Invite[];
  packages: Package[];
  enrollments: Enrollment[];
  templates: TaskTemplate[];
  assignments: Assignment[];
  completions: CompletionEvent[];
  workoutPlans: WorkoutPlan[];
  mealPlans: MealPlan[];
  progressEvents: ProgressEvent[];
  consultationSlots: ConsultationSlot[];
  bookings: Booking[];
  notifications: Notification[];
  aiDrafts: AIPlanDraft[];
}

export type DayCompletionStatus =
  | 'completed'
  | 'recovery_completed'
  | 'pending'
  | 'missed'
  | 'neutral'
  | 'future';

export interface DayConsistency {
  dateKey: string;
  status: DayCompletionStatus;
  requiredTotal: number;
  requiredCompleted: number;
  optionalTotal: number;
  optionalCompleted: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isRecoveryDay: boolean;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  todayStatus: DayCompletionStatus;
  lastEligibleDateKey?: string;
  countedLabel: string;
}
