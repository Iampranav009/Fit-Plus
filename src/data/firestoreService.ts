import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { signInWithPopup, signOut, type User as FirebaseAuthUser } from 'firebase/auth';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  assertValidId,
  BLUEPRINT_LIMITS,
  clampNonEmptyString,
  clampString,
  clampStringArray,
  sanitizeDateKey,
  sanitizeOptionalId,
  sanitizeSlug,
  sanitizeTimeHHMM,
} from '../lib/firestoreValidation';
import type {
  AIPlanDraft,
  Assignment,
  Booking,
  ClientProfile,
  CoachingRelationship,
  CompletionEvent,
  ConsultationSlot,
  Enrollment,
  Invite,
  MealPlan,
  Notification,
  Package,
  ProgressEvent,
  TaskTemplate,
  TrainerProfile,
  User,
  UserRole,
  WorkoutPlan,
} from '../types/domain';

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
}

export interface LiveFirestoreSlice {
  users: User[];
  trainers: TrainerProfile[];
  packages: Package[];
  clients: ClientProfile[];
  relationships: CoachingRelationship[];
  invites: Invite[];
  enrollments: Enrollment[];
  templates: TaskTemplate[];
  assignments: Assignment[];
  completions: CompletionEvent[];
  progressEvents: ProgressEvent[];
  workoutPlans: WorkoutPlan[];
  mealPlans: MealPlan[];
  consultationSlots: ConsultationSlot[];
  bookings: Booking[];
  notifications: Notification[];
  aiDrafts: AIPlanDraft[];
  onboardingCompleted: boolean;
  celebratedDateKeys: string[];
  pendingInviteToken?: string;
}

export async function signInWithGooglePopup(): Promise<FirebaseAuthUser> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutFirebaseAuth(): Promise<void> {
  await signOut(auth);
}

export async function ensureUserDocument(
  fbUser: FirebaseAuthUser,
): Promise<FirebaseUserBootstrapResult> {
  const uid = assertValidId(fbUser.uid, 'userId');
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

  if (userSnap.exists()) {
    const data = userSnap.data();
    const priv = privateSnap.exists() ? privateSnap.data() : {};
    return {
      user: {
        id: uid,
        firstName: clampNonEmptyString(data.firstName, BLUEPRINT_LIMITS.nameMax, 'Member'),
        lastName: clampString(data.lastName, BLUEPRINT_LIMITS.nameMax, ''),
        email: clampString(priv.email || fbUser.email || '', BLUEPRINT_LIMITS.emailMax, ''),
        role: data.role === 'trainer' ? 'trainer' : 'client',
        timezone: clampNonEmptyString(data.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
        locale: 'en-IN',
        isAdultConfirmed: Boolean(data.isAdultConfirmed),
        createdAt: tsToIso(data.createdAt),
      },
      onboardingCompleted: Boolean(data.onboardingCompleted),
      celebratedDateKeys: Array.isArray(priv.celebratedDateKeys) ? priv.celebratedDateKeys : [],
      pendingInviteToken: typeof priv.pendingInviteToken === 'string' && priv.pendingInviteToken ? priv.pendingInviteToken : undefined,
    };
  }

  const displayParts = (fbUser.displayName || 'FitPlus Member').trim().split(/\s+/);
  const firstName = clampNonEmptyString(displayParts[0], BLUEPRINT_LIMITS.nameMax, 'Member');
  const lastName = clampString(displayParts.slice(1).join(' '), BLUEPRINT_LIMITS.nameMax, '');
  const email = clampNonEmptyString(fbUser.email || `${uid}@fitplus.local`, BLUEPRINT_LIMITS.emailMax, `${uid}@fitplus.local`);

  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), {
    id: uid,
    firstName,
    lastName,
    role: 'client',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    isAdultConfirmed: false,
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', uid, 'private', 'contact'), {
    userId: uid,
    email,
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
      firstName,
      lastName,
      email,
      role: 'client',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      isAdultConfirmed: false,
      createdAt: new Date().toISOString(),
    },
    onboardingCompleted: false,
    celebratedDateKeys: [],
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

  batch1.set(doc(db, 'trainers', trainerId), {
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
    experienceYears: Math.min(80, Math.max(0, Math.round(params.trainer.experienceYears || 1))),
    avatarKey: clampString(params.trainer.avatarKey, 64, 'coachArjun'),
    coverKey: clampString(params.trainer.coverKey, 64, 'coachCover'),
    isDemoVerified: false,
    acceptingClients: Boolean(params.trainer.acceptingClients),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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
    experienceYears: updates.experienceYears !== undefined ? Math.min(80, Math.max(0, Math.round(updates.experienceYears))) : undefined,
    avatarKey: updates.avatarKey,
    coverKey: updates.coverKey,
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
    isDemoCheckout: true,
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

  batch.set(doc(db, 'bookings', bookingId), {
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
    status: 'booked',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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
  if (isUpdate) {
    try {
      await updateDoc(doc(db, 'packages', id), {
        name: clampNonEmptyString(pkg.name, 120, 'Coaching Package'),
        summary: clampNonEmptyString(pkg.summary, BLUEPRINT_LIMITS.summaryMax, 'Weekly coaching'),
        priceInr: Math.min(1000000, Math.max(0, Math.round(pkg.priceInr || 0))),
        cadence: pkg.cadence,
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
    await setDoc(doc(db, 'consultationSlots', id), {
      id,
      trainerId: assertValidId(slot.trainerId, 'trainerId'),
      trainerUserId: assertValidId(trainerUserId, 'trainerUserId'),
      dateKey: sanitizeDateKey(slot.dateKey, new Date().toISOString().slice(0, 10)),
      startTime: sanitizeTimeHHMM(slot.startTime, '09:00'),
      endTime: sanitizeTimeHHMM(slot.endTime, '09:30'),
      timezone: clampNonEmptyString(slot.timezone, BLUEPRINT_LIMITS.timezoneMax, 'Asia/Kolkata'),
      mode: slot.mode,
      status: slot.status === 'blocked' ? 'blocked' : 'available',
      bookedByUserId: '',
      activeBookingId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `consultationSlots/${id}`);
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

// -----------------------------------------------------------------------------
// Real-time Listeners (ONLY called when auth is ready & user is signed in)
// -----------------------------------------------------------------------------
export function subscribeAuthenticatedWorkspace(
  fbUser: FirebaseAuthUser,
  onUpdate: (patch: Partial<LiveFirestoreSlice>) => void,
): Unsubscribe {
  const uid = assertValidId(fbUser.uid, 'userId');
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
        const user: User = {
          id: uid,
          firstName: String(d.firstName || 'Member'),
          lastName: String(d.lastName || ''),
          email: fbUser.email || '',
          role: d.role === 'trainer' ? 'trainer' : 'client',
          timezone: String(d.timezone || 'Asia/Kolkata'),
          locale: 'en-IN',
          isAdultConfirmed: Boolean(d.isAdultConfirmed),
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
        onUpdate({
          celebratedDateKeys: Array.isArray(d.celebratedDateKeys) ? d.celebratedDateKeys : [],
          pendingInviteToken: typeof d.pendingInviteToken === 'string' && d.pendingInviteToken ? d.pendingInviteToken : undefined,
        });
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/contact`),
    ),
  );

  const mapTrainer = (id: string, d: Record<string, unknown>): TrainerProfile => ({
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
    experienceYears: Number(d.experienceYears || 1),
    avatarKey: String(d.avatarKey || 'coachArjun'),
    coverKey: String(d.coverKey || 'coachCover'),
    isDemoVerified: Boolean(d.isDemoVerified),
    demoVerificationNote: d.isDemoVerified ? 'Verified coach' : 'Cloud profile · Unverified demo listing',
    demoPhoneLabel: 'In-app coaching only',
    acceptingClients: Boolean(d.acceptingClients),
    createdAt: tsToIso(d.createdAt),
  });

  const mapPackage = (id: string, d: Record<string, unknown>): Package => ({
    id,
    trainerId: String(d.trainerId || ''),
    name: String(d.name || 'Coaching'),
    summary: String(d.summary || ''),
    priceInr: Number(d.priceInr || 0),
    cadence: (d.cadence as Package['cadence']) || 'monthly',
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
    status: d.status === 'ended' ? 'ended' : 'active',
    isDemoCheckout: true,
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

  return () => {
    for (const unsub of unsubs) unsub();
  };
}
