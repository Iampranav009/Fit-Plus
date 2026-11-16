export type UserRole = 'client' | 'trainer' | 'admin';

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
  privacyConsentAccepted?: boolean;
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
  certifications?: string[];
  experienceYears: number;
  avatarKey: string;
  coverKey: string;
  photoUrl?: string;
  whatsappBusinessE164?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified';
  isDemoVerified: boolean;
  demoVerificationNote: string;
  demoPhoneLabel: string;
  acceptingClients: boolean;
  isPublished?: boolean;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  age?: number;
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
  foodAllergies?: string;
  healthLimitations?: string;
  preferredLanguage?: string;
  coachingPreferences?: string;
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
  durationDays?: number;
  consultationsIncluded?: number;
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
  subscriptionId?: string;
  status: 'active' | 'ended';
  isDemoCheckout: boolean;
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
  metricType: 'weight' | 'strength' | 'waist' | 'steps' | 'checkin';
  label: string;
  value: number;
  unit: string;
  note?: string;
  photoPath?: string;
  shareWithTrainer?: boolean;
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
  meetingLink?: string;
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
  meetingLink?: string;
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
  model?: string;
  generationId?: string;
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
  customExercises?: ExerciseDefinition[];
  workoutSessions?: WorkoutSession[];
  achievements?: AchievementUnlock[];
  nutritionLogs?: NutritionDiaryEntry[];
  weeklyCheckIns?: WeeklyCheckIn[];
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

export type ConsentType = 'terms_privacy' | 'health_data' | 'ai_coaching' | 'notifications';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  policyVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyActivity {
  id: string;
  clientId: string;
  clientUserId: string;
  trainerUserId: string;
  dateKey: string;
  hydrationGlasses: number;
  steps?: number;
  sleepHours?: number;
  recoveryApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerVerificationRequest {
  id: string;
  trainerId: string;
  trainerUserId: string;
  qualificationTitle: string;
  issuingBody: string;
  credentialRef?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface ClientGroup {
  id: string;
  trainerId: string;
  trainerUserId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientGroupMember {
  groupId: string;
  clientId: string;
  clientUserId: string;
  trainerUserId: string;
  addedAt: string;
}

export interface StreakRecord {
  id: string;
  clientId: string;
  clientUserId: string;
  trainerUserId: string;
  currentStreak: number;
  longestStreak: number;
  lastEligibleDateKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPrefs {
  assignmentReminders: boolean;
  consultationAlerts: boolean;
  streakMilestones: boolean;
  billingReceipts: boolean;
  browserPushEnabled: boolean;
  updatedAt?: string;
}

export interface TrainerReview {
  id: string;
  trainerId: string;
  clientId: string;
  clientUserId: string;
  relationshipId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentProvider = 'cashfree' | 'razorpay' | 'free_tier';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type RefundStatus = 'none' | 'pending' | 'processed' | 'failed';
export type SettlementStatus = 'not_applicable' | 'pending_onboarding' | 'scheduled' | 'settled';

export interface TrainerSettlementAccount {
  trainerId: string;
  provider: 'cashfree_easy_split';
  enabled: boolean;
  vendorId?: string;
  kycStatus: 'not_started' | 'pending_review' | 'approved';
}

export interface Subscription {
  id: string;
  clientId: string;
  clientUserId: string;
  trainerId: string;
  trainerUserId: string;
  packageId: string;
  packageName: string;
  priceInr: number;
  cadence: BillingCadence;
  durationDays: number;
  consultationsIncluded: number;
  status: 'active' | 'canceled' | 'expired';
  provider: PaymentProvider;
  latestPaymentId?: string;
  providerOrderId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  /** Legacy historical field preserved for pre-migration Razorpay records. */
  razorpayOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  subscriptionId?: string;
  clientId: string;
  clientUserId: string;
  trainerId: string;
  trainerUserId: string;
  packageId: string;
  packageName: string;
  invoiceNumber: string;
  amountPaise: number;
  amountInr: number;
  currency: 'INR';
  status: PaymentStatus;
  provider: PaymentProvider;
  mode?: 'sandbox' | 'production' | 'test' | 'live';
  providerOrderId?: string;
  providerPaymentId?: string;
  cfOrderId?: string;
  paymentSessionId?: string;
  paymentMethod?: string;
  refundStatus?: RefundStatus;
  settlementStatus?: SettlementStatus;
  verifiedAt?: string;
  webhookEventId?: string;
  lastWebhookAt?: string;
  /** Legacy historical fields preserved for pre-migration Razorpay records. */
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalTrainers: number;
  publishedTrainers: number;
  verifiedTrainers: number;
  totalClients: number;
  activeRelationships: number;
  activeSubscriptions: number;
  capturedRevenueInr: number;
  capturedPaymentsCount: number;
  pendingVerifications: number;
  totalReviews: number;
  trainersSummary: Array<{
    id: string;
    userId: string;
    displayName: string;
    city: string;
    verificationStatus: 'unverified' | 'pending' | 'verified';
    isPublished: boolean;
    activeClientsCount: number;
  }>;
  recentReviews: TrainerReview[];
}

// -----------------------------------------------------------------------------
// Stage 4A — Live Workout, Exercise Library, Nutrition Diary, Check-ins, Wrapped
// -----------------------------------------------------------------------------
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'full_body'
  | 'cardio';

export type ExerciseEnvironment = 'gym' | 'home' | 'both';

export type ExerciseEquipment =
  | 'bodyweight'
  | 'dumbbells'
  | 'barbell'
  | 'kettlebell'
  | 'cable'
  | 'machine'
  | 'resistance_band'
  | 'pullup_bar';

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: 'strength' | 'mobility' | 'conditioning' | 'recovery';
  environment: ExerciseEnvironment;
  equipment: ExerciseEquipment;
  difficulty: ExperienceLevel;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  instructions: string[];
  commonMistakes: string[];
  safetyNotes: string;
  alternativeIds: string[];
  isCustom?: boolean;
  trainerId?: string;
  trainerUserId?: string;
  createdAt?: string;
}

export interface WorkoutSetLog {
  setNumber: number;
  reps: number;
  weightKg: number;
  completed: boolean;
  isPersonalRecord?: boolean;
  completedAt?: string;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  exerciseName: string;
  substitutedFromName?: string;
  targetSets: string;
  targetReps: string;
  restSeconds: number;
  sets: WorkoutSetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  clientId: string;
  clientUserId?: string;
  trainerUserId?: string;
  assignmentId?: string;
  planId?: string;
  dayIndex?: number;
  title: string;
  dateKey: string;
  status: 'in_progress' | 'paused' | 'completed';
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  totalVolumeKg: number;
  completedSetsCount: number;
  prCount: number;
  exercises: WorkoutExerciseLog[];
  notes?: string;
  updatedAt: string;
}

export type AchievementBadgeId =
  | 'first_workout'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'streak_60'
  | 'streak_100'
  | 'personal_record'
  | 'consistency_10'
  | 'consistency_30';

export interface AchievementUnlock {
  id: string;
  badgeId: AchievementBadgeId;
  clientId: string;
  clientUserId?: string;
  title: string;
  description: string;
  unlockedAt: string;
  metricSnapshot?: string;
}

export type NutritionMealSlot =
  | 'breakfast'
  | 'lunch'
  | 'evening_snack'
  | 'dinner'
  | 'additional';

export interface NutritionFoodItem {
  id: string;
  name: string;
  hindiOrRegional?: string;
  category:
    | 'breakfast'
    | 'dal_legumes'
    | 'breads_rice'
    | 'protein'
    | 'snacks'
    | 'dairy_beverages';
  dietaryTags: Array<'vegetarian' | 'vegan' | 'eggitarian' | 'non_vegetarian'>;
  servingLabel: string;
  servingGrams: number;
  estimatedCalories: number;
  estimatedProteinG: number;
  estimatedCarbsG: number;
  estimatedFatG: number;
}

export interface LoggedFoodItem {
  id: string;
  foodId?: string;
  name: string;
  slot: NutritionMealSlot;
  servingLabel: string;
  servings: number;
  estimatedCalories: number;
  estimatedProteinG: number;
  estimatedCarbsG: number;
  estimatedFatG: number;
  isEstimated: true;
}

export interface NutritionDiaryEntry {
  id: string;
  clientId: string;
  clientUserId?: string;
  trainerUserId?: string;
  dateKey: string;
  completedSlots: NutritionMealSlot[];
  items: LoggedFoodItem[];
  waterGlasses: number;
  personalNotes?: string;
  trainerFeedback?: string;
  trainerFeedbackAt?: string;
  updatedAt: string;
}

export interface WeeklyCheckIn {
  id: string;
  clientId: string;
  clientUserId?: string;
  trainerUserId?: string;
  weekKey: string;
  dateKey: string;
  weightKg?: number;
  energyLevel: number;
  sleepQuality: number;
  workoutDifficulty: number;
  hungerLevel: number;
  scheduleChallenges?: string;
  generalFeedback?: string;
  photoPath?: string;
  shareWithTrainer?: boolean;
  trainerFeedback?: string;
  trainerReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WrappedMonthlySummary {
  monthKey: string;
  monthLabel: string;
  workoutsCompleted: number;
  totalTrainingMinutes: number;
  totalVolumeKg: number;
  consistencyPercent: number;
  longestStreakDays: number;
  prsAchieved: number;
  commitmentsCompleted: number;
  achievementsEarned: number;
  topExercise?: string;
  optionalWeightChangeKg?: number;
}



