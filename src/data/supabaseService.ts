import { supabase, markThirdPartyAuthFailed } from '../lib/supabase';
import { uploadToStorage, getStorageSignedUrl, STORAGE_BUCKETS, type StorageBucketName } from '../lib/supabaseStorage';
import type { Database, Json } from '../types/database.types';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import {
  signInWithGooglePopup,
  registerWithEmailPassword,
  signInWithEmailPassword,
  resendEmailVerification,
  sendPasswordReset,
  reloadCurrentUser,
  signOutFirebaseAuth,
  deleteAccountAndData,
  checkIsPlatformAdmin,
  CURRENT_POLICY_VERSION,
  type FirebaseUserBootstrapResult,
  type LiveFirestoreSlice,
  type PublicInviteResolveResult,
} from './firestoreService';
import type {
  User,
  UserRole,
  TrainerProfile,
  ClientProfile,
  Package,
  CoachingRelationship,
  Invite,
  Enrollment,
  Subscription,
  PaymentRecord,
  TrainerReview,
  TaskTemplate,
  Assignment,
  CompletionEvent,
  DailyActivity,
  StreakRecord,
  ProgressEvent,
  WorkoutPlan,
  MealPlan,
  ConsultationSlot,
  Booking,
  Notification,
  AIPlanDraft,
  ClientGroup,
  ClientGroupMember,
  ConsentRecord,
  TrainerVerificationRequest,
  AuditLogEntry,
  ExerciseDefinition,
  WorkoutSession,
  AchievementUnlock,
  NutritionDiaryEntry,
  WeeklyCheckIn,
  ChatConversation,
  ChatMessage,
  WorkoutProgramTemplate,
  NutritionProgramTemplate,
  ScheduledReminder,
  ConsentType,
  AchievementBadgeId,
  RelationshipStatus,
  BookingStatus,
} from '../types/domain';

// Export Auth functions directly (Firebase Auth remains sole identity provider)
export {
  signInWithGooglePopup,
  registerWithEmailPassword,
  signInWithEmailPassword,
  resendEmailVerification,
  sendPasswordReset,
  reloadCurrentUser,
  signOutFirebaseAuth,
  deleteAccountAndData,
  checkIsPlatformAdmin,
  CURRENT_POLICY_VERSION,
  type FirebaseUserBootstrapResult,
  type LiveFirestoreSlice,
  type PublicInviteResolveResult,
};

// -----------------------------------------------------------------------------
// Domain <-> PostgreSQL Mappings
// -----------------------------------------------------------------------------

export function mapUser(row: Database['public']['Tables']['app_users']['Row']): User {
  return {
    id: row.firebase_uid,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role as UserRole,
    timezone: row.timezone,
    locale: row.locale as 'en-IN',
    isAdultConfirmed: row.is_adult_confirmed,
    privacyConsentAccepted: row.privacy_consent_accepted,
    createdAt: row.created_at,
  };
}

export function mapTrainer(row: Database['public']['Tables']['trainer_profiles']['Row']): TrainerProfile {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    coachingStyle: row.coaching_style,
    city: row.city,
    coachingMode: row.coaching_mode,
    specialties: row.specialties || [],
    languages: row.languages || [],
    certifications: row.certifications || [],
    experienceYears: row.experience_years,
    avatarKey: row.avatar_key,
    coverKey: row.cover_key,
    photoUrl: row.photo_url || undefined,
    whatsappBusinessE164: row.whatsapp_business_e164 || undefined,
    verificationStatus: row.verification_status,
    isDemoVerified: row.is_demo_verified,
    demoVerificationNote: row.demo_verification_note,
    demoPhoneLabel: row.demo_phone_label,
    acceptingClients: row.accepting_clients,
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

export function mapClient(row: Database['public']['Tables']['client_profiles']['Row']): ClientProfile {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    age: row.age ?? undefined,
    heightCm: row.height_cm ? Number(row.height_cm) : undefined,
    weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
    targetWeightKg: row.target_weight_kg ? Number(row.target_weight_kg) : undefined,
    primaryGoal: row.primary_goal as any,
    experienceLevel: row.experience_level,
    daysPerWeek: row.days_per_week,
    environment: row.environment,
    equipment: (row.equipment || []) as any,
    dietaryPreference: row.dietary_preference as any,
    dietaryNotes: row.dietary_notes || undefined,
    foodAllergies: row.food_allergies || undefined,
    healthLimitations: row.health_limitations || undefined,
    preferredLanguage: row.preferred_language || undefined,
    coachingPreferences: row.coaching_preferences || undefined,
    coachNotes: row.coach_notes || undefined,
    scenarioTag: row.scenario_tag || undefined,
    renewalDueDate: row.renewal_due_date || undefined,
    createdAt: row.created_at,
  };
}

export function mapPackage(row: Database['public']['Tables']['coaching_packages']['Row']): Package {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    summary: row.summary,
    priceInr: row.price_inr,
    cadence: row.cadence,
    durationDays: row.duration_days,
    consultationsIncluded: row.consultations_included,
    features: row.features || [],
    status: row.status,
    isDemoSample: row.is_demo_sample,
    createdAt: row.created_at,
  };
}

export function mapRelationship(row: Database['public']['Tables']['coaching_relationships']['Row']): CoachingRelationship {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    clientId: row.client_id,
    packageId: row.package_id || undefined,
    status: row.status as RelationshipStatus,
    startedAt: row.started_at,
    endedAt: row.ended_at || undefined,
  };
}

export function mapInvite(row: Database['public']['Tables']['trainer_invites']['Row']): Invite {
  return {
    id: row.id,
    token: row.token,
    trainerId: row.trainer_id,
    clientEmailOrLabel: row.client_email_or_label,
    suggestedPackageId: row.suggested_package_id || undefined,
    status: row.status,
    redeemedByClientId: row.redeemed_by_client_id || undefined,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function mapEnrollment(row: Database['public']['Tables']['enrollments']['Row']): Enrollment {
  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id,
    packageId: row.package_id,
    subscriptionId: row.subscription_id || undefined,
    status: row.status,
    isDemoCheckout: row.is_demo_checkout,
    enrolledAt: row.enrolled_at,
    endedAt: row.ended_at || undefined,
  };
}

export function mapSubscription(row: Database['public']['Tables']['subscriptions']['Row']): Subscription {
  return {
    id: row.id,
    clientId: row.client_user_id.replace(/^usr_/, 'cln_'),
    clientUserId: row.client_user_id,
    trainerId: row.trainer_user_id.replace(/^usr_/, 'trn_'),
    trainerUserId: row.trainer_user_id,
    packageId: row.package_id,
    packageName: 'Coaching Package',
    priceInr: row.amount_inr,
    cadence: 'monthly',
    durationDays: 30,
    consultationsIncluded: 1,
    status: (row.status === 'cancelled' ? 'canceled' : row.status) as any,
    provider: 'cashfree',
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPayment(row: Database['public']['Tables']['payment_records']['Row']): PaymentRecord {
  return {
    id: row.id,
    clientId: row.client_user_id.replace(/^usr_/, 'cln_'),
    clientUserId: row.client_user_id,
    trainerId: row.trainer_user_id.replace(/^usr_/, 'trn_'),
    trainerUserId: row.trainer_user_id,
    packageId: row.package_id,
    packageName: 'Coaching Package',
    invoiceNumber: `INV-${row.id}`,
    subscriptionId: row.subscription_id || undefined,
    amountInr: row.amount_inr,
    amountPaise: row.amount_paise,
    currency: 'INR',
    status: row.status as any,
    provider: 'cashfree',
    providerOrderId: row.cashfree_order_id,
    cfOrderId: row.cashfree_order_id,
    providerPaymentId: row.cashfree_payment_id || undefined,
    paymentMethod: row.payment_method || undefined,
    couponCode: row.coupon_code || undefined,
    discountInr: row.discount_inr,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReview(row: Database['public']['Tables']['trainer_reviews']['Row']): TrainerReview {
  return {
    id: row.id,
    trainerId: row.trainer_user_id,
    clientId: row.client_user_id,
    clientUserId: row.client_user_id,
    relationshipId: '',
    authorName: 'Verified Member',
    rating: row.rating,
    comment: row.review_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTaskTemplate(row: Database['public']['Tables']['task_templates']['Row']): TaskTemplate {
  return {
    id: row.id,
    trainerId: row.trainer_user_id,
    title: row.title,
    category: row.category,
    instructions: row.instructions,
    durationMinutes: row.duration_minutes,
    completionType: row.completion_type,
    targetLabel: row.target_label || undefined,
    isRecoveryDefault: row.is_recovery_default,
    isOptionalDefault: row.is_optional_default,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAssignment(row: Database['public']['Tables']['task_assignments']['Row']): Assignment {
  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id || undefined,
    templateId: row.template_id || undefined,
    title: row.title,
    category: row.category,
    instructions: row.instructions,
    durationMinutes: row.duration_minutes,
    dueTime: row.due_time,
    completionType: row.completion_type,
    targetLabel: row.target_label || undefined,
    scheduledDates: row.scheduled_dates || [],
    isOptional: row.is_optional,
    isRecovery: row.is_recovery,
    hasCustomOverride: row.has_custom_override,
    overrideNote: row.override_note || undefined,
    createdAt: row.created_at,
  };
}

export function mapCompletion(row: Database['public']['Tables']['task_completions']['Row']): CompletionEvent {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    clientId: row.client_id,
    dateKey: row.date_key,
    completedAt: row.completed_at,
    loggedValue: row.logged_value || undefined,
    notes: row.notes || undefined,
  };
}

export function mapDailyActivity(row: Database['public']['Tables']['daily_activity']['Row']): DailyActivity {
  return {
    id: row.id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    trainerUserId: row.trainer_user_id || '',
    dateKey: row.date_key,
    hydrationGlasses: row.water_glasses,
    steps: row.step_count,
    sleepHours: row.sleep_hours ? Number(row.sleep_hours) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProgressEvent(row: Database['public']['Tables']['progress_events']['Row']): ProgressEvent {
  return {
    id: row.id,
    clientId: row.client_id,
    dateKey: row.date_key,
    metricType: row.metric_type as any,
    label: row.metric_type,
    value: Number(row.numeric_value),
    unit: 'kg',
    photoPath: row.photo_key || row.photo_url || undefined,
    shareWithTrainer: row.share_with_trainer,
    note: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function mapWorkoutPlan(row: Database['public']['Tables']['workout_plans']['Row']): WorkoutPlan {
  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id || undefined,
    title: row.name,
    weekLabel: 'Week 1',
    coachNotes: row.focus,
    days: (row.days as any) || [],
    updatedAt: row.updated_at,
  };
}

export function mapMealPlan(row: Database['public']['Tables']['meal_plans']['Row']): MealPlan {
  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id || undefined,
    title: row.title,
    dietaryLabel: 'Balanced Diet',
    coachNotes: row.notes || '',
    meals: (row.slots as any) || [],
    updatedAt: row.updated_at,
  };
}

export function mapConsultationSlot(row: Database['public']['Tables']['consultation_slots']['Row']): ConsultationSlot {
  return {
    id: row.id,
    trainerId: row.trainer_user_id,
    dateKey: row.start_time ? row.start_time.slice(0, 10) : '',
    startTime: row.start_time ? row.start_time.slice(11, 16) : '09:00',
    endTime: row.end_time ? row.end_time.slice(11, 16) : '10:00',
    timezone: 'Asia/Kolkata',
    mode: 'online',
    meetingLink: row.meeting_link || undefined,
    status: (row.status === 'cancelled' ? 'blocked' : row.status) as any,
  };
}

export function mapBooking(row: Database['public']['Tables']['consultation_bookings']['Row']): Booking {
  return {
    id: row.id,
    slotId: row.slot_id,
    clientId: row.client_user_id,
    trainerId: row.trainer_user_id,
    dateKey: '',
    startTime: '09:00',
    endTime: '10:00',
    timezone: 'Asia/Kolkata',
    topic: 'Consultation',
    status: (row.status === 'cancelled' ? 'canceled' : row.status) as BookingStatus,
    meetingLink: row.meeting_link || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNotification(row: Database['public']['Tables']['notifications']['Row']): Notification {
  let category: Notification['category'] = 'system';
  if (row.category === 'workout' || row.category === 'nutrition') category = 'assignment';
  else if (row.category === 'check_in') category = 'streak';
  else if (row.category === 'billing') category = 'consultation';

  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    category,
    title: row.title,
    body: row.body,
    actionRoute: row.action_url || undefined,
    read: row.is_read,
    createdAt: row.created_at,
  };
}

export function mapAIDraft(row: Database['public']['Tables']['ai_plan_drafts']['Row']): AIPlanDraft {
  return {
    id: row.id,
    trainerId: row.trainer_user_id,
    objective: (row.objective as any) || 'general_fitness',
    experienceLevel: (row.level as any) || 'beginner',
    daysPerWeek: row.days_per_week,
    environment: 'gym',
    dietaryPreference: (row.dietary_pref as any) || 'vegetarian',
    constraints: '',
    title: `${row.objective} Plan`,
    summary: `Target ${row.target_calories} kcal, ${row.target_protein_g}g protein`,
    workoutDays: (row.workout_days as any) || [],
    nutritionOutline: [],
    habitCommitments: [],
    status: (row.status === 'applied' || row.status === 'discarded' ? 'saved' : row.status) as any,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClientGroup(row: Database['public']['Tables']['client_groups']['Row']): ClientGroup {
  return {
    id: row.id,
    trainerId: row.trainer_user_id,
    trainerUserId: row.trainer_user_id,
    name: row.name,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClientGroupMember(row: Database['public']['Tables']['client_group_members']['Row']): ClientGroupMember {
  return {
    groupId: row.group_id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    trainerUserId: row.trainer_user_id,
    addedAt: row.joined_at,
  };
}

export function mapStreak(row: Database['public']['Tables']['streak_records']['Row']): StreakRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    trainerUserId: row.trainer_user_id || '',
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastEligibleDateKey: row.last_completed_date_key || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapConsent(row: Database['public']['Tables']['consent_records']['Row']): ConsentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    consentType: row.consent_type as any,
    granted: true,
    policyVersion: row.policy_version,
    createdAt: row.accepted_at,
    updatedAt: row.accepted_at,
  };
}

export function mapVerification(row: Database['public']['Tables']['trainer_verification_requests']['Row']): TrainerVerificationRequest {
  return {
    id: row.id,
    trainerId: row.trainer_user_id,
    trainerUserId: row.trainer_user_id,
    qualificationTitle: row.qualification_title,
    issuingBody: row.issuing_body,
    credentialRef: row.document_url,
    status: row.status,
    reviewNote: row.reviewer_note || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAuditLog(row: Database['public']['Tables']['audit_logs']['Row']): AuditLogEntry {
  return {
    id: row.id,
    actorUserId: row.actor_user_id || 'system',
    action: row.action,
    targetType: row.target_resource,
    targetId: row.target_resource,
    summary: row.action,
    createdAt: row.created_at,
  };
}

export function mapExercise(row: Database['public']['Tables']['exercise_definitions']['Row']): ExerciseDefinition {
  return {
    id: row.id,
    name: row.name,
    category: 'strength',
    environment: 'gym',
    equipment: 'barbell',
    difficulty: 'intermediate',
    primaryMuscles: [row.muscle_group as any],
    secondaryMuscles: (row.secondary_muscles as any) || [],
    instructions: row.instructions || [],
    commonMistakes: [],
    safetyNotes: '',
    alternativeIds: [],
    isCustom: row.is_custom,
    trainerId: row.created_by_user_id || undefined,
    trainerUserId: row.created_by_user_id || undefined,
    createdAt: row.created_at,
  };
}

export function mapWorkoutSession(row: Database['public']['Tables']['workout_sessions']['Row']): WorkoutSession {
  return {
    id: row.id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    trainerUserId: row.trainer_user_id || undefined,
    assignmentId: row.assignment_id || undefined,
    title: row.title,
    dateKey: row.date_key,
    status: 'completed',
    startedAt: row.created_at,
    completedAt: row.updated_at,
    durationSeconds: row.duration_minutes * 60,
    totalVolumeKg: Number(row.total_volume_kg),
    completedSetsCount: 0,
    prCount: 0,
    exercises: (row.exercises as any) || [],
    notes: row.coach_feedback || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAchievement(row: Database['public']['Tables']['achievement_unlocks']['Row']): AchievementUnlock {
  return {
    id: row.id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    badgeId: row.badge_id as AchievementBadgeId,
    title: 'Achievement Unlocked',
    description: 'Milestone reached',
    unlockedAt: row.unlocked_at,
  };
}

export function mapNutritionLog(row: Database['public']['Tables']['nutrition_diary_entries']['Row']): NutritionDiaryEntry {
  return {
    id: row.id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    trainerUserId: row.trainer_user_id || undefined,
    dateKey: row.date_key,
    completedSlots: [row.slot as any],
    items: (row.foods as any) || [],
    waterGlasses: 0,
    trainerFeedback: row.coach_feedback || undefined,
    trainerFeedbackAt: row.coach_feedback_at || undefined,
    updatedAt: row.updated_at,
  };
}

export function mapWeeklyCheckIn(row: Database['public']['Tables']['weekly_check_ins']['Row']): WeeklyCheckIn {
  return {
    id: row.id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    trainerUserId: row.trainer_user_id || undefined,
    weekKey: row.date_key,
    dateKey: row.date_key,
    weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
    energyLevel: row.energy_rating || 5,
    sleepQuality: row.sleep_rating || 5,
    workoutDifficulty: row.stress_rating || 3,
    hungerLevel: row.digestive_rating || 3,
    scheduleChallenges: row.struggle_of_the_week || undefined,
    generalFeedback: row.win_of_the_week || undefined,
    photoPath: row.photo_url || undefined,
    shareWithTrainer: true,
    trainerFeedback: row.trainer_feedback || undefined,
    trainerReviewedAt: row.trainer_feedback_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapConversation(row: Database['public']['Tables']['chat_conversations']['Row']): ChatConversation {
  return {
    id: row.id,
    clientId: row.client_id,
    clientUserId: row.client_user_id,
    clientName: row.client_name,
    clientAvatar: row.client_avatar || undefined,
    trainerId: row.trainer_id,
    trainerUserId: row.trainer_user_id,
    trainerName: row.trainer_name,
    trainerAvatar: row.trainer_avatar || undefined,
    lastMessageText: row.last_message_text || undefined,
    lastMessageAt: row.last_message_at || undefined,
    lastMessageSenderId: row.last_message_sender_id || undefined,
    unreadCountClient: row.unread_count_client,
    unreadCountTrainer: row.unread_count_trainer,
    isBlocked: row.is_blocked,
    blockedByUserId: row.blocked_by_user_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapWorkoutTemplate(row: Database['public']['Tables']['workout_program_templates']['Row']): WorkoutProgramTemplate {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    title: row.title,
    description: row.description,
    category: row.category,
    tags: row.tags || [],
    weekCount: row.week_count,
    days: (row.days as any) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNutritionTemplate(row: Database['public']['Tables']['nutrition_program_templates']['Row']): NutritionProgramTemplate {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    title: row.title,
    description: row.description,
    dietaryType: row.dietary_type as any,
    targetKcal: row.target_kcal,
    targetProteinG: row.target_protein_g,
    hydrationTargetGlasses: row.hydration_target_glasses,
    slots: (row.slots as any) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapScheduledReminder(row: Database['public']['Tables']['scheduled_reminders']['Row']): ScheduledReminder {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    category: row.category as any,
    title: row.title,
    body: row.body,
    scheduledFor: row.scheduled_for,
    triggerStatus: row.trigger_status,
    idempotencyKey: row.idempotency_key,
    channel: row.channel as any,
    createdAt: row.created_at,
  };
}

// -----------------------------------------------------------------------------
// Core Bootstrap & Directory
// -----------------------------------------------------------------------------

export async function ensureUserDocument(
  fbUser: FirebaseAuthUser,
): Promise<FirebaseUserBootstrapResult> {
  const uid = fbUser.uid;
  const displayParts = (fbUser.displayName || 'FitPlus Member').trim().split(/\s+/);
  const fallbackFirstName = displayParts[0] || 'Member';
  const fallbackLastName = displayParts.slice(1).join(' ') || '';
  const fallbackEmail = fbUser.email || `${uid}@fitplus.local`;

  if (!fbUser.emailVerified) {
    return {
      user: {
        id: uid,
        firstName: fallbackFirstName,
        lastName: fallbackLastName,
        email: fallbackEmail,
        role: 'client',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        isAdultConfirmed: false,
        privacyConsentAccepted: false,
        createdAt: new Date().toISOString(),
      },
      onboardingCompleted: false,
      celebratedDateKeys: [],
      emailVerified: false,
      isPlatformAdmin: false,
    };
  }

  // Check admin
  let isPlatformAdmin = fbUser.email?.toLowerCase() === 'pranavshindeji5001@gmail.com';
  let userRow: Database['public']['Tables']['app_users']['Row'] | null = null;

  try {
    const adminRes = await supabase.from('platform_admins').select('firebase_uid').eq('firebase_uid', uid).maybeSingle();
    if (adminRes.data) isPlatformAdmin = true;
    if (adminRes.error && (adminRes.error.code === 'PGRST301' || adminRes.error.message?.includes('JWT'))) {
      markThirdPartyAuthFailed();
    }
  } catch {
    // proceed
  }

  try {
    const userRes = await supabase.from('app_users').select('*').eq('firebase_uid', uid).maybeSingle();
    if (userRes.data) {
      userRow = userRes.data;
    }
    if (userRes.error && (userRes.error.code === 'PGRST301' || userRes.error.message?.includes('JWT'))) {
      markThirdPartyAuthFailed();
    }
  } catch {
    // proceed
  }

  if (userRow) {
    return {
      user: mapUser(userRow),
      onboardingCompleted: userRow.onboarding_completed,
      celebratedDateKeys: userRow.celebrated_date_keys || [],
      emailVerified: true,
      isPlatformAdmin,
      pendingInviteToken: userRow.pending_invite_token || undefined,
    };
  }

  // Attempt backend claims and role coordination via /api/auth/provision-claims
  try {
    const idToken = await fbUser.getIdToken();
    const provRes = await fetch('/api/auth/provision-claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (provRes.ok) {
      const provData = await provRes.json();
      if (provData.claims?.is_admin) isPlatformAdmin = true;
      const resolvedRole = (provData.claims?.user_role || (isPlatformAdmin ? 'admin' : (overrides?.role || 'client'))) as UserRole;
      return {
        user: {
          id: uid,
          firstName: fallbackFirstName,
          lastName: fallbackLastName,
          email: fallbackEmail,
          role: resolvedRole,
          timezone: 'Asia/Kolkata',
          locale: 'en-IN',
          isAdultConfirmed: false,
          privacyConsentAccepted: false,
          createdAt: new Date().toISOString(),
        },
        onboardingCompleted: false,
        celebratedDateKeys: [],
        emailVerified: true,
        isPlatformAdmin,
      };
    }
  } catch {
    // fallback below
  }

  // Fallback user object
  return {
    user: {
      id: uid,
      firstName: fallbackFirstName,
      lastName: fallbackLastName,
      email: fallbackEmail,
      role: isPlatformAdmin ? 'admin' : (overrides?.role || 'client'),
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      isAdultConfirmed: false,
      privacyConsentAccepted: false,
      createdAt: new Date().toISOString(),
    },
    onboardingCompleted: false,
    celebratedDateKeys: [],
    emailVerified: true,
    isPlatformAdmin,
  };
}

export async function fetchPublicTrainersAndPackages(): Promise<{
  trainers: TrainerProfile[];
  packages: Package[];
  reviews: TrainerReview[];
}> {
  const [trRes, pkgRes, revRes] = await Promise.all([
    supabase.from('trainer_profiles').select('*').eq('accepting_clients', true).eq('is_published', true),
    supabase.from('coaching_packages').select('*').eq('status', 'active'),
    supabase.from('trainer_reviews').select('*'),
  ]);

  return {
    trainers: (trRes.data || []).map(mapTrainer),
    packages: (pkgRes.data || []).map(mapPackage),
    reviews: (revRes.data || []).map(mapReview),
  };
}

export async function resolveInvitePublic(token: string): Promise<PublicInviteResolveResult> {
  const clean = token.trim().toUpperCase();
  if (!clean || !/^[A-Z0-9_\-]+$/.test(clean) || clean.length > 64) {
    return { source: 'client_fallback', state: 'not_found' };
  }

  try {
    const res = await fetch(`/api/invites/resolve?token=${encodeURIComponent(clean)}`);
    if (res.ok) {
      return (await res.json()) as PublicInviteResolveResult;
    }
  } catch {
    // fallback
  }

  const { data: inv } = await supabase.from('trainer_invites').select('*').eq('token', clean).maybeSingle();
  if (!inv) return { source: 'client_fallback', state: 'not_found' };

  if (inv.status === 'revoked') return { source: 'client_fallback', state: 'revoked' };
  if (inv.status === 'redeemed') return { source: 'client_fallback', state: 'redeemed' };
  if (new Date(inv.expires_at) < new Date()) return { source: 'client_fallback', state: 'expired' };

  const { data: tr } = await supabase.from('trainer_profiles').select('*').eq('user_id', inv.trainer_user_id).maybeSingle();
  let pkg: Package | undefined = undefined;
  if (inv.suggested_package_id) {
    const { data: pkgRow } = await supabase.from('coaching_packages').select('*').eq('id', inv.suggested_package_id).maybeSingle();
    if (pkgRow) pkg = mapPackage(pkgRow);
  }

  return {
    source: 'client_fallback',
    state: 'active',
    invite: mapInvite(inv),
    trainer: tr ? mapTrainer(tr) : undefined,
    packages: pkg ? [pkg] : undefined,
  };
}

// -----------------------------------------------------------------------------
// Workspace Subscription (Supabase Client + Realtime)
// -----------------------------------------------------------------------------

export function subscribeAuthenticatedWorkspace(
  fbUser: FirebaseAuthUser,
  onUpdate: (patch: Partial<LiveFirestoreSlice>) => void,
  options?: { isPlatformAdmin?: boolean; role?: UserRole },
): () => void {
  if (!fbUser.emailVerified) {
    return () => {};
  }

  const uid = fbUser.uid;
  const isPlatformAdmin = Boolean(options?.isPlatformAdmin);

  // Initial comprehensive hydration from Supabase PostgreSQL tables
  void Promise.all([
    supabase.from('app_users').select('*').eq('firebase_uid', uid).maybeSingle(),
    supabase.from('trainer_profiles').select('*'),
    supabase.from('coaching_packages').select('*'),
    supabase.from('client_profiles').select('*'),
    supabase.from('coaching_relationships').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('trainer_invites').select('*').or(`trainer_user_id.eq.${uid},redeemed_by_user_id.eq.${uid}`),
    supabase.from('enrollments').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('subscriptions').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('payment_records').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('trainer_reviews').select('*'),
    supabase.from('task_templates').select('*').eq('trainer_user_id', uid),
    supabase.from('task_assignments').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('task_completions').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('daily_activity').select('*').eq('client_user_id', uid),
    supabase.from('progress_events').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('workout_plans').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('meal_plans').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('consultation_slots').select('*').or(`trainer_user_id.eq.${uid},booked_by_user_id.eq.${uid}`),
    supabase.from('consultation_bookings').select('*').or(`trainer_user_id.eq.${uid},client_user_id.eq.${uid}`),
    supabase.from('notifications').select('*').eq('recipient_user_id', uid),
    supabase.from('ai_plan_drafts').select('*').eq('trainer_user_id', uid),
    supabase.from('client_groups').select('*').eq('trainer_user_id', uid),
    supabase.from('client_group_members').select('*').or(`trainer_user_id.eq.${uid},client_user_id.eq.${uid}`),
    supabase.from('streak_records').select('*').eq('client_user_id', uid),
    supabase.from('consent_records').select('*').eq('user_id', uid),
    isPlatformAdmin
      ? supabase.from('trainer_verification_requests').select('*')
      : supabase.from('trainer_verification_requests').select('*').eq('trainer_user_id', uid),
    isPlatformAdmin
      ? supabase.from('audit_logs').select('*')
      : supabase.from('audit_logs').select('*').eq('actor_user_id', uid),
    supabase.from('exercise_definitions').select('*'),
    supabase.from('workout_sessions').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('achievement_unlocks').select('*').eq('client_user_id', uid),
    supabase.from('nutrition_diary_entries').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('weekly_check_ins').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('chat_conversations').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`),
    supabase.from('workout_program_templates').select('*').eq('trainer_user_id', uid),
    supabase.from('nutrition_program_templates').select('*').eq('trainer_user_id', uid),
    supabase.from('scheduled_reminders').select('*').eq('recipient_user_id', uid),
  ]).then(([
    userRes,
    trainersRes,
    packagesRes,
    clientsRes,
    relationshipsRes,
    invitesRes,
    enrollmentsRes,
    subscriptionsRes,
    paymentsRes,
    reviewsRes,
    templatesRes,
    assignmentsRes,
    completionsRes,
    activitiesRes,
    progressRes,
    workoutPlansRes,
    mealPlansRes,
    slotsRes,
    bookingsRes,
    notificationsRes,
    aiDraftsRes,
    groupsRes,
    groupMembersRes,
    streaksRes,
    consentsRes,
    verificationRes,
    auditRes,
    exercisesRes,
    sessionsRes,
    achievementsRes,
    nutritionLogsRes,
    checkInsRes,
    conversationsRes,
    workoutTemplatesRes,
    nutritionTemplatesRes,
    scheduledRemindersRes,
  ]) => {
    const userRow = userRes.data;
    if (userRes.error && (userRes.error.code === 'PGRST301' || userRes.error.message?.includes('JWT'))) {
      markThirdPartyAuthFailed();
    }
    onUpdate({
      users: userRow ? [mapUser(userRow)] : undefined,
      trainers: (trainersRes.data || []).map(mapTrainer),
      packages: (packagesRes.data || []).map(mapPackage),
      clients: (clientsRes.data || []).map(mapClient),
      relationships: (relationshipsRes.data || []).map(mapRelationship),
      invites: (invitesRes.data || []).map(mapInvite),
      enrollments: (enrollmentsRes.data || []).map(mapEnrollment),
      subscriptions: (subscriptionsRes.data || []).map(mapSubscription),
      payments: (paymentsRes.data || []).map(mapPayment),
      reviews: (reviewsRes.data || []).map(mapReview),
      templates: (templatesRes.data || []).map(mapTaskTemplate),
      assignments: (assignmentsRes.data || []).map(mapAssignment),
      completions: (completionsRes.data || []).map(mapCompletion),
      dailyActivities: (activitiesRes.data || []).map(mapDailyActivity),
      progressEvents: (progressRes.data || []).map(mapProgressEvent),
      workoutPlans: (workoutPlansRes.data || []).map(mapWorkoutPlan),
      mealPlans: (mealPlansRes.data || []).map(mapMealPlan),
      consultationSlots: (slotsRes.data || []).map(mapConsultationSlot),
      bookings: (bookingsRes.data || []).map(mapBooking),
      notifications: (notificationsRes.data || []).map(mapNotification),
      aiDrafts: (aiDraftsRes.data || []).map(mapAIDraft),
      clientGroups: (groupsRes.data || []).map(mapClientGroup),
      clientGroupMembers: (groupMembersRes.data || []).map(mapClientGroupMember),
      streaks: (streaksRes.data || []).map(mapStreak),
      consents: (consentsRes.data || []).map(mapConsent),
      verificationRequests: (verificationRes.data || []).map(mapVerification),
      auditLogs: (auditRes.data || []).map(mapAuditLog),
      customExercises: (exercisesRes.data || []).map(mapExercise),
      workoutSessions: (sessionsRes.data || []).map(mapWorkoutSession),
      achievements: (achievementsRes.data || []).map(mapAchievement),
      nutritionLogs: (nutritionLogsRes.data || []).map(mapNutritionLog),
      weeklyCheckIns: (checkInsRes.data || []).map(mapWeeklyCheckIn),
      conversations: (conversationsRes.data || []).map(mapConversation),
      workoutTemplates: (workoutTemplatesRes.data || []).map(mapWorkoutTemplate),
      nutritionTemplates: (nutritionTemplatesRes.data || []).map(mapNutritionTemplate),
      scheduledReminders: (scheduledRemindersRes.data || []).map(mapScheduledReminder),
      onboardingCompleted: userRow?.onboarding_completed ?? false,
      celebratedDateKeys: userRow?.celebrated_date_keys || [],
      pendingInviteToken: userRow?.pending_invite_token || undefined,
    });
  });

  // Attach Realtime channels for live updates
  const channel = supabase
    .channel(`workspace:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, async () => {
      const { data } = await supabase.from('chat_conversations').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`);
      if (data) onUpdate({ conversations: data.map(mapConversation) });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
      const { data } = await supabase.from('notifications').select('*').eq('recipient_user_id', uid);
      if (data) onUpdate({ notifications: data.map(mapNotification) });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, async () => {
      const { data } = await supabase.from('task_assignments').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`);
      if (data) onUpdate({ assignments: data.map(mapAssignment) });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, async () => {
      const { data } = await supabase.from('task_completions').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`);
      if (data) onUpdate({ completions: data.map(mapCompletion) });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_check_ins' }, async () => {
      const { data } = await supabase.from('weekly_check_ins').select('*').or(`client_user_id.eq.${uid},trainer_user_id.eq.${uid}`);
      if (data) onUpdate({ weeklyCheckIns: data.map(mapWeeklyCheckIn) });
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// -----------------------------------------------------------------------------
// Mutation Functions (Persisting state into PostgreSQL)
// -----------------------------------------------------------------------------

export async function updateUserMetadata(
  firebaseUid: string,
  metadata: { timezone?: string; firstName?: string; lastName?: string },
): Promise<void> {
  const updates: Partial<Database['public']['Tables']['app_users']['Update']> = {};
  if (metadata.timezone) updates.timezone = metadata.timezone;
  if (metadata.firstName) updates.first_name = metadata.firstName;
  if (metadata.lastName !== undefined) updates.last_name = metadata.lastName;

  const { error } = await supabase.from('app_users').update(updates).eq('firebase_uid', firebaseUid);
  if (error) console.warn('Supabase updateUserMetadata error:', error.message);
}

export async function updateUserPrivateState(
  firebaseUid: string,
  state: {
    celebratedDateKeys?: string[];
    pendingInviteToken?: string;
    onboardingCompleted?: boolean;
    notificationPrefs?: unknown;
  },
): Promise<void> {
  const updates: Partial<Database['public']['Tables']['app_users']['Update']> = {};
  if (state.celebratedDateKeys) updates.celebrated_date_keys = state.celebratedDateKeys;
  if (state.pendingInviteToken !== undefined) updates.pending_invite_token = state.pendingInviteToken;
  if (state.onboardingCompleted !== undefined) updates.onboarding_completed = state.onboardingCompleted;
  if (state.notificationPrefs) updates.notification_prefs = state.notificationPrefs as Json;

  const { error } = await supabase.from('app_users').update(updates).eq('firebase_uid', firebaseUid);
  if (error) console.warn('Supabase updateUserPrivateState error:', error.message);
}

export async function recordConsentInFirestore(params: {
  uid: string;
  consentType: ConsentType;
  granted: boolean;
  policyVersion?: string;
}): Promise<ConsentRecord> {
  const consentId = `cst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  await supabase.from('consent_records').insert({
    id: consentId,
    user_id: params.uid,
    consent_type: params.consentType,
    policy_version: params.policyVersion || CURRENT_POLICY_VERSION,
  });

  return {
    id: consentId,
    userId: params.uid,
    consentType: params.consentType,
    granted: params.granted,
    policyVersion: params.policyVersion || CURRENT_POLICY_VERSION,
    createdAt: now,
    updatedAt: now,
  };
}

export async function submitTrainerVerificationRequest(params: {
  trainerId: string;
  trainerUserId: string;
  qualificationTitle: string;
  issuingBody: string;
  credentialRef?: string;
}): Promise<void> {
  const reqId = `ver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await supabase.from('trainer_verification_requests').insert({
    id: reqId,
    trainer_user_id: params.trainerUserId,
    qualification_title: params.qualificationTitle,
    issuing_body: params.issuingBody,
    document_url: params.credentialRef || '',
    status: 'pending',
  });
}

export async function resolveTrainerVerificationRequest(params: {
  requestId: string;
  trainerId: string;
  approve: boolean;
  reviewNote?: string;
}): Promise<void> {
  await supabase
    .from('trainer_verification_requests')
    .update({
      status: params.approve ? 'approved' : 'rejected',
      reviewer_note: params.reviewNote || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', params.requestId);

  if (params.approve) {
    await supabase
      .from('trainer_profiles')
      .update({ verification_status: 'verified' })
      .eq('id', params.trainerId);
  }
}

export async function saveClientOnboardingToFirestore(params: {
  uid: string;
  user: User;
  client: ClientProfile;
  starterAssignment: Assignment;
  workoutPlan: WorkoutPlan;
  mealPlan: MealPlan;
  initialProgress?: ProgressEvent;
}): Promise<void> {
  await supabase.from('app_users').update({
    first_name: params.user.firstName,
    last_name: params.user.lastName || '',
    role: 'client',
    timezone: params.user.timezone,
    is_adult_confirmed: Boolean(params.user.isAdultConfirmed),
    onboarding_completed: true,
  }).eq('firebase_uid', params.uid);

  await supabase.from('client_profiles').upsert({
    id: params.client.id,
    user_id: params.uid,
    first_name: params.client.firstName,
    last_name: params.client.lastName || '',
    primary_goal: params.client.primaryGoal,
    experience_level: params.client.experienceLevel,
    days_per_week: params.client.daysPerWeek,
    environment: params.client.environment,
    dietary_preference: params.client.dietaryPreference,
  });

  await supabase.from('task_assignments').upsert({
    id: params.starterAssignment.id,
    client_id: params.client.id,
    client_user_id: params.uid,
    title: params.starterAssignment.title,
    category: params.starterAssignment.category,
    instructions: params.starterAssignment.instructions,
    duration_minutes: params.starterAssignment.durationMinutes,
    due_time: params.starterAssignment.dueTime,
    completion_type: params.starterAssignment.completionType,
    scheduled_dates: params.starterAssignment.scheduledDates,
  });

  await supabase.from('workout_plans').upsert({
    id: params.workoutPlan.id,
    client_id: params.client.id,
    client_user_id: params.uid,
    name: params.workoutPlan.title,
    focus: params.workoutPlan.coachNotes,
    days: params.workoutPlan.days as unknown as Json,
    is_active: true,
  });

  await supabase.from('meal_plans').upsert({
    id: params.mealPlan.id,
    client_id: params.client.id,
    client_user_id: params.uid,
    title: params.mealPlan.title,
    daily_calories: 2000,
    protein_g: 120,
    carbs_g: 200,
    fat_g: 60,
    hydration_target_glasses: 8,
    slots: params.mealPlan.meals as unknown as Json,
    is_active: true,
  });

  if (params.initialProgress) {
    await supabase.from('progress_events').upsert({
      id: params.initialProgress.id,
      client_id: params.client.id,
      client_user_id: params.uid,
      date_key: params.initialProgress.dateKey,
      metric_type: params.initialProgress.metricType,
      numeric_value: params.initialProgress.value,
      share_with_trainer: params.initialProgress.shareWithTrainer || false,
    });
  }
}

export async function saveTrainerOnboardingToFirestore(params: {
  uid: string;
  user: User;
  trainer: TrainerProfile;
  starterPackage: Package;
}): Promise<void> {
  const userUpdate: {
    first_name: string;
    last_name: string;
    timezone: string;
    is_adult_confirmed: boolean;
    onboarding_completed: boolean;
    role?: 'client' | 'trainer' | 'admin';
  } = {
    first_name: params.user.firstName,
    last_name: params.user.lastName || '',
    timezone: params.user.timezone,
    is_adult_confirmed: true,
    onboarding_completed: true,
  };
  // Role changes are restricted to platform admins / verification flows
  if (params.user.role === 'admin') {
    userUpdate.role = 'admin';
  }

  await supabase.from('app_users').update(userUpdate).eq('firebase_uid', params.uid);

  await supabase.from('trainer_profiles').upsert({
    id: params.trainer.id,
    user_id: params.uid,
    slug: params.trainer.slug,
    display_name: params.trainer.displayName,
    headline: params.trainer.headline,
    bio: params.trainer.bio,
    coaching_style: params.trainer.coachingStyle,
    city: params.trainer.city,
    coaching_mode: params.trainer.coachingMode,
    specialties: params.trainer.specialties,
    languages: params.trainer.languages,
    certifications: params.trainer.certifications || [],
    experience_years: params.trainer.experienceYears,
    avatar_key: params.trainer.avatarKey,
    cover_key: params.trainer.coverKey,
    photo_url: params.trainer.photoUrl || null,
    whatsapp_business_e164: params.trainer.whatsappBusinessE164 || null,
    verification_status: params.trainer.verificationStatus || 'unverified',
    accepting_clients: params.trainer.acceptingClients,
    is_published: params.trainer.isPublished,
  });

  await supabase.from('coaching_packages').upsert({
    id: params.starterPackage.id,
    trainer_id: params.trainer.id,
    trainer_user_id: params.uid,
    name: params.starterPackage.name,
    summary: params.starterPackage.summary,
    price_inr: params.starterPackage.priceInr,
    cadence: params.starterPackage.cadence,
    duration_days: params.starterPackage.durationDays,
    consultations_included: params.starterPackage.consultationsIncluded,
    features: params.starterPackage.features,
    status: params.starterPackage.status,
  });
}

export async function upsertDailyActivityHydration(params: {
  clientId: string;
  clientUserId: string;
  trainerUserId: string;
  dateKey: string;
  hydrationGlasses: number;
}): Promise<void> {
  const actId = `act_${params.clientUserId}_${params.dateKey}`;
  await supabase.from('daily_activity').upsert({
    id: actId,
    client_id: params.clientId,
    client_user_id: params.clientUserId,
    trainer_user_id: params.trainerUserId || null,
    date_key: params.dateKey,
    water_glasses: params.hydrationGlasses,
  });
}

export async function deleteCompletionEventDoc(completionId: string): Promise<void> {
  await supabase.from('task_completions').delete().eq('id', completionId);
}

export async function upsertCompletionEventDoc(
  event: CompletionEvent,
  clientUserId: string,
  trainerUserId: string,
  _isUpdate: boolean,
): Promise<void> {
  await supabase.from('task_completions').upsert({
    id: event.id,
    assignment_id: event.assignmentId,
    client_id: event.clientId,
    client_user_id: clientUserId,
    trainer_user_id: trainerUserId || null,
    date_key: event.dateKey,
    completed_at: event.completedAt,
    logged_value: event.loggedValue || null,
    notes: event.notes || null,
  });
}

export async function upsertStreakRecordDoc(record: StreakRecord): Promise<void> {
  await supabase.from('streak_records').upsert({
    id: record.id,
    client_id: record.clientId,
    client_user_id: record.clientUserId,
    trainer_user_id: record.trainerUserId || null,
    current_streak: record.currentStreak,
    longest_streak: record.longestStreak,
    last_completed_date_key: record.lastEligibleDateKey || null,
    streak_freeze_available: 1,
    consistency_percent: 100,
  });
}

export async function createProgressEventDoc(
  event: ProgressEvent,
  clientUserId: string,
  trainerUserId: string,
  newClientWeightKg?: number,
): Promise<void> {
  await supabase.from('progress_events').upsert({
    id: event.id,
    client_id: event.clientId,
    client_user_id: clientUserId,
    trainer_user_id: trainerUserId || null,
    date_key: event.dateKey,
    metric_type: event.metricType,
    numeric_value: event.value,
    photo_url: event.photoPath || null,
    photo_key: event.photoPath || null,
    share_with_trainer: event.shareWithTrainer || false,
    notes: event.note || null,
  });

  if (newClientWeightKg) {
    await supabase.from('client_profiles').update({ weight_kg: newClientWeightKg }).eq('id', event.clientId);
  }
}

export async function updateProgressPhotoShareMetadata(params: {
  photoPath: string;
  shareWithTrainer: boolean;
  authorizedTrainerUid?: string;
}): Promise<void> {
  await supabase
    .from('progress_events')
    .update({ share_with_trainer: params.shareWithTrainer })
    .eq('photo_key', params.photoPath);
}

export async function updateProgressEventShareDoc(eventId: string, shareWithTrainer: boolean): Promise<void> {
  await supabase.from('progress_events').update({ share_with_trainer: shareWithTrainer }).eq('id', eventId);
}

export async function enrollWithTrainerPackageInFirestore(params: {
  clientId: string;
  clientUserId: string;
  trainerId: string;
  trainerUserId: string;
  pkg: Package;
  relationship: CoachingRelationship;
  enrollment: Enrollment;
  endedRelationshipIds: string[];
  endedEnrollmentIds: string[];
  redeemInviteId?: string;
  generatedWorkoutPlan?: WorkoutPlan;
  generatedMealPlan?: MealPlan;
}): Promise<void> {
  const now = new Date().toISOString();

  await supabase.from('coaching_relationships').upsert({
    id: params.relationship.id,
    trainer_id: params.trainerId,
    trainer_user_id: params.trainerUserId,
    client_id: params.clientId,
    client_user_id: params.clientUserId,
    package_id: params.pkg.id,
    status: 'active',
    started_at: now,
  });

  await supabase.from('enrollments').upsert({
    id: params.enrollment.id,
    client_id: params.clientId,
    client_user_id: params.clientUserId,
    trainer_id: params.trainerId,
    trainer_user_id: params.trainerUserId,
    package_id: params.pkg.id,
    status: 'active',
    enrolled_at: now,
  });

  if (params.endedRelationshipIds.length > 0) {
    await supabase
      .from('coaching_relationships')
      .update({ status: 'ended', ended_at: now })
      .in('id', params.endedRelationshipIds);
  }

  if (params.endedEnrollmentIds.length > 0) {
    await supabase
      .from('enrollments')
      .update({ status: 'ended', ended_at: now })
      .in('id', params.endedEnrollmentIds);
  }

  if (params.redeemInviteId) {
    await supabase
      .from('trainer_invites')
      .update({ status: 'redeemed', redeemed_by_client_id: params.clientId, redeemed_by_user_id: params.clientUserId })
      .eq('id', params.redeemInviteId);
  }

  if (params.generatedWorkoutPlan) {
    await supabase.from('workout_plans').upsert({
      id: params.generatedWorkoutPlan.id,
      client_id: params.clientId,
      client_user_id: params.clientUserId,
      trainer_id: params.trainerId,
      trainer_user_id: params.trainerUserId,
      name: params.generatedWorkoutPlan.title,
      focus: params.generatedWorkoutPlan.coachNotes,
      days: params.generatedWorkoutPlan.days as unknown as Json,
      is_active: true,
    });
  }

  if (params.generatedMealPlan) {
    await supabase.from('meal_plans').upsert({
      id: params.generatedMealPlan.id,
      client_id: params.clientId,
      client_user_id: params.clientUserId,
      trainer_id: params.trainerId,
      trainer_user_id: params.trainerUserId,
      title: params.generatedMealPlan.title,
      daily_calories: 2000,
      protein_g: 120,
      carbs_g: 200,
      fat_g: 60,
      hydration_target_glasses: 8,
      slots: params.generatedMealPlan.meals as unknown as Json,
      is_active: true,
    });
  }

  await supabase
    .from('client_profiles')
    .update({ active_trainer_user_id: params.trainerUserId })
    .eq('id', params.clientId);
}

export async function createPendingRelationshipDoc(params: {
  relationshipId: string;
  trainerId: string;
  trainerUserId: string;
  clientId: string;
  clientUserId: string;
  packageId?: string;
}): Promise<void> {
  await supabase.from('coaching_relationships').upsert({
    id: params.relationshipId,
    trainer_id: params.trainerId,
    trainer_user_id: params.trainerUserId,
    client_id: params.clientId,
    client_user_id: params.clientUserId,
    package_id: params.packageId || null,
    status: 'pending',
  });
}

export async function disconnectCoachInFirestore(params: {
  clientId: string;
  relationshipIds: string[];
  enrollmentIds: string[];
}): Promise<void> {
  const now = new Date().toISOString();
  if (params.relationshipIds.length > 0) {
    await supabase
      .from('coaching_relationships')
      .update({ status: 'ended', ended_at: now })
      .in('id', params.relationshipIds);
  }

  if (params.enrollmentIds.length > 0) {
    await supabase
      .from('enrollments')
      .update({ status: 'ended', ended_at: now })
      .in('id', params.enrollmentIds);
  }

  await supabase
    .from('client_profiles')
    .update({ active_trainer_user_id: null })
    .eq('id', params.clientId);
}

export async function bookSlotInFirestore(params: {
  booking: Booking;
  clientUserId: string;
  trainerUserId: string;
}): Promise<void> {
  await supabase.from('consultation_bookings').insert({
    id: params.booking.id,
    slot_id: params.booking.slotId,
    trainer_user_id: params.trainerUserId,
    client_user_id: params.clientUserId,
    status: 'confirmed',
    meeting_link: params.booking.meetingLink || null,
    notes: params.booking.topic || null,
  });

  await supabase
    .from('consultation_slots')
    .update({ status: 'booked', booked_by_user_id: params.clientUserId })
    .eq('id', params.booking.slotId);
}

export async function rescheduleBookingInFirestore(params: {
  oldBooking: Booking;
  newBooking: Booking;
  clientUserId: string;
  trainerUserId: string;
}): Promise<void> {
  await supabase
    .from('consultation_bookings')
    .update({ status: 'cancelled' })
    .eq('id', params.oldBooking.id);

  await supabase
    .from('consultation_slots')
    .update({ status: 'available', booked_by_user_id: null })
    .eq('id', params.oldBooking.slotId);

  await supabase.from('consultation_bookings').insert({
    id: params.newBooking.id,
    slot_id: params.newBooking.slotId,
    trainer_user_id: params.trainerUserId,
    client_user_id: params.clientUserId,
    status: 'confirmed',
    meeting_link: params.newBooking.meetingLink || null,
    notes: params.newBooking.topic || null,
  });

  await supabase
    .from('consultation_slots')
    .update({ status: 'booked', booked_by_user_id: params.clientUserId })
    .eq('id', params.newBooking.slotId);
}

export async function cancelBookingInFirestore(booking: Booking): Promise<void> {
  await supabase
    .from('consultation_bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id);

  await supabase
    .from('consultation_slots')
    .update({ status: 'available', booked_by_user_id: null })
    .eq('id', booking.slotId);
}

export async function updateClientProfileDoc(
  clientId: string,
  updates: Partial<ClientProfile>,
): Promise<void> {
  const rowUpdates: Partial<Database['public']['Tables']['client_profiles']['Update']> = {};
  if (updates.firstName) rowUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) rowUpdates.last_name = updates.lastName;
  if (updates.age !== undefined) rowUpdates.age = updates.age;
  if (updates.weightKg !== undefined) rowUpdates.weight_kg = updates.weightKg;
  if (updates.targetWeightKg !== undefined) rowUpdates.target_weight_kg = updates.targetWeightKg;
  if (updates.primaryGoal) rowUpdates.primary_goal = updates.primaryGoal;
  if (updates.experienceLevel) rowUpdates.experience_level = updates.experienceLevel;
  if (updates.daysPerWeek !== undefined) rowUpdates.days_per_week = updates.daysPerWeek;
  if (updates.dietaryPreference) rowUpdates.dietary_preference = updates.dietaryPreference;
  if (updates.coachNotes !== undefined) rowUpdates.coach_notes = updates.coachNotes;

  await supabase.from('client_profiles').update(rowUpdates).eq('id', clientId);
}

export async function createInviteDoc(invite: Invite, trainerUserId: string): Promise<void> {
  await supabase.from('trainer_invites').insert({
    id: invite.id,
    token: invite.token,
    trainer_id: invite.trainerId,
    trainer_user_id: trainerUserId,
    client_email_or_label: invite.clientEmailOrLabel,
    suggested_package_id: invite.suggestedPackageId || null,
    status: 'active',
    expires_at: invite.expiresAt,
  });
}

export async function revokeInviteDoc(inviteId: string): Promise<void> {
  await supabase.from('trainer_invites').update({ status: 'revoked' }).eq('id', inviteId);
}

export async function createClientGroupDoc(group: ClientGroup): Promise<void> {
  await supabase.from('client_groups').insert({
    id: group.id,
    trainer_user_id: group.trainerUserId,
    name: group.name,
    description: group.description || '',
    color: '#6366f1',
  });
}

export async function deleteClientGroupDoc(groupId: string): Promise<void> {
  await supabase.from('client_groups').delete().eq('id', groupId);
}

export async function removeClientFromGroupDoc(groupId: string, clientId: string): Promise<void> {
  await supabase
    .from('client_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('client_id', clientId);
}

export async function addClientToGroupDoc(member: ClientGroupMember): Promise<void> {
  const memberId = `cgm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await supabase.from('client_group_members').insert({
    id: memberId,
    group_id: member.groupId,
    trainer_user_id: member.trainerUserId,
    client_id: member.clientId,
    client_user_id: member.clientUserId,
    joined_at: member.addedAt,
  });
}

export async function createBulkAssignmentsAndNotifications(params: {
  assignments: { item: Assignment; clientUserId: string }[];
  notifications: { item: Notification; relatedClientId: string }[];
  trainerUserId: string;
}): Promise<void> {
  if (params.assignments.length > 0) {
    const rows = params.assignments.map(({ item, clientUserId }) => ({
      id: item.id,
      client_id: item.clientId,
      client_user_id: clientUserId,
      trainer_id: item.trainerId || null,
      trainer_user_id: params.trainerUserId,
      title: item.title,
      category: item.category,
      instructions: item.instructions,
      duration_minutes: item.durationMinutes,
      due_time: item.dueTime,
      completion_type: item.completionType,
      target_label: item.targetLabel || null,
      scheduled_dates: item.scheduledDates,
      is_optional: item.isOptional,
      is_recovery: item.isRecovery,
    }));
    await supabase.from('task_assignments').insert(rows);
  }

  if (params.notifications.length > 0) {
    const notifRows = params.notifications.map(({ item }) => ({
      id: item.id,
      recipient_user_id: item.recipientUserId,
      category: 'workout' as const,
      title: item.title,
      body: item.body,
      action_url: item.actionRoute || null,
      is_read: false,
    }));
    await supabase.from('notifications').insert(notifRows);
  }
}

export async function upsertTaskTemplateDoc(
  tpl: TaskTemplate,
  trainerUserId: string,
  _isUpdate: boolean,
): Promise<void> {
  await supabase.from('task_templates').upsert({
    id: tpl.id,
    trainer_user_id: trainerUserId,
    title: tpl.title,
    category: tpl.category,
    instructions: tpl.instructions,
    duration_minutes: tpl.durationMinutes,
    completion_type: tpl.completionType,
    target_label: tpl.targetLabel || null,
    is_recovery_default: tpl.isRecoveryDefault,
    is_optional_default: tpl.isOptionalDefault,
    archived: tpl.archived,
  });
}

export async function upsertAIDraftDoc(
  draft: AIPlanDraft,
  trainerUserId: string,
  _isUpdate: boolean,
): Promise<void> {
  await supabase.from('ai_plan_drafts').upsert({
    id: draft.id,
    trainer_user_id: trainerUserId,
    client_id: draft.trainerId,
    objective: draft.objective,
    level: draft.experienceLevel,
    days_per_week: draft.daysPerWeek,
    split: 'Custom',
    dietary_pref: draft.dietaryPreference,
    target_calories: 2000,
    target_protein_g: 120,
    workout_days: draft.workoutDays as unknown as Json,
    meal_slots: [] as unknown as Json,
    trainer_approved: false,
    status: draft.status === 'saved' ? 'draft' : (draft.status || 'draft'),
  });
}

export async function upsertPackageDoc(
  pkg: Package,
  trainerUserId: string,
  _isUpdate: boolean,
): Promise<void> {
  await supabase.from('coaching_packages').upsert({
    id: pkg.id,
    trainer_id: pkg.trainerId,
    trainer_user_id: trainerUserId,
    name: pkg.name,
    summary: pkg.summary,
    price_inr: pkg.priceInr,
    cadence: pkg.cadence,
    duration_days: pkg.durationDays,
    consultations_included: pkg.consultationsIncluded,
    features: pkg.features,
    status: pkg.status,
  });
}

export async function updateTrainerProfileDoc(
  trainerId: string,
  updates: Partial<TrainerProfile>,
): Promise<void> {
  const rowUpdates: Partial<Database['public']['Tables']['trainer_profiles']['Update']> = {};
  if (updates.displayName) rowUpdates.display_name = updates.displayName;
  if (updates.headline !== undefined) rowUpdates.headline = updates.headline;
  if (updates.bio !== undefined) rowUpdates.bio = updates.bio;
  if (updates.coachingStyle !== undefined) rowUpdates.coaching_style = updates.coachingStyle;
  if (updates.city !== undefined) rowUpdates.city = updates.city;
  if (updates.photoUrl !== undefined) rowUpdates.photo_url = updates.photoUrl;
  if (updates.whatsappBusinessE164 !== undefined) rowUpdates.whatsapp_business_e164 = updates.whatsappBusinessE164;
  if (updates.certifications) rowUpdates.certifications = updates.certifications;
  if (updates.acceptingClients !== undefined) rowUpdates.accepting_clients = updates.acceptingClients;

  await supabase.from('trainer_profiles').update(rowUpdates).eq('id', trainerId);
}

export async function createConsultationSlotDoc(
  slot: ConsultationSlot,
  trainerUserId: string,
): Promise<void> {
  const startTime = slot.dateKey && slot.startTime ? `${slot.dateKey}T${slot.startTime}:00Z` : new Date().toISOString();
  const endTime = slot.dateKey && slot.endTime ? `${slot.dateKey}T${slot.endTime}:00Z` : new Date().toISOString();

  await supabase.from('consultation_slots').insert({
    id: slot.id,
    trainer_user_id: trainerUserId,
    start_time: startTime,
    end_time: endTime,
    status: slot.status === 'blocked' ? 'cancelled' : slot.status,
    meeting_link: slot.meetingLink || null,
  });
}

export async function updateBookingMeetingOrCompleteDoc(
  bookingId: string,
  updates: { status?: 'completed'; meetingLink?: string },
): Promise<void> {
  const rowUpdates: Partial<Database['public']['Tables']['consultation_bookings']['Update']> = {};
  if (updates.status) rowUpdates.status = updates.status;
  if (updates.meetingLink) rowUpdates.meeting_link = updates.meetingLink;

  await supabase.from('consultation_bookings').update(rowUpdates).eq('id', bookingId);
}

export async function updateSlotMeetingLinkDoc(
  slotId: string,
  status: 'available' | 'blocked',
  meetingLink: string,
): Promise<void> {
  await supabase
    .from('consultation_slots')
    .update({
      status: status === 'blocked' ? 'cancelled' : 'available',
      meeting_link: meetingLink || null,
    })
    .eq('id', slotId);
}

export async function markNotificationReadDoc(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
}

export async function markAllNotificationsReadBatch(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  await supabase.from('notifications').update({ is_read: true }).in('id', notificationIds);
}

export async function upsertTrainerReviewDoc(review: TrainerReview, _isUpdate: boolean): Promise<void> {
  await supabase.from('trainer_reviews').upsert({
    id: review.id,
    trainer_user_id: review.trainerId,
    client_user_id: review.clientUserId,
    rating: review.rating,
    review_text: review.comment,
  });
}

export async function deleteTrainerReviewDoc(reviewId: string): Promise<void> {
  await supabase.from('trainer_reviews').delete().eq('id', reviewId);
}

export async function upsertCustomExerciseDoc(exercise: ExerciseDefinition): Promise<void> {
  await supabase.from('exercise_definitions').upsert({
    id: exercise.id,
    name: exercise.name,
    muscle_group: exercise.primaryMuscles[0] || 'chest',
    secondary_muscles: exercise.secondaryMuscles,
    equipment_required: exercise.equipment,
    instructions: exercise.instructions,
    tips: exercise.commonMistakes,
    gif_url: null,
    video_url: null,
    is_custom: exercise.isCustom ?? true,
    created_by_user_id: exercise.trainerUserId || null,
  });
}

export async function deleteCustomExerciseDoc(exerciseId: string): Promise<void> {
  await supabase.from('exercise_definitions').delete().eq('id', exerciseId);
}

export async function upsertWorkoutSessionDoc(session: WorkoutSession): Promise<void> {
  await supabase.from('workout_sessions').upsert({
    id: session.id,
    client_id: session.clientId,
    client_user_id: session.clientUserId || session.clientId.replace(/^cln_/, 'usr_'),
    trainer_user_id: session.trainerUserId || null,
    assignment_id: session.assignmentId || null,
    title: session.title,
    date_key: session.dateKey,
    duration_minutes: Math.round(session.durationSeconds / 60),
    total_volume_kg: session.totalVolumeKg,
    exercises: session.exercises as unknown as Json,
    coach_feedback: session.notes || null,
  });
}

export async function createAchievementUnlockDoc(unlock: AchievementUnlock): Promise<void> {
  await supabase.from('achievement_unlocks').upsert({
    id: unlock.id,
    client_id: unlock.clientId,
    client_user_id: unlock.clientUserId || unlock.clientId.replace(/^cln_/, 'usr_'),
    badge_id: unlock.badgeId,
    unlocked_at: unlock.unlockedAt,
    celebrated: false,
  });
}

export async function upsertNutritionDiaryDoc(entry: NutritionDiaryEntry): Promise<void> {
  await supabase.from('nutrition_diary_entries').upsert({
    id: entry.id,
    client_id: entry.clientId,
    client_user_id: entry.clientUserId || entry.clientId.replace(/^cln_/, 'usr_'),
    trainer_user_id: entry.trainerUserId || null,
    date_key: entry.dateKey,
    slot: entry.completedSlots[0] || 'breakfast',
    foods: entry.items as unknown as Json,
    total_kcal: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    coach_feedback: entry.trainerFeedback || null,
    coach_feedback_at: entry.trainerFeedbackAt || null,
  });
}

export async function saveNutritionTrainerFeedbackDoc(params: {
  logId: string;
  feedback: string;
}): Promise<void> {
  await supabase
    .from('nutrition_diary_entries')
    .update({
      coach_feedback: params.feedback,
      coach_feedback_at: new Date().toISOString(),
    })
    .eq('id', params.logId);
}

export async function createWeeklyCheckInDoc(checkIn: WeeklyCheckIn): Promise<void> {
  await supabase.from('weekly_check_ins').upsert({
    id: checkIn.id,
    client_id: checkIn.clientId,
    client_user_id: checkIn.clientUserId || checkIn.clientId.replace(/^cln_/, 'usr_'),
    trainer_user_id: checkIn.trainerUserId || null,
    date_key: checkIn.dateKey,
    weight_kg: checkIn.weightKg ?? null,
    energy_rating: checkIn.energyLevel ?? null,
    sleep_rating: checkIn.sleepQuality ?? null,
    stress_rating: checkIn.workoutDifficulty ?? null,
    digestive_rating: checkIn.hungerLevel ?? null,
    win_of_the_week: checkIn.generalFeedback || null,
    struggle_of_the_week: checkIn.scheduleChallenges || null,
    coach_notes: null,
    photo_url: checkIn.photoPath || null,
    trainer_feedback: checkIn.trainerFeedback || null,
    trainer_feedback_at: checkIn.trainerReviewedAt || null,
  });
}

export async function saveWeeklyCheckInTrainerFeedbackDoc(params: {
  checkInId: string;
  feedback: string;
}): Promise<void> {
  await supabase
    .from('weekly_check_ins')
    .update({
      trainer_feedback: params.feedback,
      trainer_feedback_at: new Date().toISOString(),
    })
    .eq('id', params.checkInId);
}

export async function upsertWorkoutTemplateDoc(template: WorkoutProgramTemplate): Promise<void> {
  await supabase.from('workout_program_templates').upsert({
    id: template.id,
    trainer_id: template.trainerId,
    trainer_user_id: template.trainerId.replace(/^trn_/, 'usr_'),
    title: template.title,
    description: template.description,
    category: template.category,
    tags: template.tags,
    week_count: template.weekCount,
    days: template.days as unknown as Json,
  });
}

export async function deleteWorkoutTemplateDoc(templateId: string): Promise<void> {
  await supabase.from('workout_program_templates').delete().eq('id', templateId);
}

export async function upsertNutritionTemplateDoc(template: NutritionProgramTemplate): Promise<void> {
  await supabase.from('nutrition_program_templates').upsert({
    id: template.id,
    trainer_id: template.trainerId,
    trainer_user_id: template.trainerId.replace(/^trn_/, 'usr_'),
    title: template.title,
    description: template.description,
    dietary_type: template.dietaryType,
    target_kcal: template.targetKcal,
    target_protein_g: template.targetProteinG,
    hydration_target_glasses: template.hydrationTargetGlasses,
    slots: template.slots as unknown as Json,
  });
}

export async function deleteNutritionTemplateDoc(templateId: string): Promise<void> {
  await supabase.from('nutrition_program_templates').delete().eq('id', templateId);
}

export async function createScheduledReminderDoc(reminder: ScheduledReminder): Promise<void> {
  await supabase.from('scheduled_reminders').upsert({
    id: reminder.id,
    recipient_user_id: reminder.recipientUserId,
    category: reminder.category,
    title: reminder.title,
    body: reminder.body,
    scheduled_for: reminder.scheduledFor,
    trigger_status: reminder.triggerStatus,
    idempotency_key: reminder.idempotencyKey,
    channel: reminder.channel,
  });
}

export async function updateScheduledReminderStatusDoc(
  reminderId: string,
  status: ScheduledReminder['triggerStatus'],
): Promise<void> {
  await supabase.from('scheduled_reminders').update({ trigger_status: status }).eq('id', reminderId);
}

export async function deleteScheduledReminderDoc(reminderId: string): Promise<void> {
  await supabase.from('scheduled_reminders').delete().eq('id', reminderId);
}

// -----------------------------------------------------------------------------
// Messaging & FitPlus Connect (Chat)
// -----------------------------------------------------------------------------

export async function markConversationReadDoc(
  conversationId: string,
  userRole: 'client' | 'trainer',
): Promise<void> {
  const updates = userRole === 'client' ? { unread_count_client: 0 } : { unread_count_trainer: 0 };
  const { error } = await supabase.from('chat_conversations').update(updates).eq('id', conversationId);
  if (error) {
    console.warn('Supabase markConversationReadDoc notice:', error.message);
  }
}

export async function sendMessageDoc(params: {
  conversationId: string;
  senderUserId: string;
  senderRole: 'client' | 'trainer' | 'system';
  senderName: string;
  text: string;
  replyTo?: ChatMessage['replyTo'];
  attachment?: ChatMessage['attachment'];
  reference?: ChatMessage['reference'];
}): Promise<string> {
  const msgId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const { error: msgErr } = await supabase.from('chat_messages').insert({
    id: msgId,
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    sender_role: params.senderRole === 'system' ? 'admin' : params.senderRole,
    text: params.text,
    reply_to: (params.replyTo as unknown as Json) || null,
    attachment: (params.attachment as unknown as Json) || null,
    reference: (params.reference as unknown as Json) || null,
    read_by_recipient: false,
  });

  if (msgErr) {
    console.warn('Supabase insert message error:', msgErr.message);
  }

  // Update last message metadata on conversation
  await supabase
    .from('chat_conversations')
    .update({
      last_message_text: params.text || (params.attachment ? 'Photo attachment' : 'Coaching plan'),
      last_message_at: now,
      last_message_sender_id: params.senderUserId,
      updated_at: now,
    })
    .eq('id', params.conversationId);

  return msgId;
}

export function subscribeConversationMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void,
): () => void {
  // Fetch existing messages first
  supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .then(({ data }) => {
      if (data) {
        onUpdate(
          data.map((m) => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderUserId: m.sender_user_id,
            senderRole: (m.sender_role === 'admin' ? 'system' : m.sender_role) as 'client' | 'trainer' | 'system',
            text: m.text,
            replyTo: m.reply_to as unknown as ChatMessage['replyTo'],
            attachment: m.attachment as unknown as ChatMessage['attachment'],
            reference: m.reference as unknown as ChatMessage['reference'],
            status: (m.read_by_recipient ? 'read' : 'sent') as ChatMessage['status'],
            readByRecipient: m.read_by_recipient,
            createdAt: m.created_at,
          })),
        );
      }
    });

  // Subscribe to real-time inserts for this conversation
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const newMsg = payload.new as DatabaseMessageRow;
        if (newMsg) {
          onUpdate([
            {
              id: newMsg.id,
              conversationId: newMsg.conversation_id,
              senderUserId: newMsg.sender_user_id,
              senderRole: (newMsg.sender_role === 'admin' ? 'system' : newMsg.sender_role) as 'client' | 'trainer' | 'system',
              text: newMsg.text,
              replyTo: newMsg.reply_to as unknown as ChatMessage['replyTo'],
              attachment: newMsg.attachment as unknown as ChatMessage['attachment'],
              reference: newMsg.reference as unknown as ChatMessage['reference'],
              status: (newMsg.read_by_recipient ? 'read' : 'sent') as ChatMessage['status'],
              readByRecipient: newMsg.read_by_recipient,
              createdAt: newMsg.created_at,
            },
          ]);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

interface DatabaseMessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: string;
  text: string;
  reply_to: unknown;
  attachment: unknown;
  reference: unknown;
  read_by_recipient: boolean;
  created_at: string;
}

// -----------------------------------------------------------------------------
// File Uploads via Supabase Storage
// -----------------------------------------------------------------------------

export async function uploadTrainerPhotoToStorage(params: {
  trainerId?: string;
  uid?: string;
  file: File;
}): Promise<{ downloadUrl: string; photoUrl: string; storagePath: string }> {
  const id = params.trainerId || params.uid || 'trainer';
  const ext = params.file.name.split('.').pop() || 'jpg';
  const path = `${id}/photo_${Date.now()}.${ext}`;

  const res = await uploadToStorage({
    bucket: STORAGE_BUCKETS.PUBLIC_TRAINER_ASSETS,
    path,
    file: params.file,
  });

  return { downloadUrl: res.url, photoUrl: res.url, storagePath: res.path };
}

export async function getStorageFileDownloadUrl(
  photoPath: string,
  bucket: StorageBucketName = STORAGE_BUCKETS.PROGRESS_PHOTOS,
): Promise<string> {
  if (!photoPath) return '';
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  const cleanPath = photoPath.replace(/^\/+/, '');
  return getStorageSignedUrl(bucket, cleanPath, 3600);
}

export async function uploadProgressPhotoToStorage(params: {
  clientId?: string;
  userId?: string;
  uid?: string;
  shareWithTrainer?: boolean;
  authorizedTrainerUid?: string;
  file: File;
}): Promise<{ downloadUrl: string; photoPath: string; storagePath: string }> {
  const id = params.userId || params.uid || params.clientId || 'client';
  const ext = params.file.name.split('.').pop() || 'jpg';
  const path = `${id}/progress_${Date.now()}.${ext}`;

  const res = await uploadToStorage({
    bucket: STORAGE_BUCKETS.PROGRESS_PHOTOS,
    path,
    file: params.file,
  });

  return { downloadUrl: res.url, photoPath: res.path, storagePath: res.path };
}

export async function uploadWeeklyCheckInPhoto(params: {
  clientId?: string;
  userId?: string;
  clientUserId?: string;
  weekKey?: string;
  file: File;
}): Promise<{ downloadUrl: string; photoPath: string; storagePath: string }> {
  const id = params.clientUserId || params.userId || params.clientId || 'client';
  const ext = params.file.name.split('.').pop() || 'jpg';
  const path = `${id}/checkin_${Date.now()}.${ext}`;

  const res = await uploadToStorage({
    bucket: STORAGE_BUCKETS.PROGRESS_PHOTOS,
    path,
    file: params.file,
  });

  return { downloadUrl: res.url, photoPath: res.path, storagePath: res.path };
}

export async function uploadChatAttachmentPhoto(params: {
  conversationId: string;
  senderUserId: string;
  file: File;
}): Promise<{ url: string; storagePath: string; fileSize: number }> {
  const ext = params.file.name.split('.').pop() || 'jpg';
  const path = `${params.conversationId}/${Date.now()}_${params.senderUserId}.${ext}`;

  const res = await uploadToStorage({
    bucket: STORAGE_BUCKETS.COACHING_ATTACHMENTS,
    path,
    file: params.file,
  });

  return { url: res.url, storagePath: res.path, fileSize: params.file.size };
}
