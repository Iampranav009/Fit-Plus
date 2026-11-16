import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  getDownloadURL,
  ref as storageRef,
  updateMetadata,
  uploadBytes,
} from 'firebase/storage';
import {
  auth,
  db,
  getApiSecurityHeaders,
  googleProvider,
  handleFirestoreError,
  OperationType,
  storage,
} from '../lib/firebase';
import {
  assertValidId,
  BLUEPRINT_LIMITS,
  clampNonEmptyString,
  clampString,
  clampStringArray,
  sanitizeDateKey,
  sanitizeE164Phone,
  sanitizeOptionalId,
  sanitizeSlug,
  sanitizeTimeHHMM,
} from '../lib/firestoreValidation';
import { getTodayKey } from '../lib/date';
import type {
  AIPlanDraft,
  Assignment,
  AuditLogEntry,
  Booking,
  ClientGroup,
  ClientGroupMember,
  ClientProfile,
  CoachingRelationship,
  CompletionEvent,
  ConsentRecord,
  ConsentType,
  ConsultationSlot,
  DailyActivity,
  Enrollment,
  ExerciseDefinition,
  Invite,
  MealPlan,
  Notification,
  NotificationPrefs,
  NutritionDiaryEntry,
  Package,
  PaymentRecord,
  ProgressEvent,
  StreakRecord,
  Subscription,
  TaskTemplate,
  TrainerProfile,
  TrainerReview,
  TrainerVerificationRequest,
  User,
  UserRole,
  WeeklyCheckIn,
  WorkoutPlan,
  WorkoutSession,
  AchievementUnlock,
  ChatConversation,
  ChatMessage,
  WorkoutProgramTemplate,
  NutritionProgramTemplate,
  ScheduledReminder,
} from '../types/domain';

const BOOTSTRAP_ADMIN_EMAIL = 'pranavshindeji5001@gmail.com';
export const CURRENT_POLICY_VERSION = '2026.1';

function tsToIso(value: unknown, fallback = new Date().toISOString()): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string' && value.length > 0) return value;
  return fallback;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export interface FirebaseUserBootstrapResult {
  user: User;
  onboardingCompleted: boolean;
  celebratedDateKeys: string[];
  pendingInviteToken?: string;
  emailVerified: boolean;
  isPlatformAdmin: boolean;
}

export interface LiveFirestoreSlice {
  users: User[];
  trainers: TrainerProfile[];
  packages: Package[];
  clients: ClientProfile[];
  relationships: CoachingRelationship[];
  invites: Invite[];
  enrollments: Enrollment[];
  subscriptions: Subscription[];
  payments: PaymentRecord[];
  reviews: TrainerReview[];
  templates: TaskTemplate[];
  assignments: Assignment[];
  completions: CompletionEvent[];
  dailyActivities: DailyActivity[];
  progressEvents: ProgressEvent[];
  workoutPlans: WorkoutPlan[];
  mealPlans: MealPlan[];
  consultationSlots: ConsultationSlot[];
  bookings: Booking[];
  notifications: Notification[];
  aiDrafts: AIPlanDraft[];
  clientGroups: ClientGroup[];
  clientGroupMembers: ClientGroupMember[];
  streaks: StreakRecord[];
  consents: ConsentRecord[];
  verificationRequests: TrainerVerificationRequest[];
  auditLogs: AuditLogEntry[];
  customExercises: ExerciseDefinition[];
  workoutSessions: WorkoutSession[];
  achievements: AchievementUnlock[];
  nutritionLogs: NutritionDiaryEntry[];
  weeklyCheckIns: WeeklyCheckIn[];
  conversations: ChatConversation[];
  workoutTemplates: WorkoutProgramTemplate[];
  nutritionTemplates: NutritionProgramTemplate[];
  scheduledReminders: ScheduledReminder[];
  onboardingCompleted: boolean;
  celebratedDateKeys: string[];
  pendingInviteToken?: string;
  notificationPrefs?: NotificationPrefs;
}

export async function signInWithGooglePopup(): Promise<FirebaseAuthUser> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function registerWithEmailPassword(params: {
  email: string;
  password: string;
  fullName: string;
}): Promise<FirebaseAuthUser> {
  const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
  const cleanName = params.fullName.trim();
  if (cleanName) {
    await updateProfile(cred.user, { displayName: cleanName }).catch(() => undefined);
  }
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<FirebaseAuthUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function resendEmailVerification(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No signed-in user to verify.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function reloadCurrentUser(): Promise<FirebaseAuthUser | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

export async function signOutFirebaseAuth(): Promise<void> {
  await signOut(auth);
}

export async function deleteAccountAndData(): Promise<{ ok: boolean; error?: string }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'You must be signed in to delete your account.' };

  try {
    const headers = await getApiSecurityHeaders();
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    if (res.ok) {
      await signOut(auth).catch(() => undefined);
      return { ok: true };
    }
    const body = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
    // Fall back to direct client cleanup + Firebase Auth deleteUser when server Admin SDK is not provisioned locally
    if (res.status !== 503 && body.code !== 'ADMIN_NOT_CONFIGURED') {
      return { ok: false, error: body.error || 'Could not delete account via server.' };
    }
  } catch {
    // Offline or API route unreachable — attempt direct client deletion fallback below
  }

  const uid = assertValidId(user.uid, 'userId');
  try {
    const ownClients = await getDocs(query(collection(db, 'clients'), where('userId', '==', uid)));
    const batch = writeBatch(db);
    for (const c of ownClients.docs) {
      batch.delete(c.ref);
    }
    batch.delete(doc(db, 'users', uid, 'private', 'contact'));
    batch.delete(doc(db, 'users', uid));
    await batch.commit();
  } catch (err) {
    console.warn('Partial Firestore cleanup during account deletion:', err);
  }

  try {
    await deleteUser(user);
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('requires-recent-login')) {
      return {
        ok: false,
        error: 'For your security, please sign out and sign back in right before deleting your account.',
      };
    }
    return { ok: false, error: msg };
  }
}

export async function checkIsPlatformAdmin(fbUser: FirebaseAuthUser): Promise<boolean> {
  if (!fbUser.emailVerified) return false;
  if ((fbUser.email || '').toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) return true;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', assertValidId(fbUser.uid, 'userId')));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export async function ensureUserDocument(
  fbUser: FirebaseAuthUser,
): Promise<FirebaseUserBootstrapResult> {
  const uid = assertValidId(fbUser.uid, 'userId');
  const displayParts = (fbUser.displayName || 'FitPlus Member').trim().split(/\s+/);
  const fallbackFirstName = clampNonEmptyString(displayParts[0], BLUEPRINT_LIMITS.nameMax, 'Member');
  const fallbackLastName = clampString(displayParts.slice(1).join(' '), BLUEPRINT_LIMITS.nameMax, '');
  const fallbackEmail = clampNonEmptyString(
    fbUser.email || `${uid}@fitplus.local`,
    BLUEPRINT_LIMITS.emailMax,
    `${uid}@fitplus.local`,
  );

  // Hold Firestore user creation until email is verified (matches security rule isVerifiedUser())
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

  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/contact`;

  let userSnap;
  try {
    userSnap = await getDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  let privateSnap;
  try {
    privateSnap = await getDoc(doc(db, 'users', uid, 'private', 'contact'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }

  const isPlatformAdmin = await checkIsPlatformAdmin(fbUser);

  if (userSnap.exists()) {
    const data = userSnap.data();
    const priv = privateSnap.exists() ? privateSnap.data() : {};
    const resolvedRole: UserRole =
      data.role === 'admin' && isPlatformAdmin
        ? 'admin'
        : data.role === 'trainer'
          ? 'trainer'
          : 'client';
    return {
      user: {
        id: uid,
        firstName: clampNonEmptyString(data.firstName, BLUEPRINT_LIMITS.nameMax, 'Member'),
        lastName: clampString(data.lastName, BLUEPRINT_LIMITS.nameMax, ''),
        email: clampString(priv.email || fbUser.email || '', BLUEPRINT_LIMITS.emailMax, ''),
        role: resolvedRole,
        timezone: clampNonEmptyString(data.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
        locale: 'en-IN',
        isAdultConfirmed: Boolean(data.isAdultConfirmed),
        privacyConsentAccepted: Boolean(data.privacyConsentAccepted),
        createdAt: tsToIso(data.createdAt),
      },
      onboardingCompleted: Boolean(data.onboardingCompleted),
      celebratedDateKeys: Array.isArray(priv.celebratedDateKeys) ? priv.celebratedDateKeys : [],
      pendingInviteToken: typeof priv.pendingInviteToken === 'string' && priv.pendingInviteToken ? priv.pendingInviteToken : undefined,
      emailVerified: true,
      isPlatformAdmin,
    };
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), {
    id: uid,
    firstName: fallbackFirstName,
    lastName: fallbackLastName,
    role: 'client',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    isAdultConfirmed: false,
    onboardingCompleted: false,
    privacyConsentAccepted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', uid, 'private', 'contact'), {
    userId: uid,
    email: fallbackEmail,
    celebratedDateKeys: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

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
    emailVerified: true,
    isPlatformAdmin,
  };
}

export async function updateUserMetadata(
  uid: string,
  updates: Partial<{
    firstName: string;
    lastName: string;
    role: UserRole;
    timezone: string;
    onboardingCompleted: boolean;
  }>,
): Promise<void> {
  const safeUid = assertValidId(uid, 'userId');
  const payload = stripUndefined({
    firstName: updates.firstName !== undefined ? clampNonEmptyString(updates.firstName, BLUEPRINT_LIMITS.nameMax, 'Member') : undefined,
    lastName: updates.lastName !== undefined ? clampString(updates.lastName, BLUEPRINT_LIMITS.nameMax, '') : undefined,
    role: updates.role,
    timezone: updates.timezone !== undefined ? clampNonEmptyString(updates.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata') : undefined,
    onboardingCompleted: updates.onboardingCompleted,
    updatedAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, 'users', safeUid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${safeUid}`);
  }
}

export async function updateUserPrivateState(
  uid: string,
  updates: {
    celebratedDateKeys?: string[];
    pendingInviteToken?: string;
    notificationPrefs?: NotificationPrefs;
  },
): Promise<void> {
  const safeUid = assertValidId(uid, 'userId');
  const payload = stripUndefined({
    celebratedDateKeys:
      updates.celebratedDateKeys !== undefined
        ? clampStringArray(updates.celebratedDateKeys, BLUEPRINT_LIMITS.celebratedDateKeysMaxItems, 10)
        : undefined,
    pendingInviteToken:
      updates.pendingInviteToken !== undefined
        ? clampString(updates.pendingInviteToken, BLUEPRINT_LIMITS.tokenMax, '')
        : undefined,
    notificationPrefs: updates.notificationPrefs
      ? {
          assignmentReminders: Boolean(updates.notificationPrefs.assignmentReminders),
          consultationAlerts: Boolean(updates.notificationPrefs.consultationAlerts),
          streakMilestones: Boolean(updates.notificationPrefs.streakMilestones),
          billingReceipts: Boolean(updates.notificationPrefs.billingReceipts),
          browserPushEnabled: Boolean(updates.notificationPrefs.browserPushEnabled),
          updatedAt: new Date().toISOString(),
        }
      : undefined,
    updatedAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, 'users', safeUid, 'private', 'contact'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${safeUid}/private/contact`);
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
  const safeUid = assertValidId(params.uid, 'userId');
  const clientId = assertValidId(params.client.id, 'clientId');

  // Step 1: Update user & create client profile so subsequent exists(/clients/...) checks pass cleanly.
  const batch1 = writeBatch(db);
  batch1.update(doc(db, 'users', safeUid), {
    firstName: clampNonEmptyString(params.user.firstName, BLUEPRINT_LIMITS.nameMax, 'Member'),
    lastName: clampString(params.user.lastName, BLUEPRINT_LIMITS.nameMax, ''),
    role: 'client',
    timezone: clampNonEmptyString(params.user.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
    isAdultConfirmed: Boolean(params.user.isAdultConfirmed),
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });

  batch1.set(
    doc(db, 'clients', clientId),
    stripUndefined({
      id: clientId,
      userId: safeUid,
      firstName: clampNonEmptyString(params.client.firstName, BLUEPRINT_LIMITS.nameMax, 'Member'),
      lastName: clampString(params.client.lastName, BLUEPRINT_LIMITS.nameMax, ''),
      age:
        typeof params.client.age === 'number' && params.client.age >= 18 && params.client.age <= 120
          ? Math.round(params.client.age)
          : undefined,
      heightCm: params.client.heightCm,
      weightKg: params.client.weightKg,
      targetWeightKg: params.client.targetWeightKg,
      primaryGoal: params.client.primaryGoal,
      experienceLevel: params.client.experienceLevel,
      daysPerWeek: Math.min(7, Math.max(1, Math.round(params.client.daysPerWeek || 3))),
      environment: params.client.environment,
      equipment: clampStringArray(params.client.equipment, BLUEPRINT_LIMITS.equipmentMaxItems, 60),
      dietaryPreference: params.client.dietaryPreference,
      dietaryNotes: params.client.dietaryNotes ? clampString(params.client.dietaryNotes, BLUEPRINT_LIMITS.dietaryNotesMax) : undefined,
      foodAllergies: params.client.foodAllergies
        ? clampString(params.client.foodAllergies, BLUEPRINT_LIMITS.allergiesMax)
        : undefined,
      healthLimitations: params.client.healthLimitations
        ? clampString(params.client.healthLimitations, BLUEPRINT_LIMITS.healthLimitationsMax)
        : undefined,
      preferredLanguage: params.client.preferredLanguage
        ? clampString(params.client.preferredLanguage, 40)
        : undefined,
      coachingPreferences: params.client.coachingPreferences
        ? clampString(params.client.coachingPreferences, BLUEPRINT_LIMITS.coachingPrefsMax)
        : undefined,
      activeTrainerUserId: '',
      activeRelationshipId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  try {
    await batch1.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
  }

  // Step 2: Create starter self-guided assignment, plans, and optional initial weight measurement.
  const batch2 = writeBatch(db);
  batch2.set(
    doc(db, 'assignments', assertValidId(params.starterAssignment.id, 'assignmentId')),
    buildAssignmentWritePayload(params.starterAssignment, safeUid, ''),
  );
  batch2.set(
    doc(db, 'workoutPlans', assertValidId(params.workoutPlan.id, 'workoutPlanId')),
    buildWorkoutPlanWritePayload(params.workoutPlan, safeUid, ''),
  );
  batch2.set(
    doc(db, 'mealPlans', assertValidId(params.mealPlan.id, 'mealPlanId')),
    buildMealPlanWritePayload(params.mealPlan, safeUid, ''),
  );
  if (params.initialProgress) {
    batch2.set(
      doc(db, 'progressEvents', assertValidId(params.initialProgress.id, 'progressEventId')),
      buildProgressEventWritePayload(params.initialProgress, safeUid, ''),
    );
  }

  try {
    await batch2.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `assignments/${params.starterAssignment.id}`);
  }
}

export async function saveTrainerOnboardingToFirestore(params: {
  uid: string;
  user: User;
  trainer: TrainerProfile;
  starterPackage: Package;
}): Promise<void> {
  const safeUid = assertValidId(params.uid, 'userId');
  const trainerId = assertValidId(params.trainer.id, 'trainerId');

  const batch1 = writeBatch(db);
  batch1.update(doc(db, 'users', safeUid), {
    firstName: clampNonEmptyString(params.user.firstName, BLUEPRINT_LIMITS.nameMax, 'Coach'),
    lastName: clampString(params.user.lastName, BLUEPRINT_LIMITS.nameMax, ''),
    role: 'trainer',
    timezone: clampNonEmptyString(params.user.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
    isAdultConfirmed: true,
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });

  batch1.set(
    doc(db, 'trainers', trainerId),
    stripUndefined({
      id: trainerId,
      userId: safeUid,
      slug: sanitizeSlug(params.trainer.slug || params.trainer.displayName, 'coach'),
      displayName: clampNonEmptyString(params.trainer.displayName, BLUEPRINT_LIMITS.displayNameMax, 'Coach'),
      headline: clampNonEmptyString(params.trainer.headline, BLUEPRINT_LIMITS.headlineMax, 'Personal coaching'),
      bio: clampString(params.trainer.bio, BLUEPRINT_LIMITS.bioMax, ''),
      coachingStyle: clampString(params.trainer.coachingStyle, BLUEPRINT_LIMITS.coachingStyleMax, ''),
      city: clampNonEmptyString(params.trainer.city, BLUEPRINT_LIMITS.cityMax, 'Mumbai'),
      coachingMode: params.trainer.coachingMode,
      specialties: clampStringArray(params.trainer.specialties, BLUEPRINT_LIMITS.specialtiesMaxItems, 80),
      languages: clampStringArray(params.trainer.languages, BLUEPRINT_LIMITS.languagesMaxItems, 40),
      certifications: params.trainer.certifications?.length
        ? clampStringArray(params.trainer.certifications, BLUEPRINT_LIMITS.certificationsMaxItems, 100)
        : undefined,
      experienceYears: Math.min(80, Math.max(0, Math.round(params.trainer.experienceYears || 1))),
      avatarKey: clampString(params.trainer.avatarKey, 64, 'coachArjun'),
      coverKey: clampString(params.trainer.coverKey, 64, 'coachCover'),
      photoUrl: params.trainer.photoUrl ? clampString(params.trainer.photoUrl, 500) : undefined,
      whatsappBusinessE164: sanitizeE164Phone(params.trainer.whatsappBusinessE164) || undefined,
      verificationStatus: 'unverified',
      isDemoVerified: false,
      acceptingClients: Boolean(params.trainer.acceptingClients),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  try {
    await batch1.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trainers/${trainerId}`);
  }

  const pkgId = assertValidId(params.starterPackage.id, 'packageId');
  try {
    await setDoc(doc(db, 'packages', pkgId), {
      id: pkgId,
      trainerId,
      trainerUserId: safeUid,
      name: clampNonEmptyString(params.starterPackage.name, 120, 'Personal Coaching'),
      summary: clampNonEmptyString(params.starterPackage.summary, BLUEPRINT_LIMITS.summaryMax, 'Weekly coaching'),
      priceInr: Math.min(1000000, Math.max(0, Math.round(params.starterPackage.priceInr || 0))),
      cadence: params.starterPackage.cadence,
      durationDays: Math.min(366, Math.max(1, Math.round(params.starterPackage.durationDays || (params.starterPackage.cadence === 'quarterly' ? 90 : 30)))),
      consultationsIncluded: Math.min(60, Math.max(0, Math.round(params.starterPackage.consultationsIncluded ?? 2))),
      features: clampStringArray(params.starterPackage.features, BLUEPRINT_LIMITS.featuresMaxItems, 140),
      status: params.starterPackage.status,
      isDemoSample: Boolean(params.starterPackage.isDemoSample),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `packages/${pkgId}`);
  }
}

export async function updateClientProfileDoc(
  clientId: string,
  updates: Partial<ClientProfile>,
): Promise<void> {
  const safeClientId = assertValidId(clientId, 'clientId');
  const payload = stripUndefined({
    firstName: updates.firstName !== undefined ? clampNonEmptyString(updates.firstName, BLUEPRINT_LIMITS.nameMax, 'Member') : undefined,
    lastName: updates.lastName !== undefined ? clampString(updates.lastName, BLUEPRINT_LIMITS.nameMax, '') : undefined,
    age:
      updates.age !== undefined && updates.age >= 18 && updates.age <= 120
        ? Math.round(updates.age)
        : undefined,
    heightCm: updates.heightCm,
    weightKg: updates.weightKg,
    targetWeightKg: updates.targetWeightKg,
    primaryGoal: updates.primaryGoal,
    experienceLevel: updates.experienceLevel,
    daysPerWeek: updates.daysPerWeek,
    environment: updates.environment,
    equipment: updates.equipment ? clampStringArray(updates.equipment, BLUEPRINT_LIMITS.equipmentMaxItems, 60) : undefined,
    dietaryPreference: updates.dietaryPreference,
    dietaryNotes: updates.dietaryNotes !== undefined ? clampString(updates.dietaryNotes, BLUEPRINT_LIMITS.dietaryNotesMax) : undefined,
    foodAllergies: updates.foodAllergies !== undefined ? clampString(updates.foodAllergies, BLUEPRINT_LIMITS.allergiesMax) : undefined,
    healthLimitations: updates.healthLimitations !== undefined ? clampString(updates.healthLimitations, BLUEPRINT_LIMITS.healthLimitationsMax) : undefined,
    preferredLanguage: updates.preferredLanguage !== undefined ? clampString(updates.preferredLanguage, 40) : undefined,
    coachingPreferences: updates.coachingPreferences !== undefined ? clampString(updates.coachingPreferences, BLUEPRINT_LIMITS.coachingPrefsMax) : undefined,
    coachNotes: updates.coachNotes !== undefined ? clampString(updates.coachNotes, BLUEPRINT_LIMITS.coachNotesMax) : undefined,
    updatedAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, 'clients', safeClientId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `clients/${safeClientId}`);
  }
}

export async function updateTrainerProfileDoc(
  trainerId: string,
  updates: Partial<TrainerProfile>,
): Promise<void> {
  const safeTrainerId = assertValidId(trainerId, 'trainerId');
  const payload = stripUndefined({
    slug: updates.slug !== undefined ? sanitizeSlug(updates.slug, 'coach') : undefined,
    displayName: updates.displayName !== undefined ? clampNonEmptyString(updates.displayName, BLUEPRINT_LIMITS.displayNameMax, 'Coach') : undefined,
    headline: updates.headline !== undefined ? clampNonEmptyString(updates.headline, BLUEPRINT_LIMITS.headlineMax, 'Personal coach') : undefined,
    bio: updates.bio !== undefined ? clampString(updates.bio, BLUEPRINT_LIMITS.bioMax) : undefined,
    coachingStyle: updates.coachingStyle !== undefined ? clampString(updates.coachingStyle, BLUEPRINT_LIMITS.coachingStyleMax) : undefined,
    city: updates.city !== undefined ? clampNonEmptyString(updates.city, BLUEPRINT_LIMITS.cityMax, 'Mumbai') : undefined,
    coachingMode: updates.coachingMode,
    specialties: updates.specialties ? clampStringArray(updates.specialties, BLUEPRINT_LIMITS.specialtiesMaxItems, 80) : undefined,
    languages: updates.languages ? clampStringArray(updates.languages, BLUEPRINT_LIMITS.languagesMaxItems, 40) : undefined,
    certifications: updates.certifications ? clampStringArray(updates.certifications, BLUEPRINT_LIMITS.certificationsMaxItems, 100) : undefined,
    experienceYears: updates.experienceYears !== undefined ? Math.min(80, Math.max(0, Math.round(updates.experienceYears))) : undefined,
    avatarKey: updates.avatarKey,
    coverKey: updates.coverKey,
    photoUrl: updates.photoUrl !== undefined ? clampString(updates.photoUrl, 500) : undefined,
    whatsappBusinessE164: updates.whatsappBusinessE164 !== undefined ? sanitizeE164Phone(updates.whatsappBusinessE164) : undefined,
    acceptingClients: updates.acceptingClients,
    updatedAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, 'trainers', safeTrainerId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `trainers/${safeTrainerId}`);
  }
}

export async function upsertCompletionEventDoc(
  event: CompletionEvent,
  clientUserId: string,
  trainerUserId: string,
  isUpdate: boolean,
): Promise<void> {
  const id = assertValidId(event.id, 'completionId');
  const path = `completions/${id}`;
  if (isUpdate) {
    try {
      await updateDoc(
        doc(db, 'completions', id),
        stripUndefined({
          loggedValue: event.loggedValue !== undefined ? clampString(event.loggedValue, BLUEPRINT_LIMITS.loggedValueMax) : undefined,
          notes: event.notes !== undefined ? clampString(event.notes, BLUEPRINT_LIMITS.completionNotesMax) : undefined,
          updatedAt: serverTimestamp(),
        }),
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return;
  }

  try {
    await setDoc(
      doc(db, 'completions', id),
      stripUndefined({
        id,
        assignmentId: assertValidId(event.assignmentId, 'assignmentId'),
        clientId: assertValidId(event.clientId, 'clientId'),
        clientUserId: assertValidId(clientUserId, 'clientUserId'),
        trainerUserId: sanitizeOptionalId(trainerUserId),
        dateKey: sanitizeDateKey(event.dateKey, new Date().toISOString().slice(0, 10)),
        completedAt: clampString(event.completedAt, 64, new Date().toISOString()),
        loggedValue: event.loggedValue !== undefined ? clampString(event.loggedValue, BLUEPRINT_LIMITS.loggedValueMax) : undefined,
        notes: event.notes !== undefined ? clampString(event.notes, BLUEPRINT_LIMITS.completionNotesMax) : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCompletionEventDoc(completionId: string): Promise<void> {
  const id = assertValidId(completionId, 'completionId');
  try {
    await deleteDoc(doc(db, 'completions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `completions/${id}`);
  }
}

export async function createProgressEventDoc(
  event: ProgressEvent,
  clientUserId: string,
  trainerUserId: string,
  newClientWeightKg?: number,
): Promise<void> {
  const id = assertValidId(event.id, 'progressEventId');
  const batch = writeBatch(db);
  batch.set(doc(db, 'progressEvents', id), buildProgressEventWritePayload(event, clientUserId, trainerUserId));
  if (newClientWeightKg !== undefined) {
    batch.update(doc(db, 'clients', assertValidId(event.clientId, 'clientId')), {
      weightKg: newClientWeightKg,
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `progressEvents/${id}`);
  }
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
  const batch1 = writeBatch(db);
  const relId = assertValidId(params.relationship.id, 'relationshipId');
  const enrId = assertValidId(params.enrollment.id, 'enrollmentId');
  const clientId = assertValidId(params.clientId, 'clientId');
  const clientUserId = assertValidId(params.clientUserId, 'clientUserId');
  const trainerId = assertValidId(params.trainerId, 'trainerId');
  const trainerUserId = assertValidId(params.trainerUserId, 'trainerUserId');

  for (const oldRelId of params.endedRelationshipIds) {
    batch1.update(doc(db, 'relationships', assertValidId(oldRelId, 'oldRelId')), {
      status: 'ended',
      endedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const oldEnrId of params.endedEnrollmentIds) {
    batch1.update(doc(db, 'enrollments', assertValidId(oldEnrId, 'oldEnrId')), {
      status: 'ended',
      endedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  }

  batch1.set(
    doc(db, 'relationships', relId),
    stripUndefined({
      id: relId,
      trainerId,
      trainerUserId,
      clientId,
      clientUserId,
      packageId: sanitizeOptionalId(params.pkg.id),
      status: 'active',
      startedAt: params.relationship.startedAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  batch1.set(doc(db, 'enrollments', enrId), {
    id: enrId,
    clientId,
    clientUserId,
    trainerId,
    trainerUserId,
    packageId: assertValidId(params.pkg.id, 'packageId'),
    status: 'active',
    isDemoCheckout: Boolean(params.enrollment.isDemoCheckout),
    enrolledAt: params.enrollment.enrolledAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch1.update(doc(db, 'clients', clientId), {
    activeTrainerUserId: trainerUserId,
    activeRelationshipId: relId,
    updatedAt: serverTimestamp(),
  });

  if (params.redeemInviteId) {
    batch1.update(doc(db, 'invites', assertValidId(params.redeemInviteId, 'inviteId')), {
      status: 'redeemed',
      redeemedByClientId: clientId,
      redeemedByUserId: clientUserId,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch1.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `relationships/${relId}`);
  }

  if (params.generatedWorkoutPlan || params.generatedMealPlan) {
    const batch2 = writeBatch(db);
    if (params.generatedWorkoutPlan) {
      batch2.set(
        doc(db, 'workoutPlans', assertValidId(params.generatedWorkoutPlan.id, 'workoutPlanId')),
        buildWorkoutPlanWritePayload(params.generatedWorkoutPlan, clientUserId, trainerUserId),
      );
    }
    if (params.generatedMealPlan) {
      batch2.set(
        doc(db, 'mealPlans', assertValidId(params.generatedMealPlan.id, 'mealPlanId')),
        buildMealPlanWritePayload(params.generatedMealPlan, clientUserId, trainerUserId),
      );
    }
    try {
      await batch2.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `workoutPlans/${params.generatedWorkoutPlan?.id || ''}`);
    }
  }
}

export async function disconnectCoachInFirestore(params: {
  clientId: string;
  relationshipIds: string[];
  enrollmentIds: string[];
}): Promise<void> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  for (const relId of params.relationshipIds) {
    batch.update(doc(db, 'relationships', assertValidId(relId, 'relationshipId')), {
      status: 'ended',
      endedAt: now,
      updatedAt: serverTimestamp(),
    });
  }
  for (const enrId of params.enrollmentIds) {
    batch.update(doc(db, 'enrollments', assertValidId(enrId, 'enrollmentId')), {
      status: 'ended',
      endedAt: now,
      updatedAt: serverTimestamp(),
    });
  }
  batch.update(doc(db, 'clients', assertValidId(params.clientId, 'clientId')), {
    activeTrainerUserId: '',
    activeRelationshipId: '',
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `clients/${params.clientId}`);
  }
}

export async function bookSlotInFirestore(params: {
  booking: Booking;
  clientUserId: string;
  trainerUserId: string;
}): Promise<void> {
  const bookingId = assertValidId(params.booking.id, 'bookingId');
  const slotId = assertValidId(params.booking.slotId, 'slotId');
  const batch = writeBatch(db);

  batch.update(doc(db, 'consultationSlots', slotId), {
    status: 'booked',
    bookedByUserId: assertValidId(params.clientUserId, 'clientUserId'),
    activeBookingId: bookingId,
    updatedAt: serverTimestamp(),
  });

  batch.set(
    doc(db, 'bookings', bookingId),
    stripUndefined({
      id: bookingId,
      slotId,
      trainerId: assertValidId(params.booking.trainerId, 'trainerId'),
      trainerUserId: assertValidId(params.trainerUserId, 'trainerUserId'),
      clientId: assertValidId(params.booking.clientId, 'clientId'),
      clientUserId: assertValidId(params.clientUserId, 'clientUserId'),
      dateKey: sanitizeDateKey(params.booking.dateKey, new Date().toISOString().slice(0, 10)),
      startTime: sanitizeTimeHHMM(params.booking.startTime, '09:00'),
      endTime: sanitizeTimeHHMM(params.booking.endTime, '09:30'),
      timezone: clampNonEmptyString(params.booking.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
      topic: clampNonEmptyString(params.booking.topic, BLUEPRINT_LIMITS.topicMax, 'Check-in'),
      meetingLink: params.booking.meetingLink
        ? clampString(params.booking.meetingLink, BLUEPRINT_LIMITS.meetingLinkMax)
        : undefined,
      status: 'booked',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bookings/${bookingId}`);
  }
}

export async function rescheduleBookingInFirestore(params: {
  oldBooking: Booking;
  newBooking: Booking;
  clientUserId: string;
  trainerUserId: string;
}): Promise<void> {
  const oldBookingId = assertValidId(params.oldBooking.id, 'oldBookingId');
  const oldSlotId = assertValidId(params.oldBooking.slotId, 'oldSlotId');
  const newBookingId = assertValidId(params.newBooking.id, 'newBookingId');
  const newSlotId = assertValidId(params.newBooking.slotId, 'newSlotId');
  const batch = writeBatch(db);

  batch.update(doc(db, 'bookings', oldBookingId), {
    status: 'rescheduled',
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'consultationSlots', oldSlotId), {
    status: 'available',
    bookedByUserId: '',
    activeBookingId: '',
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'consultationSlots', newSlotId), {
    status: 'booked',
    bookedByUserId: assertValidId(params.clientUserId, 'clientUserId'),
    activeBookingId: newBookingId,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'bookings', newBookingId), {
    id: newBookingId,
    slotId: newSlotId,
    trainerId: assertValidId(params.newBooking.trainerId, 'trainerId'),
    trainerUserId: assertValidId(params.trainerUserId, 'trainerUserId'),
    clientId: assertValidId(params.newBooking.clientId, 'clientId'),
    clientUserId: assertValidId(params.clientUserId, 'clientUserId'),
    dateKey: sanitizeDateKey(params.newBooking.dateKey, new Date().toISOString().slice(0, 10)),
    startTime: sanitizeTimeHHMM(params.newBooking.startTime, '09:00'),
    endTime: sanitizeTimeHHMM(params.newBooking.endTime, '09:30'),
    timezone: clampNonEmptyString(params.newBooking.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
    topic: clampNonEmptyString(params.newBooking.topic, BLUEPRINT_LIMITS.topicMax, 'Check-in'),
    status: 'booked',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bookings/${newBookingId}`);
  }
}

export async function cancelBookingInFirestore(booking: Booking): Promise<void> {
  const bookingId = assertValidId(booking.id, 'bookingId');
  const slotId = assertValidId(booking.slotId, 'slotId');
  const batch = writeBatch(db);
  batch.update(doc(db, 'bookings', bookingId), {
    status: 'canceled',
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'consultationSlots', slotId), {
    status: 'available',
    bookedByUserId: '',
    activeBookingId: '',
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bookings/${bookingId}`);
  }
}

export async function createInviteDoc(invite: Invite, trainerUserId: string): Promise<void> {
  const inviteId = assertValidId(invite.id, 'inviteId');
  try {
    await setDoc(
      doc(db, 'invites', inviteId),
      stripUndefined({
        id: inviteId,
        token: assertValidId(invite.token, 'token'),
        trainerId: assertValidId(invite.trainerId, 'trainerId'),
        trainerUserId: assertValidId(trainerUserId, 'trainerUserId'),
        clientLabel: clampNonEmptyString(invite.clientEmailOrLabel, BLUEPRINT_LIMITS.clientLabelMax, 'New client'),
        suggestedPackageId: invite.suggestedPackageId ? sanitizeOptionalId(invite.suggestedPackageId) : undefined,
        status: 'active',
        expiresAt: clampString(invite.expiresAt, 64, new Date(Date.now() + 14 * 86400000).toISOString()),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `invites/${inviteId}`);
  }
}

export async function revokeInviteDoc(inviteId: string): Promise<void> {
  const id = assertValidId(inviteId, 'inviteId');
  try {
    await updateDoc(doc(db, 'invites', id), {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `invites/${id}`);
  }
}

export async function fetchInviteDocByToken(token: string): Promise<Invite | null> {
  const clean = token.trim().toUpperCase();
  if (!clean || !/^[a-zA-Z0-9_\-]+$/.test(clean) || clean.length > 64) return null;
  try {
    const snap = await getDoc(doc(db, 'invites', clean));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      id: snap.id,
      token: String(d.token || snap.id),
      trainerId: String(d.trainerId || ''),
      clientEmailOrLabel: String(d.clientLabel || ''),
      suggestedPackageId: typeof d.suggestedPackageId === 'string' && d.suggestedPackageId ? d.suggestedPackageId : undefined,
      status: d.status || 'active',
      expiresAt: String(d.expiresAt || ''),
      createdAt: tsToIso(d.createdAt),
      redeemedByClientId: typeof d.redeemedByClientId === 'string' && d.redeemedByClientId ? d.redeemedByClientId : undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `invites/${clean}`);
  }
}

export async function createBulkAssignmentsAndNotifications(params: {
  assignments: { item: Assignment; clientUserId: string }[];
  notifications: { item: Notification; relatedClientId: string }[];
  trainerUserId: string;
}): Promise<void> {
  const batch = writeBatch(db);
  for (const { item, clientUserId } of params.assignments) {
    const id = assertValidId(item.id, 'assignmentId');
    batch.set(doc(db, 'assignments', id), buildAssignmentWritePayload(item, clientUserId, params.trainerUserId));
  }
  for (const { item, relatedClientId } of params.notifications) {
    const id = assertValidId(item.id, 'notificationId');
    batch.set(
      doc(db, 'notifications', id),
      stripUndefined({
        id,
        recipientUserId: assertValidId(item.recipientUserId, 'recipientUserId'),
        senderUserId: assertValidId(params.trainerUserId, 'senderUserId'),
        title: clampNonEmptyString(item.title, BLUEPRINT_LIMITS.titleMax, 'Update'),
        body: clampNonEmptyString(item.body, BLUEPRINT_LIMITS.notificationBodyMax, 'New coaching task'),
        category: item.category,
        read: Boolean(item.read),
        actionRoute: item.actionRoute ? clampString(item.actionRoute, BLUEPRINT_LIMITS.actionRouteMax) : undefined,
        relatedClientId: assertValidId(relatedClientId, 'relatedClientId'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'assignments');
  }
}

export async function upsertTaskTemplateDoc(
  tpl: TaskTemplate,
  trainerUserId: string,
  isUpdate: boolean,
): Promise<void> {
  const id = assertValidId(tpl.id, 'templateId');
  const path = `templates/${id}`;
  if (isUpdate) {
    try {
      await updateDoc(
        doc(db, 'templates', id),
        stripUndefined({
          title: clampNonEmptyString(tpl.title, BLUEPRINT_LIMITS.titleMax, 'Task'),
          category: tpl.category,
          instructions: clampString(tpl.instructions, BLUEPRINT_LIMITS.instructionsMax),
          durationMinutes: Math.min(600, Math.max(0, Math.round(tpl.durationMinutes || 0))),
          completionType: tpl.completionType,
          targetLabel: tpl.targetLabel !== undefined ? clampString(tpl.targetLabel, BLUEPRINT_LIMITS.targetLabelMax) : undefined,
          isRecoveryDefault: Boolean(tpl.isRecoveryDefault),
          isOptionalDefault: Boolean(tpl.isOptionalDefault),
          archived: Boolean(tpl.archived),
          updatedAt: serverTimestamp(),
        }),
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return;
  }

  try {
    await setDoc(
      doc(db, 'templates', id),
      stripUndefined({
        id,
        trainerId: assertValidId(tpl.trainerId, 'trainerId'),
        trainerUserId: assertValidId(trainerUserId, 'trainerUserId'),
        title: clampNonEmptyString(tpl.title, BLUEPRINT_LIMITS.titleMax, 'Task'),
        category: tpl.category,
        instructions: clampString(tpl.instructions, BLUEPRINT_LIMITS.instructionsMax),
        durationMinutes: Math.min(600, Math.max(0, Math.round(tpl.durationMinutes || 0))),
        completionType: tpl.completionType,
        targetLabel: tpl.targetLabel ? clampString(tpl.targetLabel, BLUEPRINT_LIMITS.targetLabelMax) : undefined,
        isRecoveryDefault: Boolean(tpl.isRecoveryDefault),
        isOptionalDefault: Boolean(tpl.isOptionalDefault),
        archived: Boolean(tpl.archived),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function upsertAIDraftDoc(
  draft: AIPlanDraft,
  trainerUserId: string,
  isUpdate: boolean,
): Promise<void> {
  const id = assertValidId(draft.id, 'draftId');
  const path = `aiDrafts/${id}`;
  if (isUpdate) {
    try {
      await updateDoc(doc(db, 'aiDrafts', id), {
        title: clampNonEmptyString(draft.title, BLUEPRINT_LIMITS.titleMax, 'Draft plan'),
        summary: clampNonEmptyString(draft.summary, BLUEPRINT_LIMITS.draftSummaryMax, 'Structured plan'),
        workoutDays: (draft.workoutDays || []).slice(0, BLUEPRINT_LIMITS.workoutDaysMaxItems),
        nutritionOutline: clampStringArray(draft.nutritionOutline, BLUEPRINT_LIMITS.outlineMaxItems, 240),
        habitCommitments: clampStringArray(draft.habitCommitments, BLUEPRINT_LIMITS.outlineMaxItems, 240),
        status: draft.status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return;
  }

  try {
    await setDoc(doc(db, 'aiDrafts', id), {
      id,
      trainerId: assertValidId(draft.trainerId, 'trainerId'),
      trainerUserId: assertValidId(trainerUserId, 'trainerUserId'),
      objective: draft.objective,
      experienceLevel: draft.experienceLevel,
      daysPerWeek: Math.min(7, Math.max(1, Math.round(draft.daysPerWeek || 3))),
      environment: draft.environment,
      dietaryPreference: draft.dietaryPreference,
      constraints: clampString(draft.constraints, BLUEPRINT_LIMITS.constraintsMax),
      title: clampNonEmptyString(draft.title, BLUEPRINT_LIMITS.titleMax, 'Draft plan'),
      summary: clampNonEmptyString(draft.summary, BLUEPRINT_LIMITS.draftSummaryMax, 'Structured plan'),
      workoutDays: (draft.workoutDays || []).slice(0, BLUEPRINT_LIMITS.workoutDaysMaxItems),
      nutritionOutline: clampStringArray(draft.nutritionOutline, BLUEPRINT_LIMITS.outlineMaxItems, 240),
      habitCommitments: clampStringArray(draft.habitCommitments, BLUEPRINT_LIMITS.outlineMaxItems, 240),
      status: draft.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function upsertPackageDoc(
  pkg: Package,
  trainerUserId: string,
  isUpdate: boolean,
): Promise<void> {
  const id = assertValidId(pkg.id, 'packageId');
  const path = `packages/${id}`;
  const durationDays = Math.min(366, Math.max(1, Math.round(pkg.durationDays || (pkg.cadence === 'quarterly' ? 90 : 30))));
  const consultationsIncluded = Math.min(60, Math.max(0, Math.round(pkg.consultationsIncluded ?? 2)));
  if (isUpdate) {
    try {
      await updateDoc(doc(db, 'packages', id), {
        name: clampNonEmptyString(pkg.name, 120, 'Coaching Package'),
        summary: clampNonEmptyString(pkg.summary, BLUEPRINT_LIMITS.summaryMax, 'Weekly coaching'),
        priceInr: Math.min(1000000, Math.max(0, Math.round(pkg.priceInr || 0))),
        cadence: pkg.cadence,
        durationDays,
        consultationsIncluded,
        features: clampStringArray(pkg.features, BLUEPRINT_LIMITS.featuresMaxItems, 140),
        status: pkg.status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return;
  }

  try {
    await setDoc(doc(db, 'packages', id), {
      id,
      trainerId: assertValidId(pkg.trainerId, 'trainerId'),
      trainerUserId: assertValidId(trainerUserId, 'trainerUserId'),
      name: clampNonEmptyString(pkg.name, 120, 'Coaching Package'),
      summary: clampNonEmptyString(pkg.summary, BLUEPRINT_LIMITS.summaryMax, 'Weekly coaching'),
      priceInr: Math.min(1000000, Math.max(0, Math.round(pkg.priceInr || 0))),
      cadence: pkg.cadence,
      durationDays,
      consultationsIncluded,
      features: clampStringArray(pkg.features, BLUEPRINT_LIMITS.featuresMaxItems, 140),
      status: pkg.status,
      isDemoSample: Boolean(pkg.isDemoSample),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createConsultationSlotDoc(
  slot: ConsultationSlot,
  trainerUserId: string,
): Promise<void> {
  const id = assertValidId(slot.id, 'slotId');
  try {
    await setDoc(
      doc(db, 'consultationSlots', id),
      stripUndefined({
        id,
        trainerId: assertValidId(slot.trainerId, 'trainerId'),
        trainerUserId: assertValidId(trainerUserId, 'trainerUserId'),
        dateKey: sanitizeDateKey(slot.dateKey, new Date().toISOString().slice(0, 10)),
        startTime: sanitizeTimeHHMM(slot.startTime, '09:00'),
        endTime: sanitizeTimeHHMM(slot.endTime, '09:30'),
        timezone: clampNonEmptyString(slot.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
        mode: slot.mode,
        meetingLink: slot.meetingLink ? clampString(slot.meetingLink, BLUEPRINT_LIMITS.meetingLinkMax) : undefined,
        status: slot.status === 'blocked' ? 'blocked' : 'available',
        bookedByUserId: '',
        activeBookingId: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `consultationSlots/${id}`);
  }
}

export async function updateSlotMeetingLinkDoc(
  slotId: string,
  status: 'available' | 'blocked',
  meetingLink: string,
): Promise<void> {
  const id = assertValidId(slotId, 'slotId');
  try {
    await updateDoc(doc(db, 'consultationSlots', id), {
      status,
      meetingLink: clampString(meetingLink, BLUEPRINT_LIMITS.meetingLinkMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `consultationSlots/${id}`);
  }
}

export async function updateBookingMeetingOrCompleteDoc(
  bookingId: string,
  updates: { status?: 'completed'; meetingLink?: string },
): Promise<void> {
  const id = assertValidId(bookingId, 'bookingId');
  const payload = stripUndefined({
    status: updates.status,
    meetingLink: updates.meetingLink !== undefined ? clampString(updates.meetingLink, BLUEPRINT_LIMITS.meetingLinkMax) : undefined,
    updatedAt: serverTimestamp(),
  });
  try {
    await updateDoc(doc(db, 'bookings', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
  }
}

export async function upsertTrainerReviewDoc(
  review: TrainerReview,
  isUpdate: boolean,
): Promise<void> {
  const id = assertValidId(review.id, 'reviewId');
  const rating = Math.min(5, Math.max(1, Math.round(review.rating)));
  const comment = clampNonEmptyString(review.comment, BLUEPRINT_LIMITS.reviewCommentMax, 'Supportive coaching experience.');
  const safeComment = comment.length < 4 ? `${comment} — helpful` : comment;

  if (isUpdate) {
    try {
      await updateDoc(doc(db, 'reviews', id), {
        rating,
        comment: safeComment,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reviews/${id}`);
    }
    return;
  }

  try {
    await setDoc(doc(db, 'reviews', id), {
      id,
      trainerId: assertValidId(review.trainerId, 'trainerId'),
      clientId: assertValidId(review.clientId, 'clientId'),
      clientUserId: assertValidId(review.clientUserId, 'clientUserId'),
      relationshipId: assertValidId(review.relationshipId, 'relationshipId'),
      authorName: clampNonEmptyString(review.authorName, BLUEPRINT_LIMITS.nameMax, 'FitPlus Member'),
      rating,
      comment: safeComment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reviews/${id}`);
  }
}

export async function deleteTrainerReviewDoc(reviewId: string): Promise<void> {
  const id = assertValidId(reviewId, 'reviewId');
  try {
    await deleteDoc(doc(db, 'reviews', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reviews/${id}`);
  }
}

export async function markNotificationReadDoc(notificationId: string): Promise<void> {
  const id = assertValidId(notificationId, 'notificationId');
  try {
    await updateDoc(doc(db, 'notifications', id), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function markAllNotificationsReadBatch(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of notificationIds) {
    batch.update(doc(db, 'notifications', assertValidId(id, 'notificationId')), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notifications');
  }
}

// -----------------------------------------------------------------------------
// Payload Builders
// -----------------------------------------------------------------------------
function buildAssignmentWritePayload(item: Assignment, clientUserId: string, trainerUserId: string) {
  return stripUndefined({
    id: assertValidId(item.id, 'assignmentId'),
    clientId: assertValidId(item.clientId, 'clientId'),
    clientUserId: assertValidId(clientUserId, 'clientUserId'),
    trainerId: item.trainerId ? sanitizeOptionalId(item.trainerId) : undefined,
    trainerUserId: sanitizeOptionalId(trainerUserId),
    templateId: item.templateId ? sanitizeOptionalId(item.templateId) : undefined,
    title: clampNonEmptyString(item.title, BLUEPRINT_LIMITS.titleMax, 'Commitment'),
    category: item.category,
    instructions: clampString(item.instructions, BLUEPRINT_LIMITS.instructionsMax),
    durationMinutes: Math.min(600, Math.max(0, Math.round(item.durationMinutes || 0))),
    dueTime: clampNonEmptyString(item.dueTime, BLUEPRINT_LIMITS.dueTimeMax, '8:00 PM'),
    completionType: item.completionType,
    targetLabel: item.targetLabel ? clampString(item.targetLabel, BLUEPRINT_LIMITS.targetLabelMax) : undefined,
    scheduledDates: clampStringArray(item.scheduledDates, BLUEPRINT_LIMITS.scheduledDatesMaxItems, 10),
    isOptional: Boolean(item.isOptional),
    isRecovery: Boolean(item.isRecovery),
    hasCustomOverride: Boolean(item.hasCustomOverride),
    overrideNote: item.overrideNote ? clampString(item.overrideNote, BLUEPRINT_LIMITS.overrideNoteMax) : undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function buildProgressEventWritePayload(event: ProgressEvent, clientUserId: string, trainerUserId: string) {
  return stripUndefined({
    id: assertValidId(event.id, 'progressEventId'),
    clientId: assertValidId(event.clientId, 'clientId'),
    clientUserId: assertValidId(clientUserId, 'clientUserId'),
    trainerUserId: sanitizeOptionalId(trainerUserId),
    dateKey: sanitizeDateKey(event.dateKey, new Date().toISOString().slice(0, 10)),
    metricType: event.metricType,
    label: clampNonEmptyString(event.label, 80, 'Measurement'),
    value: Math.min(1000000, Math.max(0, Number(event.value) || 0)),
    unit: clampNonEmptyString(event.unit, 24, 'kg'),
    note: event.note ? clampString(event.note, BLUEPRINT_LIMITS.noteMax) : undefined,
    photoPath: event.photoPath ? clampString(event.photoPath, 300) : undefined,
    shareWithTrainer: typeof event.shareWithTrainer === 'boolean' ? event.shareWithTrainer : undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function buildWorkoutPlanWritePayload(plan: WorkoutPlan, clientUserId: string, trainerUserId: string) {
  return stripUndefined({
    id: assertValidId(plan.id, 'workoutPlanId'),
    clientId: assertValidId(plan.clientId, 'clientId'),
    clientUserId: assertValidId(clientUserId, 'clientUserId'),
    trainerId: plan.trainerId ? sanitizeOptionalId(plan.trainerId) : undefined,
    trainerUserId: sanitizeOptionalId(trainerUserId),
    title: clampNonEmptyString(plan.title, BLUEPRINT_LIMITS.titleMax, 'Weekly Workout Plan'),
    weekLabel: clampNonEmptyString(plan.weekLabel, 80, 'Current block'),
    coachNotes: clampString(plan.coachNotes, 1000),
    days: (plan.days || []).slice(0, BLUEPRINT_LIMITS.workoutDaysMaxItems),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function buildMealPlanWritePayload(plan: MealPlan, clientUserId: string, trainerUserId: string) {
  return stripUndefined({
    id: assertValidId(plan.id, 'mealPlanId'),
    clientId: assertValidId(plan.clientId, 'clientId'),
    clientUserId: assertValidId(clientUserId, 'clientUserId'),
    trainerId: plan.trainerId ? sanitizeOptionalId(plan.trainerId) : undefined,
    trainerUserId: sanitizeOptionalId(trainerUserId),
    title: clampNonEmptyString(plan.title, BLUEPRINT_LIMITS.titleMax, 'Meal Guide'),
    dietaryLabel: clampNonEmptyString(plan.dietaryLabel, 80, 'Balanced'),
    coachNotes: clampString(plan.coachNotes, 1000),
    meals: (plan.meals || []).slice(0, BLUEPRINT_LIMITS.mealOptionsMaxItems),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function upsertDailyActivityHydration(params: {
  clientId: string;
  clientUserId: string;
  trainerUserId: string;
  dateKey: string;
  hydrationGlasses: number;
}): Promise<void> {
  const clientId = assertValidId(params.clientId, 'clientId');
  const clientUserId = assertValidId(params.clientUserId, 'clientUserId');
  const dateKey = sanitizeDateKey(params.dateKey, new Date().toISOString().slice(0, 10));
  const activityId = assertValidId(`${clientId}_${dateKey}`, 'activityId');
  const hydrationGlasses = Math.max(0, Math.min(24, Math.round(params.hydrationGlasses)));
  const docRef = doc(db, 'dailyActivity', activityId);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        hydrationGlasses,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: activityId,
        clientId,
        clientUserId,
        trainerUserId: sanitizeOptionalId(params.trainerUserId),
        dateKey,
        hydrationGlasses,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dailyActivity/${activityId}`);
  }
}

export async function updateProgressEventShareDoc(eventId: string, shareWithTrainer: boolean): Promise<void> {
  const id = assertValidId(eventId, 'progressEventId');
  try {
    await updateDoc(doc(db, 'progressEvents', id), {
      shareWithTrainer: Boolean(shareWithTrainer),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `progressEvents/${id}`);
  }
}

export async function uploadProgressPhotoToStorage(params: {
  uid: string;
  file: File;
  shareWithTrainer: boolean;
  authorizedTrainerUid?: string;
}): Promise<{ photoPath: string }> {
  const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(params.file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  if (params.file.size <= 0 || params.file.size > 5 * 1024 * 1024) {
    throw new Error('Progress photos must be smaller than 5 MB.');
  }
  const safeUid = assertValidId(params.uid, 'userId');
  const ext = params.file.type.includes('png') ? 'png' : params.file.type.includes('webp') ? 'webp' : 'jpg';
  const fileName = `prg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const photoPath = `private/clients/${safeUid}/progress/${fileName}`;
  const ref = storageRef(storage, photoPath);
  await uploadBytes(ref, params.file, {
    contentType: params.file.type,
    customMetadata: {
      sharedWithTrainer: params.shareWithTrainer && params.authorizedTrainerUid ? 'true' : 'false',
      authorizedTrainerUid: params.authorizedTrainerUid || '',
    },
  });
  return { photoPath };
}

export async function updateProgressPhotoShareMetadata(params: {
  photoPath: string;
  shareWithTrainer: boolean;
  authorizedTrainerUid?: string;
}): Promise<void> {
  const ref = storageRef(storage, params.photoPath);
  await updateMetadata(ref, {
    customMetadata: {
      sharedWithTrainer: params.shareWithTrainer && params.authorizedTrainerUid ? 'true' : 'false',
      authorizedTrainerUid: params.authorizedTrainerUid || '',
    },
  });
}

export async function getStorageFileDownloadUrl(photoPath: string): Promise<string> {
  return getDownloadURL(storageRef(storage, photoPath));
}

export async function uploadWeeklyCheckInPhoto(params: {
  clientId: string;
  clientUserId: string;
  weekKey: string;
  file: File;
}): Promise<{ downloadUrl: string; photoPath: string }> {
  const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(params.file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  if (params.file.size <= 0 || params.file.size > 5 * 1024 * 1024) {
    throw new Error('Check-in photos must be smaller than 5 MB.');
  }
  const safeUid = assertValidId(params.clientUserId, 'userId');
  const ext = params.file.type.includes('png') ? 'png' : params.file.type.includes('webp') ? 'webp' : 'jpg';
  const fileName = `wci_${params.weekKey}_${Date.now().toString(36)}.${ext}`;
  const photoPath = `private/clients/${safeUid}/checkins/${fileName}`;
  const ref = storageRef(storage, photoPath);
  await uploadBytes(ref, params.file, {
    contentType: params.file.type,
  });
  const downloadUrl = await getDownloadURL(ref);
  return { downloadUrl, photoPath };
}

export async function uploadTrainerPhotoToStorage(params: {
  uid: string;
  file: File;
}): Promise<{ photoUrl: string }> {
  const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(params.file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  if (params.file.size <= 0 || params.file.size > 5 * 1024 * 1024) {
    throw new Error('Profile photos must be smaller than 5 MB.');
  }
  const safeUid = assertValidId(params.uid, 'userId');
  const ext = params.file.type.includes('png') ? 'png' : params.file.type.includes('webp') ? 'webp' : 'jpg';
  const fileName = `avatar_${Date.now().toString(36)}.${ext}`;
  const ref = storageRef(storage, `public/trainers/${safeUid}/${fileName}`);
  await uploadBytes(ref, params.file, { contentType: params.file.type });
  const photoUrl = await getDownloadURL(ref);
  return { photoUrl };
}

export async function createPendingRelationshipDoc(params: {
  relationshipId: string;
  trainerId: string;
  trainerUserId: string;
  clientId: string;
  clientUserId: string;
  packageId?: string;
}): Promise<void> {
  const relId = assertValidId(params.relationshipId, 'relationshipId');
  try {
    await setDoc(
      doc(db, 'relationships', relId),
      stripUndefined({
        id: relId,
        trainerId: assertValidId(params.trainerId, 'trainerId'),
        trainerUserId: assertValidId(params.trainerUserId, 'trainerUserId'),
        clientId: assertValidId(params.clientId, 'clientId'),
        clientUserId: assertValidId(params.clientUserId, 'clientUserId'),
        packageId: params.packageId ? sanitizeOptionalId(params.packageId) : undefined,
        status: 'pending',
        startedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `relationships/${relId}`);
  }
}

export async function createClientGroupDoc(group: ClientGroup): Promise<void> {
  const groupId = assertValidId(group.id, 'groupId');
  try {
    await setDoc(
      doc(db, 'clientGroups', groupId),
      stripUndefined({
        id: groupId,
        trainerId: assertValidId(group.trainerId, 'trainerId'),
        trainerUserId: assertValidId(group.trainerUserId, 'trainerUserId'),
        name: clampNonEmptyString(group.name, BLUEPRINT_LIMITS.nameMax, 'Cohort'),
        description: group.description ? clampString(group.description, 300) : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `clientGroups/${groupId}`);
  }
}

export async function deleteClientGroupDoc(groupId: string): Promise<void> {
  const safeGroupId = assertValidId(groupId, 'groupId');
  try {
    await deleteDoc(doc(db, 'clientGroups', safeGroupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `clientGroups/${safeGroupId}`);
  }
}

export async function addClientToGroupDoc(member: ClientGroupMember): Promise<void> {
  const groupId = assertValidId(member.groupId, 'groupId');
  const clientId = assertValidId(member.clientId, 'clientId');
  try {
    await setDoc(doc(db, 'clientGroups', groupId, 'members', clientId), {
      clientId,
      clientUserId: assertValidId(member.clientUserId, 'clientUserId'),
      trainerUserId: assertValidId(member.trainerUserId, 'trainerUserId'),
      addedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `clientGroups/${groupId}/members/${clientId}`);
  }
}

export async function removeClientFromGroupDoc(groupId: string, clientId: string): Promise<void> {
  const safeGroupId = assertValidId(groupId, 'groupId');
  const safeClientId = assertValidId(clientId, 'clientId');
  try {
    await deleteDoc(doc(db, 'clientGroups', safeGroupId, 'members', safeClientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `clientGroups/${safeGroupId}/members/${safeClientId}`);
  }
}

export async function upsertStreakRecordDoc(record: StreakRecord): Promise<void> {
  const clientId = assertValidId(record.clientId, 'clientId');
  const ref = doc(db, 'streaks', clientId);
  try {
    const snap = await getDoc(ref);
    const payload = {
      id: clientId,
      clientId,
      clientUserId: assertValidId(record.clientUserId, 'clientUserId'),
      trainerUserId: sanitizeOptionalId(record.trainerUserId),
      currentStreak: Math.max(0, Math.min(5000, Math.round(record.currentStreak))),
      longestStreak: Math.max(0, Math.min(5000, Math.round(record.longestStreak))),
      lastEligibleDateKey: record.lastEligibleDateKey
        ? sanitizeDateKey(record.lastEligibleDateKey, '')
        : '',
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `streaks/${clientId}`);
  }
}

export async function recordConsentInFirestore(params: {
  uid: string;
  consentType: ConsentType;
  granted: boolean;
  policyVersion?: string;
}): Promise<ConsentRecord> {
  const safeUid = assertValidId(params.uid, 'userId');
  const id = assertValidId(`cns_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, 'consentId');
  const policyVersion = clampNonEmptyString(params.policyVersion || CURRENT_POLICY_VERSION, 24, CURRENT_POLICY_VERSION);

  const batch = writeBatch(db);
  batch.set(doc(db, 'consentRecords', id), {
    id,
    userId: safeUid,
    consentType: params.consentType,
    granted: Boolean(params.granted),
    policyVersion,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (params.consentType === 'terms_privacy') {
    batch.update(doc(db, 'users', safeUid), {
      privacyConsentAccepted: Boolean(params.granted),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `consentRecords/${id}`);
  }

  const now = new Date().toISOString();
  return {
    id,
    userId: safeUid,
    consentType: params.consentType,
    granted: Boolean(params.granted),
    policyVersion,
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
  const requestId = assertValidId(`ver_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, 'requestId');
  const trainerId = assertValidId(params.trainerId, 'trainerId');
  const trainerUserId = assertValidId(params.trainerUserId, 'trainerUserId');

  const batch = writeBatch(db);
  batch.set(
    doc(db, 'trainerVerificationRequests', requestId),
    stripUndefined({
      id: requestId,
      trainerId,
      trainerUserId,
      qualificationTitle: clampNonEmptyString(params.qualificationTitle, 140, 'Coaching Certification'),
      issuingBody: clampNonEmptyString(params.issuingBody, 140, 'Accredited Body'),
      credentialRef: params.credentialRef ? clampString(params.credentialRef, 120) : undefined,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  batch.update(doc(db, 'trainers', trainerId), {
    verificationStatus: 'pending',
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trainerVerificationRequests/${requestId}`);
  }
}

export async function resolveTrainerVerificationRequest(params: {
  requestId: string;
  trainerId: string;
  approve: boolean;
  reviewNote?: string;
}): Promise<void> {
  const requestId = assertValidId(params.requestId, 'requestId');
  const trainerId = assertValidId(params.trainerId, 'trainerId');

  const batch = writeBatch(db);
  batch.update(
    doc(db, 'trainerVerificationRequests', requestId),
    stripUndefined({
      status: params.approve ? 'approved' : 'rejected',
      reviewNote: params.reviewNote ? clampString(params.reviewNote, 400) : undefined,
      updatedAt: serverTimestamp(),
    }),
  );
  batch.update(doc(db, 'trainers', trainerId), {
    verificationStatus: params.approve ? 'verified' : 'unverified',
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `trainerVerificationRequests/${requestId}`);
  }
}

// -----------------------------------------------------------------------------
// Stage 4A CRUD Operations: Exercises, Workouts, Achievements, Nutrition, Check-ins
// -----------------------------------------------------------------------------
export async function upsertCustomExerciseDoc(exercise: ExerciseDefinition): Promise<void> {
  const id = assertValidId(exercise.id, 'exerciseId');
  const trainerId = assertValidId(exercise.trainerId || '', 'trainerId');
  const trainerUserId = assertValidId(exercise.trainerUserId || '', 'trainerUserId');
  const payload = {
    id,
    name: clampNonEmptyString(exercise.name, 140, 'Custom Exercise'),
    category: exercise.category || 'strength',
    environment: exercise.environment || 'both',
    equipment: exercise.equipment || 'bodyweight',
    difficulty: exercise.difficulty || 'beginner',
    primaryMuscles: clampStringArray(exercise.primaryMuscles, 6, 32),
    secondaryMuscles: clampStringArray(exercise.secondaryMuscles, 6, 32),
    instructions: clampStringArray(exercise.instructions, 10, 300),
    commonMistakes: clampStringArray(exercise.commonMistakes, 10, 240),
    safetyNotes: clampString(exercise.safetyNotes, BLUEPRINT_LIMITS.exerciseSafetyNotesMax),
    alternativeIds: clampStringArray(exercise.alternativeIds, 10, 128),
    isCustom: true,
    trainerId,
    trainerUserId,
    updatedAt: serverTimestamp(),
  };
  try {
    const ref = doc(db, 'exercises', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `exercises/${id}`);
  }
}

export async function deleteCustomExerciseDoc(exerciseId: string): Promise<void> {
  const safeId = assertValidId(exerciseId, 'exerciseId');
  try {
    await deleteDoc(doc(db, 'exercises', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `exercises/${safeId}`);
  }
}

export async function upsertWorkoutSessionDoc(session: WorkoutSession): Promise<void> {
  const id = assertValidId(session.id, 'sessionId');
  const clientId = assertValidId(session.clientId, 'clientId');
  const clientUserId = assertValidId(session.clientUserId || '', 'clientUserId');
  const payload = stripUndefined({
    id,
    clientId,
    clientUserId,
    trainerUserId: sanitizeOptionalId(session.trainerUserId),
    assignmentId: sanitizeOptionalId(session.assignmentId),
    planId: sanitizeOptionalId(session.planId),
    dayIndex: typeof session.dayIndex === 'number' ? Math.max(0, Math.min(6, session.dayIndex)) : undefined,
    title: clampNonEmptyString(session.title, 140, 'Workout Session'),
    dateKey: sanitizeDateKey(session.dateKey, getTodayKey('Asia/Kolkata')),
    status: session.status || 'completed',
    startedAt: session.startedAt || new Date().toISOString(),
    completedAt: session.completedAt || undefined,
    durationSeconds: Math.max(0, Math.min(86400, Math.round(session.durationSeconds || 0))),
    totalVolumeKg: Math.max(0, Math.min(500000, Math.round(session.totalVolumeKg || 0))),
    completedSetsCount: Math.max(0, Math.min(500, Math.round(session.completedSetsCount || 0))),
    prCount: Math.max(0, Math.min(100, Math.round(session.prCount || 0))),
    exercises: Array.isArray(session.exercises) ? session.exercises.slice(0, 20) : [],
    notes: session.notes ? clampString(session.notes, BLUEPRINT_LIMITS.workoutNotesMax) : undefined,
    updatedAt: serverTimestamp(),
  });
  try {
    const ref = doc(db, 'workoutSessions', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workoutSessions/${id}`);
  }
}

export async function createAchievementUnlockDoc(unlock: AchievementUnlock): Promise<void> {
  const id = assertValidId(unlock.id, 'achievementId');
  const clientId = assertValidId(unlock.clientId, 'clientId');
  const clientUserId = assertValidId(unlock.clientUserId || '', 'clientUserId');
  const ref = doc(db, 'achievements', id);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(
      ref,
      stripUndefined({
        id,
        badgeId: unlock.badgeId,
        clientId,
        clientUserId,
        title: clampNonEmptyString(unlock.title, 140, 'Achievement Unlocked'),
        description: clampNonEmptyString(unlock.description, BLUEPRINT_LIMITS.achievementDescMax, 'Milestone reached'),
        unlockedAt: unlock.unlockedAt || new Date().toISOString(),
        metricSnapshot: unlock.metricSnapshot ? clampString(unlock.metricSnapshot, BLUEPRINT_LIMITS.metricSnapshotMax) : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `achievements/${id}`);
  }
}

export async function upsertNutritionDiaryDoc(entry: NutritionDiaryEntry): Promise<void> {
  const id = assertValidId(entry.id, 'logId');
  const clientId = assertValidId(entry.clientId, 'clientId');
  const clientUserId = assertValidId(entry.clientUserId || '', 'clientUserId');
  const ref = doc(db, 'nutritionLogs', id);
  try {
    const snap = await getDoc(ref);
    const payload = stripUndefined({
      id,
      clientId,
      clientUserId,
      trainerUserId: sanitizeOptionalId(entry.trainerUserId),
      dateKey: sanitizeDateKey(entry.dateKey, getTodayKey('Asia/Kolkata')),
      completedSlots: clampStringArray(entry.completedSlots, 5, 24),
      items: Array.isArray(entry.items) ? entry.items.slice(0, 30) : [],
      waterGlasses: Math.max(0, Math.min(24, Math.round(entry.waterGlasses || 0))),
      personalNotes: entry.personalNotes ? clampString(entry.personalNotes, BLUEPRINT_LIMITS.nutritionNotesMax) : undefined,
      updatedAt: serverTimestamp(),
    });
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `nutritionLogs/${id}`);
  }
}

export async function saveNutritionTrainerFeedbackDoc(params: {
  logId: string;
  feedback: string;
}): Promise<void> {
  const id = assertValidId(params.logId, 'logId');
  try {
    await updateDoc(doc(db, 'nutritionLogs', id), {
      trainerFeedback: clampString(params.feedback, BLUEPRINT_LIMITS.trainerFeedbackMax),
      trainerFeedbackAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `nutritionLogs/${id}`);
  }
}

export async function createWeeklyCheckInDoc(checkIn: WeeklyCheckIn): Promise<void> {
  const id = assertValidId(checkIn.id, 'checkInId');
  const clientId = assertValidId(checkIn.clientId, 'clientId');
  const clientUserId = assertValidId(checkIn.clientUserId || '', 'clientUserId');
  const payload = stripUndefined({
    id,
    clientId,
    clientUserId,
    trainerUserId: sanitizeOptionalId(checkIn.trainerUserId),
    weekKey: sanitizeDateKey(checkIn.weekKey, getTodayKey('Asia/Kolkata')),
    dateKey: sanitizeDateKey(checkIn.dateKey, getTodayKey('Asia/Kolkata')),
    weightKg: typeof checkIn.weightKg === 'number' && checkIn.weightKg > 0 ? checkIn.weightKg : undefined,
    energyLevel: Math.max(1, Math.min(5, Math.round(checkIn.energyLevel || 3))),
    sleepQuality: Math.max(1, Math.min(5, Math.round(checkIn.sleepQuality || 3))),
    workoutDifficulty: Math.max(1, Math.min(5, Math.round(checkIn.workoutDifficulty || 3))),
    hungerLevel: Math.max(1, Math.min(5, Math.round(checkIn.hungerLevel || 3))),
    scheduleChallenges: checkIn.scheduleChallenges ? clampString(checkIn.scheduleChallenges, BLUEPRINT_LIMITS.checkInChallengesMax) : undefined,
    generalFeedback: checkIn.generalFeedback ? clampString(checkIn.generalFeedback, 1000) : undefined,
    photoPath: checkIn.photoPath ? clampString(checkIn.photoPath, 300) : undefined,
    shareWithTrainer: typeof checkIn.shareWithTrainer === 'boolean' ? checkIn.shareWithTrainer : undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  try {
    await setDoc(doc(db, 'weeklyCheckIns', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `weeklyCheckIns/${id}`);
  }
}

export async function saveWeeklyCheckInTrainerFeedbackDoc(params: {
  checkInId: string;
  feedback: string;
}): Promise<void> {
  const id = assertValidId(params.checkInId, 'checkInId');
  try {
    await updateDoc(doc(db, 'weeklyCheckIns', id), {
      trainerFeedback: clampString(params.feedback, BLUEPRINT_LIMITS.trainerFeedbackMax),
      trainerReviewedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `weeklyCheckIns/${id}`);
  }
}

export function subscribeConversationMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const convId = assertValidId(conversationId, 'conversationId');
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const messages: ChatMessage[] = snap.docs.map((s) => {
        const d = s.data();
        return {
          id: s.id,
          conversationId: convId,
          senderUserId: String(d.senderUserId || ''),
          senderRole: (d.senderRole as ChatMessage['senderRole']) || 'client',
          senderName: String(d.senderName || ''),
          text: String(d.text || ''),
          status: (d.status as ChatMessage['status']) || 'sent',
          readByRecipient: Boolean(d.readByRecipient),
          readAt: typeof d.readAt === 'string' ? d.readAt : undefined,
          replyTo: d.replyTo ? (d.replyTo as ChatMessage['replyTo']) : undefined,
          attachment: d.attachment ? (d.attachment as ChatMessage['attachment']) : undefined,
          reference: d.reference ? (d.reference as ChatMessage['reference']) : undefined,
          createdAt: tsToIso(d.createdAt),
        };
      });
      onUpdate(messages);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, `conversations/${convId}/messages`);
    }
  );
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
  const convId = assertValidId(params.conversationId, 'conversationId');
  const senderUid = assertValidId(params.senderUserId, 'senderUserId');
  const msgId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  
  const msgPayload = stripUndefined({
    id: msgId,
    conversationId: convId,
    senderUserId: senderUid,
    senderRole: params.senderRole,
    senderName: clampString(params.senderName, 100),
    text: clampString(params.text || '', 2000),
    status: 'sent',
    readByRecipient: false,
    replyTo: params.replyTo,
    attachment: params.attachment,
    reference: params.reference,
    createdAt: serverTimestamp(),
  });

  const batch = writeBatch(db);
  batch.set(doc(db, 'conversations', convId, 'messages', msgId), msgPayload);

  const convRef = doc(db, 'conversations', convId);
  const snippet = params.text ? clampString(params.text, 140) : (params.attachment ? '📷 Image attachment' : 'Shared a plan');
  
  batch.update(convRef, {
    lastMessageText: snippet,
    lastMessageAt: new Date().toISOString(),
    lastMessageSenderId: senderUid,
    ...(params.senderRole === 'client' 
      ? { unreadCountTrainer: increment(1) } 
      : { unreadCountClient: increment(1) }),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return msgId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `conversations/${convId}/messages/${msgId}`);
    return msgId;
  }
}

export async function markConversationReadDoc(
  conversationId: string,
  userRole: 'client' | 'trainer'
): Promise<void> {
  const convId = assertValidId(conversationId, 'conversationId');
  try {
    await updateDoc(doc(db, 'conversations', convId), {
      ...(userRole === 'client' ? { unreadCountClient: 0 } : { unreadCountTrainer: 0 }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${convId}`);
  }
}

export async function uploadChatAttachmentPhoto(params: {
  conversationId: string;
  senderUserId: string;
  file: File;
}): Promise<{ url: string; storagePath: string; fileSize: number }> {
  const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(params.file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  if (params.file.size <= 0 || params.file.size > 5 * 1024 * 1024) {
    throw new Error('Chat attachments must be smaller than 5 MB.');
  }
  const convId = assertValidId(params.conversationId, 'conversationId');
  const ext = params.file.type.includes('png') ? 'png' : params.file.type.includes('webp') ? 'webp' : 'jpg';
  const fileName = `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const storagePath = `private/messages/${convId}/${fileName}`;
  const ref = storageRef(storage, storagePath);
  await uploadBytes(ref, params.file, { contentType: params.file.type });
  const url = await getDownloadURL(ref);
  return { url, storagePath, fileSize: params.file.size };
}

export async function upsertWorkoutTemplateDoc(template: WorkoutProgramTemplate): Promise<void> {
  const id = assertValidId(template.id, 'templateId');
  const payload = stripUndefined({
    id,
    trainerId: assertValidId(template.trainerId, 'trainerId'),
    trainerUserId: sanitizeOptionalId(template.trainerUserId),
    title: clampString(template.title, 140),
    description: clampString(template.description, 1000),
    category: clampString(template.category || 'General', 50),
    tags: Array.isArray(template.tags) ? template.tags.slice(0, 10) : [],
    weekCount: Math.max(1, Math.min(52, template.weekCount || 4)),
    days: Array.isArray(template.days) ? template.days.slice(0, 14) : [],
    createdAt: template.createdAt ? new Date(template.createdAt) : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  try {
    await setDoc(doc(db, 'workoutTemplates', id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workoutTemplates/${id}`);
  }
}

export async function deleteWorkoutTemplateDoc(templateId: string): Promise<void> {
  const id = assertValidId(templateId, 'templateId');
  try {
    await deleteDoc(doc(db, 'workoutTemplates', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `workoutTemplates/${id}`);
  }
}

export async function upsertNutritionTemplateDoc(template: NutritionProgramTemplate): Promise<void> {
  const id = assertValidId(template.id, 'templateId');
  const payload = stripUndefined({
    id,
    trainerId: assertValidId(template.trainerId, 'trainerId'),
    trainerUserId: sanitizeOptionalId(template.trainerUserId),
    title: clampString(template.title, 140),
    description: clampString(template.description, 1000),
    dietaryType: template.dietaryType || 'vegetarian',
    targetKcal: Math.max(500, Math.min(10000, template.targetKcal || 2000)),
    targetProteinG: Math.max(0, Math.min(500, template.targetProteinG || 100)),
    hydrationTargetGlasses: Math.max(0, Math.min(24, template.hydrationTargetGlasses || 8)),
    slots: Array.isArray(template.slots) ? template.slots.slice(0, 8) : [],
    createdAt: template.createdAt ? new Date(template.createdAt) : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  try {
    await setDoc(doc(db, 'nutritionTemplates', id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `nutritionTemplates/${id}`);
  }
}

export async function deleteNutritionTemplateDoc(templateId: string): Promise<void> {
  const id = assertValidId(templateId, 'templateId');
  try {
    await deleteDoc(doc(db, 'nutritionTemplates', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `nutritionTemplates/${id}`);
  }
}

export async function createScheduledReminderDoc(reminder: ScheduledReminder): Promise<void> {
  const id = assertValidId(reminder.id, 'reminderId');
  const payload = stripUndefined({
    id,
    recipientUserId: assertValidId(reminder.recipientUserId, 'recipientUserId'),
    category: reminder.category || 'workout',
    title: clampString(reminder.title, 140),
    body: clampString(reminder.body, 1000),
    scheduledFor: reminder.scheduledFor,
    triggerStatus: reminder.triggerStatus || 'scheduled',
    idempotencyKey: clampString(reminder.idempotencyKey || id, 100),
    channel: reminder.channel || 'in_app',
    createdAt: serverTimestamp(),
  });
  try {
    await setDoc(doc(db, 'scheduledReminders', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `scheduledReminders/${id}`);
  }
}

export async function updateScheduledReminderStatusDoc(
  reminderId: string,
  status: ScheduledReminder['triggerStatus']
): Promise<void> {
  const id = assertValidId(reminderId, 'reminderId');
  try {
    await updateDoc(doc(db, 'scheduledReminders', id), {
      triggerStatus: status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `scheduledReminders/${id}`);
  }
}

export async function deleteScheduledReminderDoc(reminderId: string): Promise<void> {
  const id = assertValidId(reminderId, 'reminderId');
  try {
    await deleteDoc(doc(db, 'scheduledReminders', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `scheduledReminders/${id}`);
  }
}

export async function fetchPublicTrainersAndPackages(): Promise<{
  trainers: TrainerProfile[];
  packages: Package[];
  reviews: TrainerReview[];
}> {
  const [trSnap, pkgSnap] = await Promise.all([
    getDocs(query(collection(db, 'trainers'), where('acceptingClients', '==', true))),
    getDocs(query(collection(db, 'packages'), where('status', '==', 'active'))),
  ]);

  const trainers: TrainerProfile[] = trSnap.docs.map((docSnap) => {
    const d = docSnap.data();
    const verificationStatus: TrainerProfile['verificationStatus'] =
      d.verificationStatus === 'verified'
        ? 'verified'
        : d.verificationStatus === 'pending'
          ? 'pending'
          : 'unverified';
    return {
      id: docSnap.id,
      userId: String(d.userId || ''),
      slug: String(d.slug || docSnap.id),
      displayName: String(d.displayName || 'Coach'),
      headline: String(d.headline || ''),
      bio: String(d.bio || ''),
      coachingStyle: String(d.coachingStyle || ''),
      city: String(d.city || 'Mumbai'),
      coachingMode: (d.coachingMode as TrainerProfile['coachingMode']) || 'hybrid',
      specialties: Array.isArray(d.specialties) ? (d.specialties as string[]) : [],
      languages: Array.isArray(d.languages) ? (d.languages as string[]) : [],
      certifications: Array.isArray(d.certifications) ? (d.certifications as string[]) : undefined,
      experienceYears: Number(d.experienceYears || 1),
      avatarKey: String(d.avatarKey || 'coachArjun'),
      coverKey: String(d.coverKey || 'coachCover'),
      photoUrl: typeof d.photoUrl === 'string' && d.photoUrl ? d.photoUrl : undefined,
      whatsappBusinessE164:
        typeof d.whatsappBusinessE164 === 'string' && d.whatsappBusinessE164
          ? d.whatsappBusinessE164
          : undefined,
      verificationStatus,
      isDemoVerified: Boolean(d.isDemoVerified),
      demoVerificationNote:
        verificationStatus === 'verified' || d.isDemoVerified
          ? 'Verified coach'
          : verificationStatus === 'pending'
            ? 'Verification under review'
            : 'Independent FitPlus coach',
      demoPhoneLabel: 'In-app coaching only',
      acceptingClients: Boolean(d.acceptingClients),
      isPublished: d.isPublished !== undefined ? Boolean(d.isPublished) : true,
      createdAt: tsToIso(d.createdAt),
    };
  });

  const packages: Package[] = pkgSnap.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      id: docSnap.id,
      trainerId: String(d.trainerId || ''),
      name: String(d.name || 'Coaching'),
      summary: String(d.summary || ''),
      priceInr: Number(d.priceInr || 0),
      cadence: (d.cadence as Package['cadence']) || 'monthly',
      durationDays: typeof d.durationDays === 'number' ? d.durationDays : undefined,
      consultationsIncluded: typeof d.consultationsIncluded === 'number' ? d.consultationsIncluded : undefined,
      features: Array.isArray(d.features) ? (d.features as string[]) : [],
      status: d.status === 'paused' ? 'paused' : 'active',
      isDemoSample: Boolean(d.isDemoSample),
      createdAt: tsToIso(d.createdAt),
    };
  });

  let reviews: TrainerReview[] = [];
  try {
    const revSnap = await getDocs(query(collection(db, 'reviews'), where('rating', '>=', 1)));
    reviews = revSnap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        trainerId: String(d.trainerId || ''),
        clientId: String(d.clientId || ''),
        clientUserId: String(d.clientUserId || ''),
        relationshipId: String(d.relationshipId || ''),
        authorName: String(d.authorName || 'FitPlus Member'),
        rating: Number(d.rating || 5),
        comment: String(d.comment || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      };
    });
  } catch {
    reviews = [];
  }

  return { trainers, packages, reviews };
}

export interface PublicInviteResolveResult {
  source: 'firestore_admin' | 'client_fallback';
  state: 'active' | 'expired' | 'redeemed' | 'revoked' | 'not_found' | 'unverified_server';
  invite?: Invite;
  trainer?: TrainerProfile;
  packages?: Package[];
}

export async function resolveInvitePublic(token: string): Promise<PublicInviteResolveResult> {
  const clean = token.trim().toUpperCase();
  if (!clean || !/^[A-Z0-9_\-]+$/.test(clean) || clean.length > 64) {
    return { source: 'client_fallback', state: 'not_found' };
  }

  try {
    const res = await fetch(`/api/invites/resolve?token=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = (await res.json()) as {
        source?: string;
        state?: PublicInviteResolveResult['state'];
        invite?: {
          id: string;
          token: string;
          trainerId: string;
          suggestedPackageId?: string;
          status: Invite['status'];
          expiresAt: string;
        };
        trainer?: {
          id: string;
          slug: string;
          displayName: string;
          headline: string;
          city: string;
          languages: string[];
          experienceYears: number;
          avatarKey: string;
          coverKey: string;
          isVerified?: boolean;
        } | null;
        packages?: Array<{
          id: string;
          trainerId: string;
          name: string;
          summary: string;
          priceInr: number;
          cadence: Package['cadence'];
          features: string[];
          status: Package['status'];
        }>;
      };

      if (data.source === 'firestore_admin') {
        const mappedInvite: Invite | undefined = data.invite
          ? {
              id: data.invite.id,
              token: data.invite.token,
              trainerId: data.invite.trainerId,
              clientEmailOrLabel: 'Invited client',
              suggestedPackageId: data.invite.suggestedPackageId,
              status: data.invite.status,
              expiresAt: data.invite.expiresAt,
              createdAt: new Date().toISOString(),
            }
          : undefined;
        const mappedTrainer: TrainerProfile | undefined = data.trainer
          ? {
              id: data.trainer.id,
              userId: '',
              slug: data.trainer.slug,
              displayName: data.trainer.displayName,
              headline: data.trainer.headline,
              bio: '',
              coachingStyle: '',
              city: data.trainer.city,
              coachingMode: 'hybrid',
              specialties: [],
              languages: data.trainer.languages,
              experienceYears: data.trainer.experienceYears,
              avatarKey: data.trainer.avatarKey,
              coverKey: data.trainer.coverKey,
              verificationStatus: data.trainer.isVerified ? 'verified' : 'unverified',
              isDemoVerified: Boolean(data.trainer.isVerified),
              demoVerificationNote: data.trainer.isVerified ? 'Verified coach' : 'Independent FitPlus coach',
              demoPhoneLabel: 'In-app coaching only',
              acceptingClients: true,
              createdAt: new Date().toISOString(),
            }
          : undefined;
        const mappedPackages: Package[] | undefined = data.packages?.map((p) => ({
          id: p.id,
          trainerId: p.trainerId,
          name: p.name,
          summary: p.summary,
          priceInr: p.priceInr,
          cadence: p.cadence,
          features: p.features,
          status: p.status,
          isDemoSample: false,
          createdAt: new Date().toISOString(),
        }));
        return {
          source: 'firestore_admin',
          state: data.state || 'not_found',
          invite: mappedInvite,
          trainer: mappedTrainer,
          packages: mappedPackages,
        };
      }
    }
  } catch {
    // Fall through to authenticated client lookup if network/API route fails
  }

  if (auth.currentUser) {
    try {
      const inv = await fetchInviteDocByToken(clean);
      if (!inv) return { source: 'client_fallback', state: 'not_found' };
      return {
        source: 'client_fallback',
        state: inv.status,
        invite: inv,
      };
    } catch {
      return { source: 'client_fallback', state: 'unverified_server' };
    }
  }

  return { source: 'client_fallback', state: 'unverified_server' };
}

// -----------------------------------------------------------------------------
// Real-time Listeners (ONLY called when auth is ready & user is verified)
// -----------------------------------------------------------------------------
export function subscribeAuthenticatedWorkspace(
  fbUser: FirebaseAuthUser,
  onUpdate: (patch: Partial<LiveFirestoreSlice>) => void,
  options?: { isPlatformAdmin?: boolean; role?: UserRole },
): Unsubscribe {
  if (!fbUser.emailVerified) {
    return () => {};
  }
  const uid = assertValidId(fbUser.uid, 'userId');
  const isPlatformAdmin = Boolean(options?.isPlatformAdmin);
  const userRole = options?.role;
  const unsubs: Unsubscribe[] = [];

  // Track merged sets for collections that have multiple scoped queries (e.g. trainers, packages, assignments)
  let publicTrainers: TrainerProfile[] = [];
  let ownTrainers: TrainerProfile[] = [];
  let publicPackages: Package[] = [];
  let ownPackages: Package[] = [];
  let ownClients: ClientProfile[] = [];
  let linkedClients: ClientProfile[] = [];
  let clientRels: CoachingRelationship[] = [];
  let trainerRels: CoachingRelationship[] = [];
  let clientEnrs: Enrollment[] = [];
  let trainerEnrs: Enrollment[] = [];
  let clientAsgs: Assignment[] = [];
  let trainerAsgs: Assignment[] = [];
  let clientCmps: CompletionEvent[] = [];
  let trainerCmps: CompletionEvent[] = [];
  let clientPrgs: ProgressEvent[] = [];
  let trainerPrgs: ProgressEvent[] = [];
  let clientWps: WorkoutPlan[] = [];
  let trainerWps: WorkoutPlan[] = [];
  let clientMps: MealPlan[] = [];
  let trainerMps: MealPlan[] = [];
  let availableSlots: ConsultationSlot[] = [];
  let bookedSlots: ConsultationSlot[] = [];
  let trainerSlots: ConsultationSlot[] = [];
  let clientBookings: Booking[] = [];
  let trainerBookings: Booking[] = [];
  let clientDailyActs: DailyActivity[] = [];
  let trainerDailyActs: DailyActivity[] = [];
  let clientStreaks: StreakRecord[] = [];
  let trainerStreaks: StreakRecord[] = [];
  let clientSessions: WorkoutSession[] = [];
  let trainerSessions: WorkoutSession[] = [];
  let clientNutrition: NutritionDiaryEntry[] = [];
  let trainerNutrition: NutritionDiaryEntry[] = [];
  let clientCheckIns: WeeklyCheckIn[] = [];
  let trainerCheckIns: WeeklyCheckIn[] = [];
  const groupMemberMap = new Map<string, ClientGroupMember[]>();
  const groupMemberUnsubs = new Map<string, Unsubscribe>();

  const mergeById = <T extends { id: string }>(...lists: T[][]): T[] => {
    const map = new Map<string, T>();
    for (const list of lists) {
      for (const item of list) map.set(item.id, item);
    }
    return Array.from(map.values());
  };

  // User + isolated private PII doc
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const resolvedRole: UserRole =
          d.role === 'admin' && isPlatformAdmin
            ? 'admin'
            : d.role === 'trainer'
              ? 'trainer'
              : 'client';
        const user: User = {
          id: uid,
          firstName: String(d.firstName || 'Member'),
          lastName: String(d.lastName || ''),
          email: fbUser.email || '',
          role: resolvedRole,
          timezone: String(d.timezone || 'Asia/Kolkata'),
          locale: 'en-IN',
          isAdultConfirmed: Boolean(d.isAdultConfirmed),
          privacyConsentAccepted: Boolean(d.privacyConsentAccepted),
          createdAt: tsToIso(d.createdAt),
        };
        onUpdate({
          users: [user],
          onboardingCompleted: Boolean(d.onboardingCompleted),
        });
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`),
    ),
  );

  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid, 'private', 'contact'),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const rawPrefs = d.notificationPrefs as Record<string, unknown> | undefined;
        onUpdate({
          celebratedDateKeys: Array.isArray(d.celebratedDateKeys) ? d.celebratedDateKeys : [],
          pendingInviteToken: typeof d.pendingInviteToken === 'string' && d.pendingInviteToken ? d.pendingInviteToken : undefined,
          notificationPrefs: rawPrefs
            ? {
                assignmentReminders: rawPrefs.assignmentReminders !== false,
                consultationAlerts: rawPrefs.consultationAlerts !== false,
                streakMilestones: rawPrefs.streakMilestones !== false,
                billingReceipts: rawPrefs.billingReceipts !== false,
                browserPushEnabled: Boolean(rawPrefs.browserPushEnabled),
                updatedAt: typeof rawPrefs.updatedAt === 'string' ? rawPrefs.updatedAt : undefined,
              }
            : undefined,
        });
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/contact`),
    ),
  );

  const mapTrainer = (id: string, d: Record<string, unknown>): TrainerProfile => {
    const verificationStatus: TrainerProfile['verificationStatus'] =
      d.verificationStatus === 'verified'
        ? 'verified'
        : d.verificationStatus === 'pending'
          ? 'pending'
          : 'unverified';
    return {
      id,
      userId: String(d.userId || ''),
      slug: String(d.slug || id),
      displayName: String(d.displayName || 'Coach'),
      headline: String(d.headline || ''),
      bio: String(d.bio || ''),
      coachingStyle: String(d.coachingStyle || ''),
      city: String(d.city || 'Mumbai'),
      coachingMode: (d.coachingMode as TrainerProfile['coachingMode']) || 'hybrid',
      specialties: Array.isArray(d.specialties) ? (d.specialties as string[]) : [],
      languages: Array.isArray(d.languages) ? (d.languages as string[]) : [],
      certifications: Array.isArray(d.certifications) ? (d.certifications as string[]) : undefined,
      experienceYears: Number(d.experienceYears || 1),
      avatarKey: String(d.avatarKey || 'coachArjun'),
      coverKey: String(d.coverKey || 'coachCover'),
      photoUrl: typeof d.photoUrl === 'string' && d.photoUrl ? d.photoUrl : undefined,
      whatsappBusinessE164:
        typeof d.whatsappBusinessE164 === 'string' && d.whatsappBusinessE164
          ? d.whatsappBusinessE164
          : undefined,
      verificationStatus,
      isDemoVerified: Boolean(d.isDemoVerified),
      demoVerificationNote:
        verificationStatus === 'verified' || d.isDemoVerified
          ? 'Verified coach'
          : verificationStatus === 'pending'
            ? 'Verification under review'
            : 'Independent FitPlus coach',
      demoPhoneLabel: 'In-app coaching only',
      acceptingClients: Boolean(d.acceptingClients),
      isPublished: d.isPublished !== undefined ? Boolean(d.isPublished) : true,
      createdAt: tsToIso(d.createdAt),
    };
  };

  const mapPackage = (id: string, d: Record<string, unknown>): Package => ({
    id,
    trainerId: String(d.trainerId || ''),
    name: String(d.name || 'Coaching'),
    summary: String(d.summary || ''),
    priceInr: Number(d.priceInr || 0),
    cadence: (d.cadence as Package['cadence']) || 'monthly',
    durationDays: typeof d.durationDays === 'number' ? d.durationDays : undefined,
    consultationsIncluded: typeof d.consultationsIncluded === 'number' ? d.consultationsIncluded : undefined,
    features: Array.isArray(d.features) ? (d.features as string[]) : [],
    status: d.status === 'paused' ? 'paused' : 'active',
    isDemoSample: Boolean(d.isDemoSample),
    createdAt: tsToIso(d.createdAt),
  });

  const mapClient = (id: string, d: Record<string, unknown>): ClientProfile => ({
    id,
    userId: String(d.userId || ''),
    firstName: String(d.firstName || 'Member'),
    lastName: String(d.lastName || ''),
    age: typeof d.age === 'number' ? d.age : undefined,
    heightCm: typeof d.heightCm === 'number' ? d.heightCm : undefined,
    weightKg: typeof d.weightKg === 'number' ? d.weightKg : undefined,
    targetWeightKg: typeof d.targetWeightKg === 'number' ? d.targetWeightKg : undefined,
    primaryGoal: (d.primaryGoal as ClientProfile['primaryGoal']) || 'general_fitness',
    experienceLevel: (d.experienceLevel as ClientProfile['experienceLevel']) || 'beginner',
    daysPerWeek: Number(d.daysPerWeek || 3),
    environment: (d.environment as ClientProfile['environment']) || 'home',
    equipment: Array.isArray(d.equipment) ? (d.equipment as string[]) : [],
    dietaryPreference: (d.dietaryPreference as ClientProfile['dietaryPreference']) || 'vegetarian',
    dietaryNotes: typeof d.dietaryNotes === 'string' ? d.dietaryNotes : undefined,
    foodAllergies: typeof d.foodAllergies === 'string' ? d.foodAllergies : undefined,
    healthLimitations: typeof d.healthLimitations === 'string' ? d.healthLimitations : undefined,
    preferredLanguage: typeof d.preferredLanguage === 'string' ? d.preferredLanguage : undefined,
    coachingPreferences: typeof d.coachingPreferences === 'string' ? d.coachingPreferences : undefined,
    coachNotes: typeof d.coachNotes === 'string' ? d.coachNotes : undefined,
    createdAt: tsToIso(d.createdAt),
  });

  // Public trainers & active packages + trainer-owned ones
  unsubs.push(
    onSnapshot(
      query(collection(db, 'trainers'), where('acceptingClients', '==', true)),
      (snap) => {
        publicTrainers = snap.docs.map((docSnap) => mapTrainer(docSnap.id, docSnap.data()));
        onUpdate({ trainers: mergeById(publicTrainers, ownTrainers) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'trainers'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'trainers'), where('userId', '==', uid)),
      (snap) => {
        ownTrainers = snap.docs.map((docSnap) => mapTrainer(docSnap.id, docSnap.data()));
        onUpdate({ trainers: mergeById(publicTrainers, ownTrainers) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'trainers'),
    ),
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'packages'), where('status', '==', 'active')),
      (snap) => {
        publicPackages = snap.docs.map((docSnap) => mapPackage(docSnap.id, docSnap.data()));
        onUpdate({ packages: mergeById(publicPackages, ownPackages) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'packages'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'packages'), where('trainerUserId', '==', uid)),
      (snap) => {
        ownPackages = snap.docs.map((docSnap) => mapPackage(docSnap.id, docSnap.data()));
        onUpdate({ packages: mergeById(publicPackages, ownPackages) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'packages'),
    ),
  );

  // Clients (own + actively linked)
  unsubs.push(
    onSnapshot(
      query(collection(db, 'clients'), where('userId', '==', uid)),
      (snap) => {
        ownClients = snap.docs.map((docSnap) => mapClient(docSnap.id, docSnap.data()));
        onUpdate({ clients: mergeById(ownClients, linkedClients) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'clients'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'clients'), where('activeTrainerUserId', '==', uid)),
      (snap) => {
        linkedClients = snap.docs.map((docSnap) => mapClient(docSnap.id, docSnap.data()));
        onUpdate({ clients: mergeById(ownClients, linkedClients) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'clients'),
    ),
  );

  // Relationships
  const mapRel = (id: string, d: Record<string, unknown>): CoachingRelationship => ({
    id,
    trainerId: String(d.trainerId || ''),
    clientId: String(d.clientId || ''),
    packageId: typeof d.packageId === 'string' && d.packageId ? d.packageId : undefined,
    status: (d.status as CoachingRelationship['status']) || 'active',
    startedAt: String(d.startedAt || tsToIso(d.createdAt)),
    endedAt: typeof d.endedAt === 'string' && d.endedAt ? d.endedAt : undefined,
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'relationships'), where('clientUserId', '==', uid)),
      (snap) => {
        clientRels = snap.docs.map((s) => mapRel(s.id, s.data()));
        onUpdate({ relationships: mergeById(clientRels, trainerRels) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'relationships'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'relationships'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerRels = snap.docs.map((s) => mapRel(s.id, s.data()));
        onUpdate({ relationships: mergeById(clientRels, trainerRels) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'relationships'),
    ),
  );

  // Invites (trainer-owned list)
  unsubs.push(
    onSnapshot(
      query(collection(db, 'invites'), where('trainerUserId', '==', uid)),
      (snap) => {
        const invites: Invite[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            token: String(d.token || s.id),
            trainerId: String(d.trainerId || ''),
            clientEmailOrLabel: String(d.clientLabel || ''),
            suggestedPackageId: typeof d.suggestedPackageId === 'string' && d.suggestedPackageId ? d.suggestedPackageId : undefined,
            status: d.status || 'active',
            expiresAt: String(d.expiresAt || ''),
            createdAt: tsToIso(d.createdAt),
            redeemedByClientId: typeof d.redeemedByClientId === 'string' && d.redeemedByClientId ? d.redeemedByClientId : undefined,
          };
        });
        onUpdate({ invites });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'invites'),
    ),
  );

  // Enrollments
  const mapEnr = (id: string, d: Record<string, unknown>): Enrollment => ({
    id,
    clientId: String(d.clientId || ''),
    trainerId: String(d.trainerId || ''),
    packageId: String(d.packageId || ''),
    subscriptionId: typeof d.subscriptionId === 'string' && d.subscriptionId ? d.subscriptionId : undefined,
    status: d.status === 'ended' ? 'ended' : 'active',
    isDemoCheckout: Boolean(d.isDemoCheckout),
    enrolledAt: String(d.enrolledAt || tsToIso(d.createdAt)),
    endedAt: typeof d.endedAt === 'string' && d.endedAt ? d.endedAt : undefined,
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'enrollments'), where('clientUserId', '==', uid)),
      (snap) => {
        clientEnrs = snap.docs.map((s) => mapEnr(s.id, s.data()));
        onUpdate({ enrollments: mergeById(clientEnrs, trainerEnrs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'enrollments'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'enrollments'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerEnrs = snap.docs.map((s) => mapEnr(s.id, s.data()));
        onUpdate({ enrollments: mergeById(clientEnrs, trainerEnrs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'enrollments'),
    ),
  );

  // Templates (trainer-owned)
  unsubs.push(
    onSnapshot(
      query(collection(db, 'templates'), where('trainerUserId', '==', uid)),
      (snap) => {
        const templates: TaskTemplate[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            trainerId: String(d.trainerId || ''),
            title: String(d.title || ''),
            category: d.category || 'workout',
            instructions: String(d.instructions || ''),
            durationMinutes: Number(d.durationMinutes || 0),
            completionType: d.completionType || 'checkbox',
            targetLabel: typeof d.targetLabel === 'string' && d.targetLabel ? d.targetLabel : undefined,
            isRecoveryDefault: Boolean(d.isRecoveryDefault),
            isOptionalDefault: Boolean(d.isOptionalDefault),
            archived: Boolean(d.archived),
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ templates });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'templates'),
    ),
  );

  // Assignments
  const mapAsg = (id: string, d: Record<string, unknown>): Assignment => ({
    id,
    clientId: String(d.clientId || ''),
    trainerId: typeof d.trainerId === 'string' && d.trainerId ? d.trainerId : undefined,
    templateId: typeof d.templateId === 'string' && d.templateId ? d.templateId : undefined,
    title: String(d.title || ''),
    category: (d.category as Assignment['category']) || 'habit',
    instructions: String(d.instructions || ''),
    durationMinutes: Number(d.durationMinutes || 0),
    dueTime: String(d.dueTime || '8:00 PM'),
    completionType: (d.completionType as Assignment['completionType']) || 'checkbox',
    targetLabel: typeof d.targetLabel === 'string' && d.targetLabel ? d.targetLabel : undefined,
    scheduledDates: Array.isArray(d.scheduledDates) ? (d.scheduledDates as string[]) : [],
    isOptional: Boolean(d.isOptional),
    isRecovery: Boolean(d.isRecovery),
    hasCustomOverride: Boolean(d.hasCustomOverride),
    overrideNote: typeof d.overrideNote === 'string' && d.overrideNote ? d.overrideNote : undefined,
    createdAt: tsToIso(d.createdAt),
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'assignments'), where('clientUserId', '==', uid)),
      (snap) => {
        clientAsgs = snap.docs.map((s) => mapAsg(s.id, s.data()));
        onUpdate({ assignments: mergeById(clientAsgs, trainerAsgs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assignments'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'assignments'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerAsgs = snap.docs.map((s) => mapAsg(s.id, s.data()));
        onUpdate({ assignments: mergeById(clientAsgs, trainerAsgs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assignments'),
    ),
  );

  // Completions
  const mapCmp = (id: string, d: Record<string, unknown>): CompletionEvent => ({
    id,
    assignmentId: String(d.assignmentId || ''),
    clientId: String(d.clientId || ''),
    dateKey: String(d.dateKey || ''),
    completedAt: String(d.completedAt || tsToIso(d.createdAt)),
    loggedValue: typeof d.loggedValue === 'string' && d.loggedValue ? d.loggedValue : undefined,
    notes: typeof d.notes === 'string' && d.notes ? d.notes : undefined,
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'completions'), where('clientUserId', '==', uid)),
      (snap) => {
        clientCmps = snap.docs.map((s) => mapCmp(s.id, s.data()));
        onUpdate({ completions: mergeById(clientCmps, trainerCmps) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'completions'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'completions'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerCmps = snap.docs.map((s) => mapCmp(s.id, s.data()));
        onUpdate({ completions: mergeById(clientCmps, trainerCmps) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'completions'),
    ),
  );

  // Progress Events
  const mapPrg = (id: string, d: Record<string, unknown>): ProgressEvent => ({
    id,
    clientId: String(d.clientId || ''),
    dateKey: String(d.dateKey || ''),
    metricType: (d.metricType as ProgressEvent['metricType']) || 'weight',
    label: String(d.label || ''),
    value: Number(d.value || 0),
    unit: String(d.unit || 'kg'),
    note: typeof d.note === 'string' && d.note ? d.note : undefined,
    photoPath: typeof d.photoPath === 'string' && d.photoPath ? d.photoPath : undefined,
    shareWithTrainer: typeof d.shareWithTrainer === 'boolean' ? d.shareWithTrainer : undefined,
    createdAt: tsToIso(d.createdAt),
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'progressEvents'), where('clientUserId', '==', uid)),
      (snap) => {
        clientPrgs = snap.docs.map((s) => mapPrg(s.id, s.data()));
        onUpdate({ progressEvents: mergeById(clientPrgs, trainerPrgs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'progressEvents'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'progressEvents'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerPrgs = snap.docs.map((s) => mapPrg(s.id, s.data()));
        onUpdate({ progressEvents: mergeById(clientPrgs, trainerPrgs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'progressEvents'),
    ),
  );

  // WorkoutPlans & MealPlans
  const mapWp = (id: string, d: Record<string, unknown>): WorkoutPlan => ({
    id,
    clientId: String(d.clientId || ''),
    trainerId: typeof d.trainerId === 'string' && d.trainerId ? d.trainerId : undefined,
    title: String(d.title || ''),
    weekLabel: String(d.weekLabel || ''),
    coachNotes: String(d.coachNotes || ''),
    days: Array.isArray(d.days) ? (d.days as WorkoutPlan['days']) : [],
    updatedAt: tsToIso(d.updatedAt),
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'workoutPlans'), where('clientUserId', '==', uid)),
      (snap) => {
        clientWps = snap.docs.map((s) => mapWp(s.id, s.data()));
        onUpdate({ workoutPlans: mergeById(clientWps, trainerWps) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workoutPlans'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'workoutPlans'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerWps = snap.docs.map((s) => mapWp(s.id, s.data()));
        onUpdate({ workoutPlans: mergeById(clientWps, trainerWps) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workoutPlans'),
    ),
  );

  const mapMp = (id: string, d: Record<string, unknown>): MealPlan => ({
    id,
    clientId: String(d.clientId || ''),
    trainerId: typeof d.trainerId === 'string' && d.trainerId ? d.trainerId : undefined,
    title: String(d.title || ''),
    dietaryLabel: String(d.dietaryLabel || ''),
    coachNotes: String(d.coachNotes || ''),
    meals: Array.isArray(d.meals) ? (d.meals as MealPlan['meals']) : [],
    updatedAt: tsToIso(d.updatedAt),
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'mealPlans'), where('clientUserId', '==', uid)),
      (snap) => {
        clientMps = snap.docs.map((s) => mapMp(s.id, s.data()));
        onUpdate({ mealPlans: mergeById(clientMps, trainerMps) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'mealPlans'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'mealPlans'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerMps = snap.docs.map((s) => mapMp(s.id, s.data()));
        onUpdate({ mealPlans: mergeById(clientMps, trainerMps) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'mealPlans'),
    ),
  );

  // Consultation Slots
  const mapSlot = (id: string, d: Record<string, unknown>): ConsultationSlot => ({
    id,
    trainerId: String(d.trainerId || ''),
    dateKey: String(d.dateKey || ''),
    startTime: String(d.startTime || '09:00'),
    endTime: String(d.endTime || '09:30'),
    timezone: String(d.timezone || 'Asia/Kolkata'),
    mode: d.mode === 'in_person' ? 'in_person' : 'online',
    meetingLink: typeof d.meetingLink === 'string' && d.meetingLink ? d.meetingLink : undefined,
    status: (d.status as ConsultationSlot['status']) || 'available',
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'consultationSlots'), where('status', '==', 'available')),
      (snap) => {
        availableSlots = snap.docs.map((s) => mapSlot(s.id, s.data()));
        onUpdate({ consultationSlots: mergeById(availableSlots, bookedSlots, trainerSlots) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'consultationSlots'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'consultationSlots'), where('bookedByUserId', '==', uid)),
      (snap) => {
        bookedSlots = snap.docs.map((s) => mapSlot(s.id, s.data()));
        onUpdate({ consultationSlots: mergeById(availableSlots, bookedSlots, trainerSlots) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'consultationSlots'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'consultationSlots'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerSlots = snap.docs.map((s) => mapSlot(s.id, s.data()));
        onUpdate({ consultationSlots: mergeById(availableSlots, bookedSlots, trainerSlots) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'consultationSlots'),
    ),
  );

  // Bookings
  const mapBooking = (id: string, d: Record<string, unknown>): Booking => ({
    id,
    slotId: String(d.slotId || ''),
    trainerId: String(d.trainerId || ''),
    clientId: String(d.clientId || ''),
    dateKey: String(d.dateKey || ''),
    startTime: String(d.startTime || '09:00'),
    endTime: String(d.endTime || '09:30'),
    timezone: String(d.timezone || 'Asia/Kolkata'),
    topic: String(d.topic || ''),
    meetingLink: typeof d.meetingLink === 'string' && d.meetingLink ? d.meetingLink : undefined,
    status: (d.status as Booking['status']) || 'booked',
    createdAt: tsToIso(d.createdAt),
    updatedAt: tsToIso(d.updatedAt),
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'bookings'), where('clientUserId', '==', uid)),
      (snap) => {
        clientBookings = snap.docs.map((s) => mapBooking(s.id, s.data()));
        onUpdate({ bookings: mergeById(clientBookings, trainerBookings) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'bookings'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerBookings = snap.docs.map((s) => mapBooking(s.id, s.data()));
        onUpdate({ bookings: mergeById(clientBookings, trainerBookings) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings'),
    ),
  );

  // Notifications
  unsubs.push(
    onSnapshot(
      query(collection(db, 'notifications'), where('recipientUserId', '==', uid)),
      (snap) => {
        const notifications: Notification[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            recipientUserId: String(d.recipientUserId || uid),
            title: String(d.title || ''),
            body: String(d.body || ''),
            category: d.category || 'system',
            read: Boolean(d.read),
            actionRoute: typeof d.actionRoute === 'string' && d.actionRoute ? d.actionRoute : undefined,
            createdAt: tsToIso(d.createdAt),
          };
        });
        onUpdate({ notifications });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'),
    ),
  );

  // AI Drafts
  unsubs.push(
    onSnapshot(
      query(collection(db, 'aiDrafts'), where('trainerUserId', '==', uid)),
      (snap) => {
        const aiDrafts: AIPlanDraft[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            trainerId: String(d.trainerId || ''),
            objective: d.objective || 'general_fitness',
            experienceLevel: d.experienceLevel || 'beginner',
            daysPerWeek: Number(d.daysPerWeek || 3),
            environment: d.environment || 'home',
            dietaryPreference: d.dietaryPreference || 'vegetarian',
            constraints: String(d.constraints || ''),
            title: String(d.title || ''),
            summary: String(d.summary || ''),
            workoutDays: Array.isArray(d.workoutDays) ? d.workoutDays : [],
            nutritionOutline: Array.isArray(d.nutritionOutline) ? d.nutritionOutline : [],
            habitCommitments: Array.isArray(d.habitCommitments) ? d.habitCommitments : [],
            status: d.status || 'draft',
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ aiDrafts });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'aiDrafts'),
    ),
  );

  // Daily Activity (hydration, steps, recovery — client own + trainer active clients)
  const mapDailyAct = (id: string, d: Record<string, unknown>): DailyActivity => ({
    id,
    clientId: String(d.clientId || ''),
    clientUserId: String(d.clientUserId || ''),
    trainerUserId: String(d.trainerUserId || ''),
    dateKey: String(d.dateKey || ''),
    hydrationGlasses: Number(d.hydrationGlasses ?? 0),
    steps: typeof d.steps === 'number' ? d.steps : undefined,
    sleepHours: typeof d.sleepHours === 'number' ? d.sleepHours : undefined,
    recoveryApproved: typeof d.recoveryApproved === 'boolean' ? d.recoveryApproved : undefined,
    createdAt: tsToIso(d.createdAt),
    updatedAt: tsToIso(d.updatedAt),
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'dailyActivity'), where('clientUserId', '==', uid)),
      (snap) => {
        clientDailyActs = snap.docs.map((s) => mapDailyAct(s.id, s.data()));
        onUpdate({ dailyActivities: mergeById(clientDailyActs, trainerDailyActs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'dailyActivity'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'dailyActivity'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerDailyActs = snap.docs.map((s) => mapDailyAct(s.id, s.data()));
        onUpdate({ dailyActivities: mergeById(clientDailyActs, trainerDailyActs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'dailyActivity'),
    ),
  );

  // Streaks (client own + trainer active clients)
  const mapStreak = (id: string, d: Record<string, unknown>): StreakRecord => ({
    id,
    clientId: String(d.clientId || id),
    clientUserId: String(d.clientUserId || ''),
    trainerUserId: String(d.trainerUserId || ''),
    currentStreak: Number(d.currentStreak || 0),
    longestStreak: Number(d.longestStreak || 0),
    lastEligibleDateKey:
      typeof d.lastEligibleDateKey === 'string' && d.lastEligibleDateKey
        ? d.lastEligibleDateKey
        : undefined,
    createdAt: tsToIso(d.createdAt),
    updatedAt: tsToIso(d.updatedAt),
  });
  unsubs.push(
    onSnapshot(
      query(collection(db, 'streaks'), where('clientUserId', '==', uid)),
      (snap) => {
        clientStreaks = snap.docs.map((s) => mapStreak(s.id, s.data()));
        onUpdate({ streaks: mergeById(clientStreaks, trainerStreaks) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'streaks'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'streaks'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerStreaks = snap.docs.map((s) => mapStreak(s.id, s.data()));
        onUpdate({ streaks: mergeById(clientStreaks, trainerStreaks) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'streaks'),
    ),
  );

  // Custom Client Groups & Members (trainer-owned)
  const emitGroupMembers = () => {
    const all: ClientGroupMember[] = [];
    for (const members of groupMemberMap.values()) {
      all.push(...members);
    }
    onUpdate({ clientGroupMembers: all });
  };
  unsubs.push(
    onSnapshot(
      query(collection(db, 'clientGroups'), where('trainerUserId', '==', uid)),
      (snap) => {
        const clientGroups: ClientGroup[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            trainerId: String(d.trainerId || ''),
            trainerUserId: String(d.trainerUserId || uid),
            name: String(d.name || 'Group'),
            description: typeof d.description === 'string' && d.description ? d.description : undefined,
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ clientGroups });

        const activeGroupIds = new Set(clientGroups.map((g) => g.id));
        for (const [existingId, unsubMember] of groupMemberUnsubs.entries()) {
          if (!activeGroupIds.has(existingId)) {
            unsubMember();
            groupMemberUnsubs.delete(existingId);
            groupMemberMap.delete(existingId);
          }
        }

        for (const group of clientGroups) {
          if (groupMemberUnsubs.has(group.id)) continue;
          const memberUnsub = onSnapshot(
            query(collection(db, 'clientGroups', group.id, 'members'), where('trainerUserId', '==', uid)),
            (mSnap) => {
              const members: ClientGroupMember[] = mSnap.docs.map((ms) => {
                const md = ms.data();
                return {
                  groupId: group.id,
                  clientId: String(md.clientId || ms.id),
                  clientUserId: String(md.clientUserId || ''),
                  trainerUserId: String(md.trainerUserId || uid),
                  addedAt: tsToIso(md.addedAt),
                };
              });
              groupMemberMap.set(group.id, members);
              emitGroupMembers();
            },
            (err) => handleFirestoreError(err, OperationType.LIST, `clientGroups/${group.id}/members`),
          );
          groupMemberUnsubs.set(group.id, memberUnsub);
        }
        emitGroupMembers();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'clientGroups'),
    ),
  );

  // Consent Records
  unsubs.push(
    onSnapshot(
      query(collection(db, 'consentRecords'), where('userId', '==', uid)),
      (snap) => {
        const consents: ConsentRecord[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            userId: String(d.userId || uid),
            consentType: (d.consentType as ConsentType) || 'terms_privacy',
            granted: Boolean(d.granted),
            policyVersion: String(d.policyVersion || CURRENT_POLICY_VERSION),
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ consents });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'consentRecords'),
    ),
  );

  // Verification Requests (own trainer submissions, or full queue if platform admin)
  unsubs.push(
    onSnapshot(
      isPlatformAdmin
        ? collection(db, 'trainerVerificationRequests')
        : query(collection(db, 'trainerVerificationRequests'), where('trainerUserId', '==', uid)),
      (snap) => {
        const verificationRequests: TrainerVerificationRequest[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            trainerId: String(d.trainerId || ''),
            trainerUserId: String(d.trainerUserId || ''),
            qualificationTitle: String(d.qualificationTitle || ''),
            issuingBody: String(d.issuingBody || ''),
            credentialRef: typeof d.credentialRef === 'string' ? d.credentialRef : undefined,
            status: (d.status as TrainerVerificationRequest['status']) || 'pending',
            reviewNote: typeof d.reviewNote === 'string' ? d.reviewNote : undefined,
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ verificationRequests });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'trainerVerificationRequests'),
    ),
  );

  if (isPlatformAdmin) {
    unsubs.push(
      onSnapshot(
        collection(db, 'auditLogs'),
        (snap) => {
          const auditLogs: AuditLogEntry[] = snap.docs.map((s) => {
            const d = s.data();
            return {
              id: s.id,
              actorUserId: String(d.actorUserId || ''),
              action: String(d.action || ''),
              targetType: String(d.targetType || ''),
              targetId: String(d.targetId || ''),
              summary: String(d.summary || ''),
              createdAt: tsToIso(d.createdAt),
            };
          });
          onUpdate({ auditLogs });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs'),
      ),
    );
  }

  // Subscriptions, Payments, & Public Reviews (Stage 3C)
  let clientSubs: Subscription[] = [];
  let trainerSubs: Subscription[] = [];
  const mapSub = (id: string, d: Record<string, unknown>): Subscription => {
    const provider: Subscription['provider'] =
      d.provider === 'free_tier'
        ? 'free_tier'
        : d.provider === 'razorpay' || (typeof d.razorpayOrderId === 'string' && !d.providerOrderId)
          ? 'razorpay'
          : 'cashfree';
    const providerOrderId =
      typeof d.providerOrderId === 'string'
        ? d.providerOrderId
        : typeof d.razorpayOrderId === 'string'
          ? d.razorpayOrderId
          : undefined;
    return {
      id,
      clientId: String(d.clientId || ''),
      clientUserId: String(d.clientUserId || ''),
      trainerId: String(d.trainerId || ''),
      trainerUserId: String(d.trainerUserId || ''),
      packageId: String(d.packageId || ''),
      packageName: String(d.packageName || 'Coaching Package'),
      priceInr: Number(d.priceInr || 0),
      cadence: (d.cadence as Subscription['cadence']) || 'monthly',
      durationDays: Number(d.durationDays || 30),
      consultationsIncluded: Number(d.consultationsIncluded ?? 2),
      status: (d.status as Subscription['status']) || 'active',
      provider,
      latestPaymentId: typeof d.latestPaymentId === 'string' ? d.latestPaymentId : undefined,
      providerOrderId,
      currentPeriodStart: String(d.currentPeriodStart || tsToIso(d.createdAt)),
      currentPeriodEnd: String(d.currentPeriodEnd || tsToIso(d.createdAt)),
      razorpayOrderId: typeof d.razorpayOrderId === 'string' ? d.razorpayOrderId : undefined,
      createdAt: tsToIso(d.createdAt),
      updatedAt: tsToIso(d.updatedAt),
    };
  };
  unsubs.push(
    onSnapshot(
      query(collection(db, 'subscriptions'), where('clientUserId', '==', uid)),
      (snap) => {
        clientSubs = snap.docs.map((s) => mapSub(s.id, s.data()));
        onUpdate({ subscriptions: mergeById(clientSubs, trainerSubs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'subscriptions'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerSubs = snap.docs.map((s) => mapSub(s.id, s.data()));
        onUpdate({ subscriptions: mergeById(clientSubs, trainerSubs) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions'),
    ),
  );

  let clientPays: PaymentRecord[] = [];
  let trainerPays: PaymentRecord[] = [];
  const mapPay = (id: string, d: Record<string, unknown>): PaymentRecord => {
    const provider: PaymentRecord['provider'] =
      d.provider === 'free_tier'
        ? 'free_tier'
        : d.provider === 'razorpay' || (typeof d.razorpayOrderId === 'string' && !d.providerOrderId)
          ? 'razorpay'
          : 'cashfree';
    const providerOrderId =
      typeof d.providerOrderId === 'string'
        ? d.providerOrderId
        : typeof d.razorpayOrderId === 'string'
          ? d.razorpayOrderId
          : undefined;
    const providerPaymentId =
      typeof d.providerPaymentId === 'string'
        ? d.providerPaymentId
        : typeof d.razorpayPaymentId === 'string'
          ? d.razorpayPaymentId
          : undefined;
    return {
      id,
      subscriptionId: typeof d.subscriptionId === 'string' ? d.subscriptionId : undefined,
      clientId: String(d.clientId || ''),
      clientUserId: String(d.clientUserId || ''),
      trainerId: String(d.trainerId || ''),
      trainerUserId: String(d.trainerUserId || ''),
      packageId: String(d.packageId || ''),
      packageName: String(d.packageName || 'Coaching Package'),
      invoiceNumber: String(d.invoiceNumber || id),
      amountPaise: Number(d.amountPaise || 0),
      amountInr: Number(d.amountInr || 0),
      currency: 'INR',
      status: (d.status as PaymentRecord['status']) || 'created',
      provider,
      mode: typeof d.mode === 'string' ? (d.mode as PaymentRecord['mode']) : undefined,
      providerOrderId,
      providerPaymentId,
      cfOrderId: typeof d.cfOrderId === 'string' ? d.cfOrderId : undefined,
      paymentSessionId: typeof d.paymentSessionId === 'string' ? d.paymentSessionId : undefined,
      paymentMethod: typeof d.paymentMethod === 'string' ? d.paymentMethod : undefined,
      refundStatus: typeof d.refundStatus === 'string' ? (d.refundStatus as PaymentRecord['refundStatus']) : undefined,
      settlementStatus:
        typeof d.settlementStatus === 'string'
          ? (d.settlementStatus as PaymentRecord['settlementStatus'])
          : undefined,
      verifiedAt: typeof d.verifiedAt === 'string' ? d.verifiedAt : undefined,
      webhookEventId: typeof d.webhookEventId === 'string' ? d.webhookEventId : undefined,
      lastWebhookAt: typeof d.lastWebhookAt === 'string' ? d.lastWebhookAt : undefined,
      razorpayOrderId: typeof d.razorpayOrderId === 'string' ? d.razorpayOrderId : undefined,
      razorpayPaymentId: typeof d.razorpayPaymentId === 'string' ? d.razorpayPaymentId : undefined,
      paidAt: typeof d.paidAt === 'string' ? d.paidAt : undefined,
      failureReason: typeof d.failureReason === 'string' ? d.failureReason : undefined,
      createdAt: tsToIso(d.createdAt),
      updatedAt: tsToIso(d.updatedAt),
    };
  };
  unsubs.push(
    onSnapshot(
      query(collection(db, 'payments'), where('clientUserId', '==', uid)),
      (snap) => {
        clientPays = snap.docs.map((s) => mapPay(s.id, s.data()));
        onUpdate({ payments: mergeById(clientPays, trainerPays) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'payments'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerPays = snap.docs.map((s) => mapPay(s.id, s.data()));
        onUpdate({ payments: mergeById(clientPays, trainerPays) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments'),
    ),
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'reviews'), where('rating', '>=', 1)),
      (snap) => {
        const reviews: TrainerReview[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            trainerId: String(d.trainerId || ''),
            clientId: String(d.clientId || ''),
            clientUserId: String(d.clientUserId || ''),
            relationshipId: String(d.relationshipId || ''),
            authorName: String(d.authorName || 'FitPlus Member'),
            rating: Number(d.rating || 5),
            comment: String(d.comment || ''),
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ reviews });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews'),
    ),
  );

  // ---------------------------------------------------------------------------
  // Stage 4A Listeners: Custom Exercises, Workout Sessions, Achievements, Nutrition, Check-ins
  // ---------------------------------------------------------------------------
  unsubs.push(
    onSnapshot(
      query(collection(db, 'exercises'), where('isCustom', '==', true)),
      (snap) => {
        const customExercises: ExerciseDefinition[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            name: String(d.name || ''),
            category: (d.category as ExerciseDefinition['category']) || 'strength',
            environment: (d.environment as ExerciseDefinition['environment']) || 'both',
            equipment: (d.equipment as ExerciseDefinition['equipment']) || 'bodyweight',
            difficulty: (d.difficulty as ExerciseDefinition['difficulty']) || 'beginner',
            primaryMuscles: Array.isArray(d.primaryMuscles) ? d.primaryMuscles : [],
            secondaryMuscles: Array.isArray(d.secondaryMuscles) ? d.secondaryMuscles : [],
            instructions: Array.isArray(d.instructions) ? d.instructions : [],
            commonMistakes: Array.isArray(d.commonMistakes) ? d.commonMistakes : [],
            safetyNotes: String(d.safetyNotes || ''),
            alternativeIds: Array.isArray(d.alternativeIds) ? d.alternativeIds : [],
            isCustom: true,
            trainerId: String(d.trainerId || ''),
            trainerUserId: String(d.trainerUserId || ''),
            createdAt: tsToIso(d.createdAt),
          };
        });
        onUpdate({ customExercises });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'exercises'),
    ),
  );

  const mapSession = (id: string, d: Record<string, unknown>): WorkoutSession => ({
    id,
    clientId: String(d.clientId || ''),
    clientUserId: typeof d.clientUserId === 'string' && d.clientUserId ? d.clientUserId : undefined,
    trainerUserId: typeof d.trainerUserId === 'string' && d.trainerUserId ? d.trainerUserId : undefined,
    assignmentId: typeof d.assignmentId === 'string' && d.assignmentId ? d.assignmentId : undefined,
    planId: typeof d.planId === 'string' && d.planId ? d.planId : undefined,
    dayIndex: typeof d.dayIndex === 'number' ? d.dayIndex : undefined,
    title: String(d.title || 'Workout Session'),
    dateKey: String(d.dateKey || ''),
    status: (d.status as WorkoutSession['status']) || 'completed',
    startedAt: String(d.startedAt || tsToIso(d.createdAt)),
    completedAt: typeof d.completedAt === 'string' && d.completedAt ? d.completedAt : undefined,
    durationSeconds: Number(d.durationSeconds || 0),
    totalVolumeKg: Number(d.totalVolumeKg || 0),
    completedSetsCount: Number(d.completedSetsCount || 0),
    prCount: Number(d.prCount || 0),
    exercises: Array.isArray(d.exercises) ? (d.exercises as WorkoutSession['exercises']) : [],
    notes: typeof d.notes === 'string' && d.notes ? d.notes : undefined,
    updatedAt: tsToIso(d.updatedAt),
  });

  unsubs.push(
    onSnapshot(
      query(collection(db, 'workoutSessions'), where('clientUserId', '==', uid)),
      (snap) => {
        clientSessions = snap.docs.map((s) => mapSession(s.id, s.data()));
        onUpdate({ workoutSessions: mergeById(clientSessions, trainerSessions) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workoutSessions'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'workoutSessions'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerSessions = snap.docs.map((s) => mapSession(s.id, s.data()));
        onUpdate({ workoutSessions: mergeById(clientSessions, trainerSessions) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workoutSessions'),
    ),
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'achievements'), where('clientUserId', '==', uid)),
      (snap) => {
        const achievements: AchievementUnlock[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            badgeId: d.badgeId,
            clientId: String(d.clientId || ''),
            clientUserId: String(d.clientUserId || uid),
            title: String(d.title || ''),
            description: String(d.description || ''),
            unlockedAt: String(d.unlockedAt || tsToIso(d.createdAt)),
            metricSnapshot: typeof d.metricSnapshot === 'string' && d.metricSnapshot ? d.metricSnapshot : undefined,
          };
        });
        onUpdate({ achievements });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'achievements'),
    ),
  );

  const mapNutrition = (id: string, d: Record<string, unknown>): NutritionDiaryEntry => ({
    id,
    clientId: String(d.clientId || ''),
    clientUserId: typeof d.clientUserId === 'string' && d.clientUserId ? d.clientUserId : undefined,
    trainerUserId: typeof d.trainerUserId === 'string' && d.trainerUserId ? d.trainerUserId : undefined,
    dateKey: String(d.dateKey || ''),
    completedSlots: Array.isArray(d.completedSlots) ? (d.completedSlots as NutritionDiaryEntry['completedSlots']) : [],
    items: Array.isArray(d.items) ? (d.items as NutritionDiaryEntry['items']) : [],
    waterGlasses: Number(d.waterGlasses || 0),
    personalNotes: typeof d.personalNotes === 'string' && d.personalNotes ? d.personalNotes : undefined,
    trainerFeedback: typeof d.trainerFeedback === 'string' && d.trainerFeedback ? d.trainerFeedback : undefined,
    trainerFeedbackAt: typeof d.trainerFeedbackAt === 'string' && d.trainerFeedbackAt ? d.trainerFeedbackAt : undefined,
    updatedAt: tsToIso(d.updatedAt),
  });

  unsubs.push(
    onSnapshot(
      query(collection(db, 'nutritionLogs'), where('clientUserId', '==', uid)),
      (snap) => {
        clientNutrition = snap.docs.map((s) => mapNutrition(s.id, s.data()));
        onUpdate({ nutritionLogs: mergeById(clientNutrition, trainerNutrition) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionLogs'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'nutritionLogs'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerNutrition = snap.docs.map((s) => mapNutrition(s.id, s.data()));
        onUpdate({ nutritionLogs: mergeById(clientNutrition, trainerNutrition) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionLogs'),
    ),
  );

  const mapCheckIn = (id: string, d: Record<string, unknown>): WeeklyCheckIn => ({
    id,
    clientId: String(d.clientId || ''),
    clientUserId: typeof d.clientUserId === 'string' && d.clientUserId ? d.clientUserId : undefined,
    trainerUserId: typeof d.trainerUserId === 'string' && d.trainerUserId ? d.trainerUserId : undefined,
    weekKey: String(d.weekKey || ''),
    dateKey: String(d.dateKey || ''),
    weightKg: typeof d.weightKg === 'number' ? d.weightKg : undefined,
    energyLevel: Number(d.energyLevel || 3),
    sleepQuality: Number(d.sleepQuality || 3),
    workoutDifficulty: Number(d.workoutDifficulty || 3),
    hungerLevel: Number(d.hungerLevel || 3),
    scheduleChallenges: typeof d.scheduleChallenges === 'string' && d.scheduleChallenges ? d.scheduleChallenges : undefined,
    generalFeedback: typeof d.generalFeedback === 'string' && d.generalFeedback ? d.generalFeedback : undefined,
    photoPath: typeof d.photoPath === 'string' && d.photoPath ? d.photoPath : undefined,
    shareWithTrainer: typeof d.shareWithTrainer === 'boolean' ? d.shareWithTrainer : undefined,
    trainerFeedback: typeof d.trainerFeedback === 'string' && d.trainerFeedback ? d.trainerFeedback : undefined,
    trainerReviewedAt: typeof d.trainerReviewedAt === 'string' && d.trainerReviewedAt ? d.trainerReviewedAt : undefined,
    createdAt: tsToIso(d.createdAt),
    updatedAt: tsToIso(d.updatedAt),
  });

  unsubs.push(
    onSnapshot(
      query(collection(db, 'weeklyCheckIns'), where('clientUserId', '==', uid)),
      (snap) => {
        clientCheckIns = snap.docs.map((s) => mapCheckIn(s.id, s.data()));
        onUpdate({ weeklyCheckIns: mergeById(clientCheckIns, trainerCheckIns) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'weeklyCheckIns'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'weeklyCheckIns'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerCheckIns = snap.docs.map((s) => mapCheckIn(s.id, s.data()));
        onUpdate({ weeklyCheckIns: mergeById(clientCheckIns, trainerCheckIns) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'weeklyCheckIns'),
    ),
  );

  // Conversations
  const mapConversation = (id: string, d: Record<string, unknown>): ChatConversation => ({
    id,
    clientId: String(d.clientId || ''),
    clientUserId: String(d.clientUserId || ''),
    clientName: String(d.clientName || 'Client'),
    clientAvatar: typeof d.clientAvatar === 'string' ? d.clientAvatar : undefined,
    trainerId: String(d.trainerId || ''),
    trainerUserId: String(d.trainerUserId || ''),
    trainerName: String(d.trainerName || 'Coach'),
    trainerAvatar: typeof d.trainerAvatar === 'string' ? d.trainerAvatar : undefined,
    lastMessageText: typeof d.lastMessageText === 'string' ? d.lastMessageText : undefined,
    lastMessageAt: typeof d.lastMessageAt === 'string' ? d.lastMessageAt : undefined,
    lastMessageSenderId: typeof d.lastMessageSenderId === 'string' ? d.lastMessageSenderId : undefined,
    unreadCountClient: Number(d.unreadCountClient || 0),
    unreadCountTrainer: Number(d.unreadCountTrainer || 0),
    isBlocked: Boolean(d.isBlocked),
    blockedByUserId: typeof d.blockedByUserId === 'string' ? d.blockedByUserId : undefined,
    createdAt: tsToIso(d.createdAt),
    updatedAt: tsToIso(d.updatedAt),
  });

  let clientConversations: ChatConversation[] = [];
  let trainerConversations: ChatConversation[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'conversations'), where('clientUserId', '==', uid)),
      (snap) => {
        clientConversations = snap.docs.map((s) => mapConversation(s.id, s.data()));
        onUpdate({ conversations: mergeById(clientConversations, trainerConversations) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations'),
    ),
  );
  unsubs.push(
    onSnapshot(
      query(collection(db, 'conversations'), where('trainerUserId', '==', uid)),
      (snap) => {
        trainerConversations = snap.docs.map((s) => mapConversation(s.id, s.data()));
        onUpdate({ conversations: mergeById(clientConversations, trainerConversations) });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations'),
    ),
  );

  // Workout Program Templates
  unsubs.push(
    onSnapshot(
      query(collection(db, 'workoutTemplates'), where('trainerUserId', '==', uid)),
      (snap) => {
        const workoutTemplates: WorkoutProgramTemplate[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            trainerId: String(d.trainerId || ''),
            trainerUserId: String(d.trainerUserId || uid),
            title: String(d.title || 'Workout Program'),
            description: String(d.description || ''),
            category: String(d.category || 'General'),
            tags: Array.isArray(d.tags) ? d.tags : [],
            weekCount: Number(d.weekCount || 4),
            days: Array.isArray(d.days) ? (d.days as WorkoutProgramTemplate['days']) : [],
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ workoutTemplates });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workoutTemplates'),
    ),
  );

  // Nutrition Program Templates
  unsubs.push(
    onSnapshot(
      query(collection(db, 'nutritionTemplates'), where('trainerUserId', '==', uid)),
      (snap) => {
        const nutritionTemplates: NutritionProgramTemplate[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            trainerId: String(d.trainerId || ''),
            trainerUserId: String(d.trainerUserId || uid),
            title: String(d.title || 'Nutrition Program'),
            description: String(d.description || ''),
            dietaryType: (d.dietaryType as NutritionProgramTemplate['dietaryType']) || 'vegetarian',
            targetKcal: Number(d.targetKcal || 2000),
            targetProteinG: Number(d.targetProteinG || 100),
            hydrationTargetGlasses: Number(d.hydrationTargetGlasses || 8),
            slots: Array.isArray(d.slots) ? (d.slots as NutritionProgramTemplate['slots']) : [],
            createdAt: tsToIso(d.createdAt),
            updatedAt: tsToIso(d.updatedAt),
          };
        });
        onUpdate({ nutritionTemplates });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionTemplates'),
    ),
  );

  // Scheduled Reminders
  unsubs.push(
    onSnapshot(
      query(collection(db, 'scheduledReminders'), where('recipientUserId', '==', uid)),
      (snap) => {
        const scheduledReminders: ScheduledReminder[] = snap.docs.map((s) => {
          const d = s.data();
          return {
            id: s.id,
            recipientUserId: String(d.recipientUserId || uid),
            category: d.category || 'workout',
            title: String(d.title || ''),
            body: String(d.body || ''),
            scheduledFor: String(d.scheduledFor || ''),
            triggerStatus: d.triggerStatus || 'scheduled',
            idempotencyKey: String(d.idempotencyKey || s.id),
            channel: d.channel || 'in_app',
            createdAt: tsToIso(d.createdAt),
          };
        });
        onUpdate({ scheduledReminders });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'scheduledReminders'),
    ),
  );

  return () => {
    for (const unsub of unsubs) unsub();
    for (const memberUnsub of groupMemberUnsubs.values()) memberUnsub();
    groupMemberUnsubs.clear();
  };
}
