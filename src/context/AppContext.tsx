import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import type {
  AIPlanDraft,
  AdminOverviewStats,
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
  DietaryPreference,
  ExperienceLevel,
  GoalFocus,
  Invite,
  MealPlan,
  Notification,
  NotificationPrefs,
  Package,
  PaymentRecord,
  ProgressEvent,
  StreakRecord,
  StoreSnapshot,
  Subscription,
  TaskCategory,
  TaskTemplate,
  TrainerProfile,
  TrainerReview,
  TrainerVerificationRequest,
  TrainingEnvironment,
  User,
  UserRole,
  WorkoutPlan,
} from '../types/domain';
import { findEligibleReviewRelationship } from '../lib/commerce';
import { demoRepository } from '../data/repository';
import { createSeedSnapshot, STORE_SCHEMA_VERSION } from '../data/demo/fixtures';
import { auth, getApiSecurityHeaders } from '../lib/firebase';
import * as fsService from '../data/firestoreService';
import { getTodayKey } from '../lib/date';
import {
  attemptBookConsultationSlot,
  buildBulkAssignments,
  createDemoEnrollmentState,
  generateCryptoInviteToken,
  generateDefaultClientPlans,
  generateDeterministicPlanDraft,
  rescheduleConsultationBooking,
  uid,
  type BulkAssignInput,
} from '../lib/engines';
import { computeDayConsistency, computeStreakSummary } from '../lib/streak';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'error';
}

export interface OnboardingClientDraft {
  firstName: string;
  lastName: string;
  isAdultConfirmed: boolean;
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
  dietaryNotes: string;
  foodAllergies?: string;
  healthLimitations?: string;
  preferredLanguage?: string;
  coachingPreferences?: string;
}

export interface OnboardingTrainerDraft {
  displayName: string;
  city: string;
  experienceYears: number;
  coachingMode: 'online' | 'in_person' | 'hybrid';
  specialties: string[];
  languages: string[];
  headline: string;
  bio: string;
  coachingStyle?: string;
  certifications?: string[];
  whatsappBusinessE164?: string;
  photoFile?: File | null;
  submitVerification?: {
    qualificationTitle: string;
    issuingBody: string;
    credentialRef?: string;
  };
  packageName: string;
  packagePriceInr: number;
  packageSummary: string;
}

export interface AuthActionResult {
  ok: boolean;
  onboardingCompleted?: boolean;
  role?: UserRole;
  emailVerified?: boolean;
  isPlatformAdmin?: boolean;
  error?: string;
}

interface AppContextValue {
  store: StoreSnapshot;
  todayKey: string;
  activeUser: User;
  activeClient?: ClientProfile;
  activeTrainer?: TrainerProfile;
  activeRelationship?: CoachingRelationship;
  activeCoach?: TrainerProfile;
  linkedClientsForActiveTrainer: ClientProfile[];
  toasts: ToastMessage[];
  celebrateStreakToday: boolean;
  dismissStreakCelebration: () => void;
  pushToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;

  // Firebase Auth, RBAC & Cloud Sync State
  isAuthReady: boolean;
  firebaseUser: FirebaseAuthUser | null;
  isEmailVerified: boolean;
  isPlatformAdmin: boolean;
  isCloudSynced: boolean;
  isDemoSandbox: boolean;
  authBusy: boolean;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signUpWithEmail: (params: { email: string; password: string; fullName: string }) => Promise<AuthActionResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  resendVerificationEmail: () => Promise<{ ok: boolean; error?: string }>;
  refreshVerificationState: () => Promise<AuthActionResult>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  deleteMyAccount: () => Promise<{ ok: boolean; error?: string }>;
  signOutGoogle: () => Promise<void>;
  lookupInviteToken: (token: string) => Promise<fsService.PublicInviteResolveResult>;

  // Public Directory & Cloud-First Operations
  publicDirectory: { trainers: TrainerProfile[]; packages: Package[]; reviews: TrainerReview[]; loaded: boolean };
  subscriptions: Subscription[];
  payments: PaymentRecord[];
  reviews: TrainerReview[];
  notificationPrefs: NotificationPrefs;
  todayHydrationGlasses: number;
  setTodayHydrationGlasses: (glasses: number) => void;
  consents: ConsentRecord[];
  recordConsent: (consentType: ConsentType, granted: boolean) => Promise<void>;
  verificationRequests: TrainerVerificationRequest[];
  auditLogs: AuditLogEntry[];
  submitVerificationRequest: (input: {
    qualificationTitle: string;
    issuingBody: string;
    credentialRef?: string;
  }) => Promise<void>;
  resolveVerificationRequest: (input: {
    requestId: string;
    trainerId: string;
    approve: boolean;
    reviewNote?: string;
  }) => Promise<void>;

  // Demo Sandbox Controls
  switchDemoPersona: (userId: string) => void;
  setDemoSimulationFlags: (flags: { simulateLoading?: boolean; simulateError?: boolean }) => void;
  signOutDemo: () => void;
  startDemoAsRole: (role: UserRole, userId?: string) => void;
  exitDemoSandbox: () => void;
  setPendingInviteToken: (token?: string) => void;
  resetDemoState: () => void;
  updateTimezone: (timezone: string) => void;

  // Onboarding
  completeClientOnboarding: (draft: OnboardingClientDraft) => void;
  completeTrainerOnboarding: (draft: OnboardingTrainerDraft) => void;

  // Client Actions
  toggleAssignmentCompletion: (assignmentId: string, dateKey: string, payload?: { loggedValue?: string; notes?: string }) => void;
  saveAssignmentLog: (assignmentId: string, dateKey: string, loggedValue: string, notes: string) => void;
  addProgressMeasurement: (input: {
    dateKey: string;
    metricType: 'weight' | 'strength' | 'waist' | 'steps' | 'checkin';
    label: string;
    value: number;
    unit: string;
    note?: string;
    photoFile?: File | null;
    shareWithTrainer?: boolean;
  }) => Promise<void>;
  toggleProgressPhotoShare: (eventId: string, shareWithTrainer: boolean) => Promise<void>;
  acceptDemoInviteAndPackage: (inviteToken: string, pkg: Package) => void;
  rejectInvite: (inviteToken: string) => void;
  enrollWithCoachPackage: (trainerId: string, pkg: Package) => void;
  requestCoachConnection: (trainerId: string, packageId?: string) => Promise<{ ok: boolean; error?: string }>;
  disconnectActiveCoach: () => void;
  bookSlot: (slotId: string, topic: string) => { ok: boolean; error?: string };
  rescheduleBooking: (bookingId: string, newSlotId: string) => { ok: boolean; error?: string };
  cancelBooking: (bookingId: string) => void;
  updateClientDetails: (updates: Partial<ClientProfile>) => void;

  // Trainer Actions & Stage 3B Extensions
  dailyActivities: DailyActivity[];
  streaks: StreakRecord[];
  clientGroups: ClientGroup[];
  clientGroupMembers: ClientGroupMember[];
  pendingRelationshipsForActiveTrainer: CoachingRelationship[];
  aiQuotaRemaining: number | null;
  getClientApprovedRecoveryDates: (clientId: string) => string[];
  isClientLinkedToActiveTrainer: (clientId: string) => boolean;
  createInvite: (clientLabel: string, suggestedPackageId?: string) => Invite;
  revokeInvite: (inviteId: string) => void;
  createClientGroup: (input: { name: string; description?: string }) => void;
  deleteClientGroup: (groupId: string) => void;
  toggleClientGroupMember: (groupId: string, clientId: string) => void;
  respondPendingRelationship: (
    relationshipId: string,
    action: 'accept' | 'decline',
  ) => Promise<{ ok: boolean; error?: string }>;
  toggleClientRecoveryDay: (clientId: string, dateKey: string, approved: boolean) => Promise<void>;
  runBulkAssignment: (input: Omit<BulkAssignInput, 'trainerId' | 'existingAssignments'>) => { createdCount: number; skippedCount: number };
  saveTemplate: (tpl: Omit<TaskTemplate, 'id' | 'trainerId' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  duplicateTemplate: (templateId: string) => void;
  toggleArchiveTemplate: (templateId: string) => void;
  generateAIDraft: (params: {
    objective: GoalFocus;
    experienceLevel: ExperienceLevel;
    daysPerWeek: number;
    environment: TrainingEnvironment;
    dietaryPreference: DietaryPreference;
    constraints: string;
  }) => AIPlanDraft;
  generateAIPlanWithCopilot: (params: {
    objective: GoalFocus;
    experienceLevel: ExperienceLevel;
    daysPerWeek: number;
    environment: TrainingEnvironment;
    dietaryPreference: DietaryPreference;
    constraints: string;
    clientId?: string;
  }) => Promise<{ ok: boolean; draft?: AIPlanDraft; error?: string }>;
  updateAIDraft: (draft: AIPlanDraft) => void;
  approveAndSaveAIDraftAsTemplate: (draftId: string) => void;
  savePackage: (pkg: Omit<Package, 'id' | 'trainerId' | 'createdAt' | 'isDemoSample'> & { id?: string }) => void;
  togglePackageStatus: (packageId: string) => void;
  updateTrainerProfile: (updates: Partial<TrainerProfile>) => void;
  addConsultationSlot: (input: {
    dateKey: string;
    startTime: string;
    endTime: string;
    mode: 'online' | 'in_person';
    meetingLink?: string;
  }) => void;
  markBookingCompleted: (bookingId: string, meetingLink?: string) => void;
  updateConsultationMeetingLink: (params: {
    bookingId?: string;
    slotId?: string;
    meetingLink: string;
  }) => void;
  updateClientCoachNotes: (clientId: string, notes: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;

  // Stage 3C Payments, Reviews, Notification Prefs, & Admin Moderation
  createPackageOrder: (params: {
    trainerId: string;
    packageId: string;
    inviteId?: string;
  }) => Promise<{
    ok: boolean;
    mode?: 'free_enrolled' | 'razorpay_checkout';
    keyId?: string;
    orderId?: string;
    amountPaise?: number;
    amountInr?: number;
    paymentId?: string;
    packageName?: string;
    trainerName?: string;
    invoiceNumber?: string;
    error?: string;
    code?: string;
  }>;
  verifyPackageOrder: (params: {
    paymentId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => Promise<{ ok: boolean; invoiceNumber?: string; error?: string }>;
  submitTrainerReview: (params: {
    trainerId: string;
    rating: number;
    comment: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteTrainerReview: (reviewId: string) => Promise<void>;
  updateNotificationPrefs: (next: NotificationPrefs) => Promise<void>;
  fetchAdminOverview: () => Promise<{ ok: boolean; overview?: AdminOverviewStats; error?: string }>;
  moderateAdminContent: (
    input:
      | { action: 'toggle_trainer_publish'; trainerId: string; isPublished: boolean }
      | { action: 'delete_review'; reviewId: string },
  ) => Promise<{ ok: boolean; error?: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

const PENDING_INVITE_STORAGE_KEY = 'fitplus_pending_invite_token';

function readStoredPendingInvite(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const val = window.sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY);
  return val && val.trim() ? val.trim().toUpperCase() : undefined;
}

function writeStoredPendingInvite(token?: string) {
  if (typeof window === 'undefined') return;
  if (token && token.trim()) {
    window.sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, token.trim().toUpperCase());
  } else {
    window.sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
  }
}

function createEmptyCloudSnapshot(
  user: User,
  onboardingCompleted: boolean,
  celebratedDateKeys: string[],
  pendingInviteToken?: string,
): StoreSnapshot {
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    anchorDateKey: getTodayKey(user.timezone || 'Asia/Kolkata'),
    session: {
      isAuthenticated: true,
      activeUserId: user.id,
      activeRole: user.role,
      onboardingCompleted,
      pendingInviteToken,
      celebratedDateKeys,
      simulateLoading: false,
      simulateError: false,
    },
    users: [user],
    trainers: [],
    clients: [],
    goals: [],
    relationships: [],
    invites: [],
    packages: [],
    enrollments: [],
    templates: [],
    assignments: [],
    completions: [],
    workoutPlans: [],
    mealPlans: [],
    progressEvents: [],
    consultationSlots: [],
    bookings: [],
    notifications: [],
    aiDrafts: [],
  };
}

function isFixtureId(id?: string): boolean {
  return Boolean(id && (id.startsWith('usr_') || id.startsWith('trn_arjun') || id.startsWith('trn_meera') || id.startsWith('trn_kabir')));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStore, setLocalStore] = useState<StoreSnapshot>(() => demoRepository.loadSnapshot());
  const [cloudStore, setCloudStore] = useState<StoreSnapshot | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [demoPreviewOverride, setDemoPreviewOverride] = useState(false);
  const [publicDirectory, setPublicDirectory] = useState<{
    trainers: TrainerProfile[];
    packages: Package[];
    reviews: TrainerReview[];
    loaded: boolean;
  }>({ trainers: [], packages: [], reviews: [], loaded: false });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cloudReviews, setCloudReviews] = useState<TrainerReview[]>([]);
  const [demoReviews, setDemoReviews] = useState<TrainerReview[]>(() => [
    {
      id: 'rev_demo_arjun_1',
      trainerId: 'trn_arjun',
      clientId: 'cln_riya',
      clientUserId: 'usr_riya',
      relationshipId: 'rel_demo_1',
      authorName: 'Riya S.',
      rating: 5,
      comment: 'Structured home workouts that adapted around busy Mumbai travel weeks without losing momentum.',
      createdAt: '2026-02-12T08:00:00.000Z',
      updatedAt: '2026-02-12T08:00:00.000Z',
    },
    {
      id: 'rev_demo_meera_1',
      trainerId: 'trn_meera',
      clientId: 'cln_dev',
      clientUserId: 'usr_dev',
      relationshipId: 'rel_demo_2',
      authorName: 'Dev M.',
      rating: 5,
      comment: 'Realistic Indian vegetarian protein targets and calm mobility cueing after every check-in.',
      createdAt: '2026-02-20T09:30:00.000Z',
      updatedAt: '2026-02-20T09:30:00.000Z',
    },
  ]);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    assignmentReminders: true,
    consultationAlerts: true,
    streakMilestones: true,
    billingReceipts: true,
    browserPushEnabled: false,
  });
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [streaks, setStreaks] = useState<StreakRecord[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [clientGroupMembers, setClientGroupMembers] = useState<ClientGroupMember[]>([]);
  const [aiQuotaRemaining, setAiQuotaRemaining] = useState<number | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<TrainerVerificationRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [demoHydrationMap, setDemoHydrationMap] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [celebrateStreakToday, setCelebrateStreakToday] = useState(false);

  const workspaceUnsubRef = useRef<(() => void) | null>(null);

  const isCloudSynced = Boolean(firebaseUser && firebaseUser.emailVerified && cloudStore && !demoPreviewOverride);
  const isDemoSandbox = Boolean(!firebaseUser && localStore.session.isAuthenticated) || demoPreviewOverride;
  const store = isCloudSynced && cloudStore ? cloudStore : localStore;

  const pushToast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const attachVerifiedWorkspace = useCallback(async (fbUser: FirebaseAuthUser) => {
    if (workspaceUnsubRef.current) {
      workspaceUnsubRef.current();
      workspaceUnsubRef.current = null;
    }

    const boot = await fsService.ensureUserDocument(fbUser);
    setIsEmailVerified(boot.emailVerified);
    setIsPlatformAdmin(boot.isPlatformAdmin);

    const storedInvite = readStoredPendingInvite();
    const resolvedInvite = boot.pendingInviteToken || storedInvite;

    setCloudStore(
      createEmptyCloudSnapshot(
        boot.user,
        boot.onboardingCompleted,
        boot.celebratedDateKeys,
        resolvedInvite,
      ),
    );

    if (!boot.emailVerified) {
      setDailyActivities([]);
      setStreaks([]);
      setClientGroups([]);
      setClientGroupMembers([]);
      setConsents([]);
      setVerificationRequests([]);
      setAuditLogs([]);
      setSubscriptions([]);
      setPayments([]);
      setCloudReviews([]);
      return boot;
    }

    if (storedInvite && !boot.pendingInviteToken) {
      void fsService
        .updateUserPrivateState(fbUser.uid, { pendingInviteToken: storedInvite })
        .catch(() => undefined);
    }

    workspaceUnsubRef.current = fsService.subscribeAuthenticatedWorkspace(
      fbUser,
      (patch) => {
        if (patch.dailyActivities) setDailyActivities(patch.dailyActivities);
        if (patch.streaks) setStreaks(patch.streaks);
        if (patch.clientGroups) setClientGroups(patch.clientGroups);
        if (patch.clientGroupMembers) setClientGroupMembers(patch.clientGroupMembers);
        if (patch.consents) setConsents(patch.consents);
        if (patch.verificationRequests) setVerificationRequests(patch.verificationRequests);
        if (patch.auditLogs) setAuditLogs(patch.auditLogs);
        if (patch.subscriptions) setSubscriptions(patch.subscriptions);
        if (patch.payments) setPayments(patch.payments);
        if (patch.reviews) setCloudReviews(patch.reviews);
        if (patch.notificationPrefs) setNotificationPrefs(patch.notificationPrefs);

        setCloudStore((prev) => {
          if (!prev) return prev;
          const nextUser = patch.users?.[0] ?? prev.users[0];
          return {
            ...prev,
            users: patch.users ?? prev.users,
            trainers: patch.trainers ?? prev.trainers,
            packages: patch.packages ?? prev.packages,
            clients: patch.clients ?? prev.clients,
            relationships: patch.relationships ?? prev.relationships,
            invites: patch.invites ?? prev.invites,
            enrollments: patch.enrollments ?? prev.enrollments,
            templates: patch.templates ?? prev.templates,
            assignments: patch.assignments ?? prev.assignments,
            completions: patch.completions ?? prev.completions,
            progressEvents: patch.progressEvents ?? prev.progressEvents,
            workoutPlans: patch.workoutPlans ?? prev.workoutPlans,
            mealPlans: patch.mealPlans ?? prev.mealPlans,
            consultationSlots: patch.consultationSlots ?? prev.consultationSlots,
            bookings: patch.bookings ?? prev.bookings,
            notifications: patch.notifications ?? prev.notifications,
            aiDrafts: patch.aiDrafts ?? prev.aiDrafts,
            session: {
              ...prev.session,
              activeUserId: nextUser?.id ?? prev.session.activeUserId,
              activeRole: nextUser?.role ?? prev.session.activeRole,
              onboardingCompleted:
                patch.onboardingCompleted !== undefined
                  ? patch.onboardingCompleted
                  : prev.session.onboardingCompleted,
              celebratedDateKeys: patch.celebratedDateKeys ?? prev.session.celebratedDateKeys,
              pendingInviteToken:
                'pendingInviteToken' in patch ? patch.pendingInviteToken : prev.session.pendingInviteToken,
            },
          };
        });
      },
      { isPlatformAdmin: boot.isPlatformAdmin },
    );

    return boot;
  }, []);

  // Load public trainer directory (non-PII) for unauthenticated /discover & /trainers/:slug visitors
  useEffect(() => {
    void fsService
      .fetchPublicTrainersAndPackages()
      .then((res) => {
        setPublicDirectory({ trainers: res.trainers, packages: res.packages, reviews: res.reviews, loaded: true });
      })
      .catch(() => {
        setPublicDirectory((prev) => ({ ...prev, loaded: true }));
      });
  }, []);

  // Attach Firebase auth listener & authenticated Firestore workspace listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (workspaceUnsubRef.current) {
        workspaceUnsubRef.current();
        workspaceUnsubRef.current = null;
      }

      setFirebaseUser(fbUser);

      if (!fbUser) {
        setCloudStore(null);
        setIsEmailVerified(false);
        setIsPlatformAdmin(false);
        setDailyActivities([]);
        setStreaks([]);
        setClientGroups([]);
        setClientGroupMembers([]);
        setAiQuotaRemaining(null);
        setConsents([]);
        setVerificationRequests([]);
        setAuditLogs([]);
        setSubscriptions([]);
        setPayments([]);
        setCloudReviews([]);
        setIsAuthReady(true);
        return;
      }

      setDemoPreviewOverride(false);
      void attachVerifiedWorkspace(fbUser)
        .then(() => {
          setIsAuthReady(true);
        })
        .catch(() => {
          setIsAuthReady(true);
        });
    });

    return () => {
      unsubAuth();
      if (workspaceUnsubRef.current) {
        workspaceUnsubRef.current();
        workspaceUnsubRef.current = null;
      }
    };
  }, [attachVerifiedWorkspace]);

  const persistLocal = useCallback((updater: (prev: StoreSnapshot) => StoreSnapshot) => {
    setLocalStore((prev) => {
      const next = updater(prev);
      demoRepository.saveSnapshot(next);
      return next;
    });
  }, []);

  const persistCloudOptimistic = useCallback((updater: (prev: StoreSnapshot) => StoreSnapshot) => {
    setCloudStore((prev) => (prev ? updater(prev) : prev));
  }, []);

  const persist = useCallback(
    (updater: (prev: StoreSnapshot) => StoreSnapshot) => {
      if (isCloudSynced) {
        persistCloudOptimistic(updater);
      } else {
        persistLocal(updater);
      }
    },
    [isCloudSynced, persistCloudOptimistic, persistLocal],
  );

  const runCloudWrite = useCallback(
    (promise: Promise<unknown>, errorMessage = 'Unable to sync change to Firestore.') => {
      void promise.catch((err) => {
        console.error(err);
        pushToast(errorMessage, 'error');
      });
    },
    [pushToast],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    setAuthBusy(true);
    try {
      const fbUser = await fsService.signInWithGooglePopup();
      const boot = await attachVerifiedWorkspace(fbUser);
      setDemoPreviewOverride(false);
      pushToast(`Signed in as ${boot.user.firstName}`);
      return {
        ok: true,
        onboardingCompleted: boot.onboardingCompleted,
        role: boot.user.role,
        emailVerified: boot.emailVerified,
        isPlatformAdmin: boot.isPlatformAdmin,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      pushToast('Google sign-in canceled or blocked.', 'error');
      return { ok: false, error: message };
    } finally {
      setAuthBusy(false);
    }
  }, [attachVerifiedWorkspace, pushToast]);

  const signUpWithEmail = useCallback(
    async (params: { email: string; password: string; fullName: string }): Promise<AuthActionResult> => {
      setAuthBusy(true);
      try {
        const fbUser = await fsService.registerWithEmailPassword(params);
        const boot = await attachVerifiedWorkspace(fbUser);
        setDemoPreviewOverride(false);
        pushToast('Verification email sent. Please verify your inbox to continue.', 'info');
        return {
          ok: true,
          onboardingCompleted: false,
          role: boot.user.role,
          emailVerified: fbUser.emailVerified,
          isPlatformAdmin: boot.isPlatformAdmin,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create account.';
        pushToast(message, 'error');
        return { ok: false, error: message };
      } finally {
        setAuthBusy(false);
      }
    },
    [attachVerifiedWorkspace, pushToast],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      setAuthBusy(true);
      try {
        const fbUser = await fsService.signInWithEmailPassword(email, password);
        const boot = await attachVerifiedWorkspace(fbUser);
        setDemoPreviewOverride(false);
        if (boot.emailVerified) {
          pushToast(`Signed in as ${boot.user.firstName}`);
        } else {
          pushToast('Please verify your email address before continuing.', 'info');
        }
        return {
          ok: true,
          onboardingCompleted: boot.onboardingCompleted,
          role: boot.user.role,
          emailVerified: boot.emailVerified,
          isPlatformAdmin: boot.isPlatformAdmin,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid email or password.';
        pushToast('Email sign-in failed. Check your credentials.', 'error');
        return { ok: false, error: message };
      } finally {
        setAuthBusy(false);
      }
    },
    [attachVerifiedWorkspace, pushToast],
  );

  const resendVerificationEmail = useCallback(async () => {
    setAuthBusy(true);
    try {
      await fsService.resendEmailVerification();
      pushToast('Verification link sent to your email.');
      return { ok: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not send verification email.';
      pushToast(msg, 'error');
      return { ok: false, error: msg };
    } finally {
      setAuthBusy(false);
    }
  }, [pushToast]);

  const refreshVerificationState = useCallback(async (): Promise<AuthActionResult> => {
    setAuthBusy(true);
    try {
      const fbUser = await fsService.reloadCurrentUser();
      if (!fbUser) return { ok: false, error: 'Not signed in.' };
      const boot = await attachVerifiedWorkspace(fbUser);
      if (boot.emailVerified) {
        pushToast('Email verified! Workspace unlocked.');
      } else {
        pushToast('Email is not verified yet. Check your inbox and spam folder.', 'info');
      }
      return {
        ok: true,
        onboardingCompleted: boot.onboardingCompleted,
        role: boot.user.role,
        emailVerified: boot.emailVerified,
        isPlatformAdmin: boot.isPlatformAdmin,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not refresh status.';
      return { ok: false, error: msg };
    } finally {
      setAuthBusy(false);
    }
  }, [attachVerifiedWorkspace, pushToast]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      setAuthBusy(true);
      try {
        await fsService.sendPasswordReset(email);
        pushToast('Password reset email sent.');
        return { ok: true };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Could not send password reset email.';
        pushToast(msg, 'error');
        return { ok: false, error: msg };
      } finally {
        setAuthBusy(false);
      }
    },
    [pushToast],
  );

  const deleteMyAccount = useCallback(async () => {
    setAuthBusy(true);
    try {
      const res = await fsService.deleteAccountAndData();
      if (res.ok) {
        setCloudStore(null);
        setIsEmailVerified(false);
        setIsPlatformAdmin(false);
        setDemoPreviewOverride(false);
        writeStoredPendingInvite(undefined);
        pushToast('Account and workspace data deleted.', 'info');
      } else {
        pushToast(res.error || 'Could not delete account.', 'error');
      }
      return res;
    } finally {
      setAuthBusy(false);
    }
  }, [pushToast]);

  const signOutGoogle = useCallback(async () => {
    setAuthBusy(true);
    try {
      await fsService.signOutFirebaseAuth();
      setCloudStore(null);
      setIsEmailVerified(false);
      setIsPlatformAdmin(false);
      setDemoPreviewOverride(false);
      writeStoredPendingInvite(undefined);
      pushToast('Signed out.', 'info');
    } catch {
      pushToast('Could not sign out cleanly.', 'error');
    } finally {
      setAuthBusy(false);
    }
  }, [pushToast]);

  const lookupInviteToken = useCallback(
    async (token: string): Promise<fsService.PublicInviteResolveResult> => {
      const upper = token.trim().toUpperCase();
      const res = await fsService.resolveInvitePublic(upper);
      if (res.invite && res.state !== 'unverified_server') {
        if (isCloudSynced) {
          setCloudStore((prev) => {
            if (!prev) return prev;
            const mergeOne = <T extends { id: string }>(arr: T[], incoming?: T[]): T[] => {
              if (!incoming?.length) return arr;
              const map = new Map(arr.map((i) => [i.id, i]));
              for (const item of incoming) map.set(item.id, item);
              return Array.from(map.values());
            };
            return {
              ...prev,
              invites: mergeOne(prev.invites, res.invite ? [res.invite] : []),
              trainers: mergeOne(prev.trainers, res.trainer ? [res.trainer] : []),
              packages: mergeOne(prev.packages, res.packages),
            };
          });
        }
        return res;
      }

      // Sample demo invites only resolved when not logged into a production cloud workspace (or when matching explicit seed fixture in demo)
      if (!isCloudSynced) {
        const seedMatch = createSeedSnapshot().invites.find((i) => i.token.toUpperCase() === upper);
        if (seedMatch) {
          return {
            source: 'client_fallback',
            state: seedMatch.status,
            invite: seedMatch,
          };
        }
      }

      return res;
    },
    [isCloudSynced],
  );

  const activeUser = useMemo(() => {
    return store.users.find((u) => u.id === store.session.activeUserId) ?? store.users[0];
  }, [store.users, store.session.activeUserId]);

  const todayKey = useMemo(() => {
    return getTodayKey(activeUser?.timezone || 'Asia/Kolkata');
  }, [activeUser?.timezone]);

  const activeClient = useMemo(() => {
    if (store.session.activeRole !== 'client') return undefined;
    return store.clients.find((c) => c.userId === activeUser.id);
  }, [store.clients, store.session.activeRole, activeUser.id]);

  const activeTrainer = useMemo(() => {
    if (store.session.activeRole !== 'trainer') return undefined;
    return store.trainers.find((t) => t.userId === activeUser.id);
  }, [store.trainers, store.session.activeRole, activeUser.id]);

  const activeRelationship = useMemo(() => {
    if (!activeClient) return undefined;
    return store.relationships.find((r) => r.clientId === activeClient.id && r.status === 'active');
  }, [activeClient, store.relationships]);

  const activeCoach = useMemo(() => {
    if (!activeRelationship) return undefined;
    return store.trainers.find((t) => t.id === activeRelationship.trainerId);
  }, [activeRelationship, store.trainers]);

  // Role-scoped selector: Trainer sees ONLY clients with an active coaching relationship linked to them.
  const linkedClientsForActiveTrainer = useMemo(() => {
    if (!activeTrainer) return [];
    const linkedIds = new Set(
      store.relationships
        .filter((r) => r.trainerId === activeTrainer.id && r.status === 'active')
        .map((r) => r.clientId),
    );
    return store.clients.filter((c) => linkedIds.has(c.id));
  }, [activeTrainer, store.relationships, store.clients]);

  const isClientLinkedToActiveTrainer = useCallback(
    (clientId: string) => {
      if (!activeTrainer) return false;
      return store.relationships.some(
        (r) => r.trainerId === activeTrainer.id && r.clientId === clientId && r.status === 'active',
      );
    },
    [activeTrainer, store.relationships],
  );

  const pendingRelationshipsForActiveTrainer = useMemo(() => {
    if (!activeTrainer) return [];
    return store.relationships.filter(
      (r) => r.trainerId === activeTrainer.id && r.status === 'pending',
    );
  }, [activeTrainer, store.relationships]);

  const getClientApprovedRecoveryDates = useCallback(
    (clientId: string) => {
      return dailyActivities
        .filter((d) => d.clientId === clientId && d.recoveryApproved === true)
        .map((d) => d.dateKey);
    },
    [dailyActivities],
  );

  const dismissStreakCelebration = useCallback(() => {
    setCelebrateStreakToday(false);
  }, []);

  const switchDemoPersona = useCallback(
    (userId: string) => {
      const target = localStore.users.find((u) => u.id === userId);
      if (!target) return;
      setDemoPreviewOverride(true);
      persistLocal((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          isAuthenticated: true,
          activeUserId: target.id,
          activeRole: target.role,
          onboardingCompleted: true,
          simulateLoading: false,
          simulateError: false,
        },
      }));
      pushToast(`Previewing ${target.firstName} (${target.role} local demo)`, 'info');
    },
    [localStore.users, persistLocal, pushToast],
  );

  const setDemoSimulationFlags = useCallback(
    (flags: { simulateLoading?: boolean; simulateError?: boolean }) => {
      persist((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          ...flags,
        },
      }));
    },
    [persist],
  );

  const signOutDemo = useCallback(() => {
    if (firebaseUser && !demoPreviewOverride) {
      void signOutGoogle();
      return;
    }
    setDemoPreviewOverride(false);
    persistLocal((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        isAuthenticated: false,
      },
    }));
  }, [firebaseUser, demoPreviewOverride, signOutGoogle, persistLocal]);

  const startDemoAsRole = useCallback(
    (role: UserRole, userId?: string) => {
      setDemoPreviewOverride(true);
      const fallbackUser =
        localStore.users.find((u) => u.id === userId) ??
        localStore.users.find((u) => u.role === role) ??
        localStore.users[0];
      persistLocal((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          isAuthenticated: true,
          activeUserId: fallbackUser.id,
          activeRole: fallbackUser.role,
          onboardingCompleted: true,
        },
      }));
    },
    [localStore.users, persistLocal],
  );

  const exitDemoSandbox = useCallback(() => {
    setDemoPreviewOverride(false);
    persistLocal((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        isAuthenticated: false,
      },
    }));
    pushToast('Exited demo sandbox.', 'info');
  }, [persistLocal, pushToast]);

  const setPendingInviteToken = useCallback(
    (token?: string) => {
      const normalized = token && token.trim() ? token.trim().toUpperCase() : undefined;
      writeStoredPendingInvite(normalized);
      persist((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          pendingInviteToken: normalized,
        },
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(
          fsService.updateUserPrivateState(firebaseUser.uid, { pendingInviteToken: normalized || '' }),
        );
      }
    },
    [persist, isCloudSynced, firebaseUser, runCloudWrite],
  );

  const resetDemoState = useCallback(() => {
    setDemoPreviewOverride(Boolean(firebaseUser));
    const fresh = demoRepository.resetDemo();
    setLocalStore(fresh);
    setCelebrateStreakToday(false);
    pushToast('Local demo data reset to initial fixtures.', 'info');
  }, [firebaseUser, pushToast]);

  const todayHydrationGlasses = useMemo(() => {
    if (!activeClient) return isCloudSynced ? 0 : 5;
    if (isCloudSynced) {
      const match = dailyActivities.find(
        (d) => d.clientId === activeClient.id && d.dateKey === todayKey,
      );
      return match ? Math.max(0, Math.min(24, match.hydrationGlasses)) : 0;
    }
    const key = `fitplus_hydration_${activeClient.id}_${todayKey}`;
    if (key in demoHydrationMap) return demoHydrationMap[key];
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(key);
      const parsed = saved ? Number(saved) : NaN;
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(12, parsed));
    }
    return 5;
  }, [activeClient, isCloudSynced, dailyActivities, todayKey, demoHydrationMap]);

  const setTodayHydrationGlasses = useCallback(
    (glasses: number) => {
      if (!activeClient) return;
      const clamped = Math.max(0, Math.min(12, Math.round(glasses)));
      if (isCloudSynced && firebaseUser) {
        const trainerUserId = activeCoach && !isFixtureId(activeCoach.id) ? activeCoach.userId : '';
        const activityId = `${activeClient.id}_${todayKey}`;
        const now = new Date().toISOString();
        setDailyActivities((prev) => {
          const exists = prev.some((d) => d.id === activityId || (d.clientId === activeClient.id && d.dateKey === todayKey));
          if (exists) {
            return prev.map((d) =>
              d.id === activityId || (d.clientId === activeClient.id && d.dateKey === todayKey)
                ? { ...d, hydrationGlasses: clamped, updatedAt: now }
                : d,
            );
          }
          return [
            ...prev,
            {
              id: activityId,
              clientId: activeClient.id,
              clientUserId: firebaseUser.uid,
              trainerUserId,
              dateKey: todayKey,
              hydrationGlasses: clamped,
              createdAt: now,
              updatedAt: now,
            },
          ];
        });
        runCloudWrite(
          fsService.upsertDailyActivityHydration({
            clientId: activeClient.id,
            clientUserId: firebaseUser.uid,
            trainerUserId,
            dateKey: todayKey,
            hydrationGlasses: clamped,
          }),
          'Could not sync hydration log.',
        );
        return;
      }

      const key = `fitplus_hydration_${activeClient.id}_${todayKey}`;
      setDemoHydrationMap((prev) => ({ ...prev, [key]: clamped }));
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, String(clamped));
      }
    },
    [activeClient, isCloudSynced, firebaseUser, activeCoach, todayKey, runCloudWrite],
  );

  const recordConsent = useCallback(
    async (consentType: ConsentType, granted: boolean) => {
      if (isCloudSynced && firebaseUser) {
        const rec = await fsService.recordConsentInFirestore({
          uid: firebaseUser.uid,
          consentType,
          granted,
        });
        setConsents((prev) => [rec, ...prev]);
        if (consentType === 'terms_privacy') {
          persistCloudOptimistic((prev) => ({
            ...prev,
            users: prev.users.map((u) =>
              u.id === firebaseUser.uid ? { ...u, privacyConsentAccepted: granted } : u,
            ),
          }));
        }
        pushToast('Privacy preference updated.');
        return;
      }
      const now = new Date().toISOString();
      setConsents((prev) => [
        {
          id: uid('cns'),
          userId: activeUser.id,
          consentType,
          granted,
          policyVersion: fsService.CURRENT_POLICY_VERSION,
          createdAt: now,
          updatedAt: now,
        },
        ...prev,
      ]);
      pushToast('Demo privacy preference updated.', 'info');
    },
    [isCloudSynced, firebaseUser, persistCloudOptimistic, pushToast, activeUser.id],
  );

  const submitVerificationRequest = useCallback(
    async (input: { qualificationTitle: string; issuingBody: string; credentialRef?: string }) => {
      if (!activeTrainer || !isCloudSynced || !firebaseUser) {
        pushToast('Sign in with a verified cloud trainer account to submit credentials.', 'info');
        return;
      }
      await fsService.submitTrainerVerificationRequest({
        trainerId: activeTrainer.id,
        trainerUserId: firebaseUser.uid,
        ...input,
      });
      persistCloudOptimistic((prev) => ({
        ...prev,
        trainers: prev.trainers.map((t) =>
          t.id === activeTrainer.id
            ? {
                ...t,
                verificationStatus: 'pending',
                demoVerificationNote: 'Verification under review',
              }
            : t,
        ),
      }));
      pushToast('Verification request submitted for admin review.');
    },
    [activeTrainer, isCloudSynced, firebaseUser, persistCloudOptimistic, pushToast],
  );

  const resolveVerificationRequest = useCallback(
    async (input: { requestId: string; trainerId: string; approve: boolean; reviewNote?: string }) => {
      if (!isPlatformAdmin || !isCloudSynced) {
        pushToast('Platform admin authorization required.', 'error');
        return;
      }
      await fsService.resolveTrainerVerificationRequest(input);
      setVerificationRequests((prev) =>
        prev.map((r) =>
          r.id === input.requestId
            ? {
                ...r,
                status: input.approve ? 'approved' : 'rejected',
                reviewNote: input.reviewNote,
                updatedAt: new Date().toISOString(),
              }
            : r,
        ),
      );
      persistCloudOptimistic((prev) => ({
        ...prev,
        trainers: prev.trainers.map((t) =>
          t.id === input.trainerId
            ? {
                ...t,
                verificationStatus: input.approve ? 'verified' : 'unverified',
                demoVerificationNote: input.approve ? 'Verified coach' : 'Independent FitPlus coach',
              }
            : t,
        ),
      }));
      pushToast(input.approve ? 'Trainer credential approved.' : 'Trainer verification declined.', 'info');
    },
    [isPlatformAdmin, isCloudSynced, persistCloudOptimistic, pushToast],
  );

  const updateTimezone = useCallback(
    (timezone: string) => {
      persist((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === activeUser.id ? { ...u, timezone } : u)),
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.updateUserMetadata(firebaseUser.uid, { timezone }));
      }
      pushToast('Timezone updated.');
    },
    [persist, activeUser.id, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const completeClientOnboarding = useCallback(
    (draft: OnboardingClientDraft) => {
      const useCloud = Boolean(firebaseUser && firebaseUser.emailVerified && !demoPreviewOverride);
      const targetUserId = useCloud && firebaseUser ? firebaseUser.uid : uid('usr');
      const newClientId = uid('cl');
      const now = new Date().toISOString();
      const today = getTodayKey(activeUser.timezone);

      const newUser: User = {
        id: targetUserId,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email:
          useCloud && firebaseUser?.email
            ? firebaseUser.email
            : `${draft.firstName.trim().toLowerCase().replace(/\s+/g, '.')}@demo.fitplus.in`,
        role: 'client',
        timezone: activeUser.timezone || 'Asia/Kolkata',
        locale: 'en-IN',
        isAdultConfirmed: draft.isAdultConfirmed,
        createdAt: now,
      };

      const newClient: ClientProfile = {
        id: newClientId,
        userId: targetUserId,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        age: draft.age,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        targetWeightKg: draft.targetWeightKg,
        primaryGoal: draft.primaryGoal,
        experienceLevel: draft.experienceLevel,
        daysPerWeek: draft.daysPerWeek,
        environment: draft.environment,
        equipment: draft.equipment,
        dietaryPreference: draft.dietaryPreference,
        dietaryNotes: draft.dietaryNotes,
        foodAllergies: draft.foodAllergies,
        healthLimitations: draft.healthLimitations,
        preferredLanguage: draft.preferredLanguage,
        coachingPreferences: draft.coachingPreferences,
        createdAt: now,
      };

      const starterAssignment: Assignment = {
        id: uid('asg'),
        clientId: newClientId,
        title: '20-Minute Starter Walk & Mobility',
        category: 'habit',
        instructions: 'Start simple: take a brisk 20-minute walk and stretch hips and shoulders.',
        durationMinutes: 20,
        dueTime: '8:00 PM',
        completionType: 'checkbox',
        targetLabel: '20 min',
        scheduledDates: [today],
        isOptional: false,
        isRecovery: false,
        hasCustomOverride: false,
        createdAt: now,
      };

      const { workoutPlan, mealPlan } = generateDefaultClientPlans({
        clientId: newClientId,
        goal: draft.primaryGoal,
        dietaryPreference: draft.dietaryPreference,
      });

      const initialProgress: ProgressEvent | undefined = draft.weightKg
        ? {
            id: uid('prg'),
            clientId: newClientId,
            dateKey: today,
            metricType: 'weight',
            label: 'Body weight',
            value: draft.weightKg,
            unit: 'kg',
            note: 'Onboarding starting point',
            createdAt: now,
          }
        : undefined;

      if (useCloud && firebaseUser) {
        setDemoPreviewOverride(false);
        persistCloudOptimistic((prev) => ({
          ...prev,
          users: [newUser],
          clients: [newClient, ...prev.clients],
          assignments: [starterAssignment, ...prev.assignments],
          workoutPlans: [workoutPlan, ...prev.workoutPlans],
          mealPlans: [mealPlan, ...prev.mealPlans],
          progressEvents: initialProgress ? [initialProgress, ...prev.progressEvents] : prev.progressEvents,
          session: {
            ...prev.session,
            isAuthenticated: true,
            activeUserId: targetUserId,
            activeRole: 'client',
            onboardingCompleted: true,
          },
        }));
        runCloudWrite(
          fsService.saveClientOnboardingToFirestore({
            uid: firebaseUser.uid,
            user: { ...newUser, privacyConsentAccepted: true },
            client: newClient,
            starterAssignment,
            workoutPlan,
            mealPlan,
            initialProgress,
          }).then(() =>
            fsService.recordConsentInFirestore({
              uid: firebaseUser.uid,
              consentType: 'terms_privacy',
              granted: true,
            }),
          ),
          'Could not save onboarding profile to Firestore.',
        );
      } else {
        persistLocal((prev) => ({
          ...prev,
          users: [...prev.users, newUser],
          clients: [...prev.clients, newClient],
          assignments: [...prev.assignments, starterAssignment],
          workoutPlans: [...prev.workoutPlans, workoutPlan],
          mealPlans: [...prev.mealPlans, mealPlan],
          progressEvents: initialProgress ? [...prev.progressEvents, initialProgress] : prev.progressEvents,
          session: {
            ...prev.session,
            isAuthenticated: true,
            activeUserId: targetUserId,
            activeRole: 'client',
            onboardingCompleted: true,
          },
        }));
      }

      pushToast(`Welcome to FitPlus, ${newUser.firstName}.`);
    },
    [firebaseUser, demoPreviewOverride, activeUser.timezone, persistCloudOptimistic, persistLocal, runCloudWrite, pushToast],
  );

  const completeTrainerOnboarding = useCallback(
    (draft: OnboardingTrainerDraft) => {
      const useCloud = Boolean(firebaseUser && firebaseUser.emailVerified && !demoPreviewOverride);
      const targetUserId = useCloud && firebaseUser ? firebaseUser.uid : uid('usr');
      const newTrainerId = uid('trn');
      const now = new Date().toISOString();
      const parts = draft.displayName.trim().split(/\s+/);
      const firstName = parts[0] || 'Coach';
      const lastName = parts.slice(1).join(' ');
      const slug =
        draft.displayName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `coach-${Date.now().toString(36)}`;

      const newUser: User = {
        id: targetUserId,
        firstName,
        lastName,
        email: useCloud && firebaseUser?.email ? firebaseUser.email : `${slug}@demo.fitplus.in`,
        role: 'trainer',
        timezone: activeUser.timezone || 'Asia/Kolkata',
        locale: 'en-IN',
        isAdultConfirmed: true,
        createdAt: now,
      };

      const newTrainer: TrainerProfile = {
        id: newTrainerId,
        userId: targetUserId,
        slug,
        displayName: draft.displayName.trim(),
        headline: draft.headline.trim() || `${draft.specialties[0] || 'Personal'} coaching in ${draft.city || 'India'}`,
        bio: draft.bio.trim() || 'Independent fitness coach setting up a storefront on FitPlus.',
        coachingStyle: draft.coachingStyle?.trim() || 'Practical weekly programming and check-ins.',
        city: draft.city.trim() || 'Mumbai',
        coachingMode: draft.coachingMode,
        specialties: draft.specialties.length ? draft.specialties : ['General fitness'],
        languages: draft.languages.length ? draft.languages : ['English', 'Hindi'],
        certifications: draft.certifications?.length ? draft.certifications : undefined,
        whatsappBusinessE164: draft.whatsappBusinessE164?.trim() || undefined,
        experienceYears: Math.max(1, draft.experienceYears || 2),
        avatarKey: 'coachArjun',
        coverKey: 'coachCover',
        verificationStatus: draft.submitVerification ? 'pending' : 'unverified',
        isDemoVerified: false,
        demoVerificationNote: useCloud
          ? draft.submitVerification
            ? 'Verification under review'
            : 'Independent FitPlus coach'
          : 'Unverified demo coach profile',
        demoPhoneLabel: useCloud ? 'In-app coaching only' : 'Demo contact only (disabled)',
        acceptingClients: true,
        isPublished: true,
        createdAt: now,
      };

      const starterPkg: Package = {
        id: uid('pkg'),
        trainerId: newTrainerId,
        name: draft.packageName.trim() || 'Personal Coaching',
        summary: draft.packageSummary.trim() || 'Weekly workout & nutrition guidance with check-ins.',
        priceInr: Math.max(0, draft.packagePriceInr || 999),
        cadence: 'monthly',
        features: ['Personalised weekly plan', 'Daily habit tracking', 'Weekly coach review'],
        status: 'active',
        isDemoSample: !useCloud,
        createdAt: now,
      };

      if (useCloud && firebaseUser) {
        setDemoPreviewOverride(false);
        persistCloudOptimistic((prev) => ({
          ...prev,
          users: [newUser],
          trainers: [newTrainer, ...prev.trainers],
          packages: [starterPkg, ...prev.packages],
          session: {
            ...prev.session,
            isAuthenticated: true,
            activeUserId: targetUserId,
            activeRole: 'trainer',
            onboardingCompleted: true,
          },
        }));
        const persistChain = async () => {
          let photoUrl: string | undefined;
          if (draft.photoFile) {
            const uploaded = await fsService.uploadTrainerPhotoToStorage({
              uid: firebaseUser.uid,
              file: draft.photoFile,
            });
            photoUrl = uploaded.photoUrl;
          }
          await fsService.saveTrainerOnboardingToFirestore({
            uid: firebaseUser.uid,
            user: { ...newUser, privacyConsentAccepted: true },
            trainer: { ...newTrainer, photoUrl },
            starterPackage: starterPkg,
          });
          await fsService.recordConsentInFirestore({
            uid: firebaseUser.uid,
            consentType: 'terms_privacy',
            granted: true,
          });
          if (draft.submitVerification?.qualificationTitle && draft.submitVerification?.issuingBody) {
            await fsService.submitTrainerVerificationRequest({
              trainerId: newTrainerId,
              trainerUserId: firebaseUser.uid,
              qualificationTitle: draft.submitVerification.qualificationTitle,
              issuingBody: draft.submitVerification.issuingBody,
              credentialRef: draft.submitVerification.credentialRef,
            });
          }
        };
        runCloudWrite(persistChain(), 'Could not save trainer studio to Firestore.');
        pushToast('Trainer studio ready.');
      } else {
        persistLocal((prev) => ({
          ...prev,
          users: [...prev.users, newUser],
          trainers: [...prev.trainers, newTrainer],
          packages: [...prev.packages, starterPkg],
          session: {
            ...prev.session,
            isAuthenticated: true,
            activeUserId: targetUserId,
            activeRole: 'trainer',
            onboardingCompleted: true,
          },
        }));
        pushToast('Trainer studio ready (demo).');
      }
    },
    [firebaseUser, demoPreviewOverride, activeUser.timezone, persistCloudOptimistic, persistLocal, runCloudWrite, pushToast],
  );

  const toggleAssignmentCompletion = useCallback(
    (assignmentId: string, dateKey: string, payload?: { loggedValue?: string; notes?: string }) => {
      if (!activeClient) return;

      const existing = store.completions.find(
        (c) => c.assignmentId === assignmentId && c.clientId === activeClient.id && c.dateKey === dateKey,
      );

      const clientAssignments = store.assignments.filter((a) => a.clientId === activeClient.id);
      const clientCompletions = store.completions.filter((c) => c.clientId === activeClient.id);
      const approvedRecovery = getClientApprovedRecoveryDates(activeClient.id);
      const prevDayStatus = computeDayConsistency(
        dateKey,
        clientAssignments,
        clientCompletions,
        todayKey,
        approvedRecovery,
      ).status;

      let nextCompletions: CompletionEvent[];
      let createdEvent: CompletionEvent | undefined;
      if (existing) {
        nextCompletions = store.completions.filter((c) => c.id !== existing.id);
        pushToast('Marked incomplete. Streak recalculated.', 'info');
        if (isCloudSynced) {
          runCloudWrite(fsService.deleteCompletionEventDoc(existing.id));
        }
      } else {
        createdEvent = {
          id: uid('cmp'),
          assignmentId,
          clientId: activeClient.id,
          dateKey,
          completedAt: new Date().toISOString(),
          loggedValue: payload?.loggedValue,
          notes: payload?.notes,
        };
        nextCompletions = [...store.completions, createdEvent];
        if (isCloudSynced && firebaseUser) {
          const trainerUserId = activeCoach && !isFixtureId(activeCoach.id) ? activeCoach.userId : '';
          runCloudWrite(
            fsService.upsertCompletionEventDoc(createdEvent, firebaseUser.uid, trainerUserId, false),
          );
        }
      }

      const nextClientCompletions = nextCompletions.filter((c) => c.clientId === activeClient.id);
      const nextDay = computeDayConsistency(
        dateKey,
        clientAssignments,
        nextClientCompletions,
        todayKey,
        approvedRecovery,
      );
      const reachedComplete =
        (nextDay.status === 'completed' || nextDay.status === 'recovery_completed') &&
        prevDayStatus !== 'completed' &&
        prevDayStatus !== 'recovery_completed';

      const alreadyCelebratedToday = store.session.celebratedDateKeys.includes(dateKey);
      const shouldCelebrate = dateKey === todayKey && reachedComplete && !alreadyCelebratedToday;
      const nextCelebratedKeys = shouldCelebrate
        ? [...store.session.celebratedDateKeys, dateKey]
        : store.session.celebratedDateKeys;

      persist((prev) => ({
        ...prev,
        completions: nextCompletions,
        session: {
          ...prev.session,
          celebratedDateKeys: nextCelebratedKeys,
        },
      }));

      const nextStreakSummary = computeStreakSummary(
        clientAssignments,
        nextClientCompletions,
        todayKey,
        120,
        approvedRecovery,
      );

      if (shouldCelebrate && isCloudSynced && firebaseUser) {
        runCloudWrite(
          fsService.updateUserPrivateState(firebaseUser.uid, {
            celebratedDateKeys: nextCelebratedKeys,
          }),
        );
      }

      if (isCloudSynced && firebaseUser) {
        const trainerUserId = activeCoach && !isFixtureId(activeCoach.id) ? activeCoach.userId : '';
        void getApiSecurityHeaders()
          .then((headers) =>
            fetch('/api/streaks/recalculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ clientId: activeClient.id }),
            }),
          )
          .then(async (res) => {
            if (!res.ok) {
              await fsService.upsertStreakRecordDoc({
                id: activeClient.id,
                clientId: activeClient.id,
                clientUserId: firebaseUser.uid,
                trainerUserId,
                currentStreak: nextStreakSummary.currentStreak,
                longestStreak: nextStreakSummary.longestStreak,
                lastEligibleDateKey: nextStreakSummary.lastEligibleDateKey,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          })
          .catch(() => {
            void fsService
              .upsertStreakRecordDoc({
                id: activeClient.id,
                clientId: activeClient.id,
                clientUserId: firebaseUser.uid,
                trainerUserId,
                currentStreak: nextStreakSummary.currentStreak,
                longestStreak: nextStreakSummary.longestStreak,
                lastEligibleDateKey: nextStreakSummary.lastEligibleDateKey,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
              .catch(() => undefined);
          });
      }

      if (shouldCelebrate) {
        setCelebrateStreakToday(true);
        pushToast(`You showed up today · ${nextStreakSummary.currentStreak} day streak`);
      } else if (!existing) {
        pushToast('Commitment completed.');
      }
    },
    [
      activeClient,
      activeCoach,
      store.completions,
      store.assignments,
      store.session.celebratedDateKeys,
      todayKey,
      isCloudSynced,
      firebaseUser,
      persist,
      runCloudWrite,
      pushToast,
      getClientApprovedRecoveryDates,
    ],
  );

  const saveAssignmentLog = useCallback(
    (assignmentId: string, dateKey: string, loggedValue: string, notes: string) => {
      if (!activeClient) return;
      const existing = store.completions.find(
        (c) => c.assignmentId === assignmentId && c.clientId === activeClient.id && c.dateKey === dateKey,
      );
      if (existing) {
        const updated: CompletionEvent = { ...existing, loggedValue, notes };
        persist((prev) => ({
          ...prev,
          completions: prev.completions.map((c) => (c.id === existing.id ? updated : c)),
        }));
        if (isCloudSynced && firebaseUser) {
          const trainerUserId = activeCoach && !isFixtureId(activeCoach.id) ? activeCoach.userId : '';
          runCloudWrite(
            fsService.upsertCompletionEventDoc(updated, firebaseUser.uid, trainerUserId, true),
          );
        }
        pushToast('Session log updated.');
      } else {
        toggleAssignmentCompletion(assignmentId, dateKey, { loggedValue, notes });
      }
    },
    [
      activeClient,
      activeCoach,
      store.completions,
      persist,
      isCloudSynced,
      firebaseUser,
      runCloudWrite,
      pushToast,
      toggleAssignmentCompletion,
    ],
  );

  const addProgressMeasurement = useCallback(
    async (input: {
      dateKey: string;
      metricType: 'weight' | 'strength' | 'waist' | 'steps' | 'checkin';
      label: string;
      value: number;
      unit: string;
      note?: string;
      photoFile?: File | null;
      shareWithTrainer?: boolean;
    }) => {
      if (!activeClient) return;
      const trainerUserId = activeCoach && !isFixtureId(activeCoach.id) ? activeCoach.userId : '';
      let photoPath: string | undefined;

      if (input.photoFile && isCloudSynced && firebaseUser) {
        try {
          const uploaded = await fsService.uploadProgressPhotoToStorage({
            uid: firebaseUser.uid,
            file: input.photoFile,
            shareWithTrainer: Boolean(input.shareWithTrainer && trainerUserId),
            authorizedTrainerUid: trainerUserId || undefined,
          });
          photoPath = uploaded.photoPath;
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Unable to upload progress photo.', 'error');
          return;
        }
      }

      const event: ProgressEvent = {
        id: uid('prg'),
        clientId: activeClient.id,
        dateKey: input.dateKey,
        metricType: input.metricType,
        label: input.label,
        value: input.value,
        unit: input.unit,
        note: input.note,
        photoPath,
        shareWithTrainer: photoPath ? Boolean(input.shareWithTrainer) : undefined,
        createdAt: new Date().toISOString(),
      };
      persist((prev) => ({
        ...prev,
        progressEvents: [...prev.progressEvents, event],
        clients:
          input.metricType === 'weight'
            ? prev.clients.map((c) => (c.id === activeClient.id ? { ...c, weightKg: input.value } : c))
            : prev.clients,
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(
          fsService.createProgressEventDoc(
            event,
            firebaseUser.uid,
            trainerUserId,
            input.metricType === 'weight' ? input.value : undefined,
          ),
        );
      }
      pushToast(photoPath ? 'Check-in photo & log saved.' : 'Measurement saved.');
    },
    [activeClient, activeCoach, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const toggleProgressPhotoShare = useCallback(
    async (eventId: string, shareWithTrainer: boolean) => {
      const target = store.progressEvents.find((p) => p.id === eventId);
      if (!target) return;
      persist((prev) => ({
        ...prev,
        progressEvents: prev.progressEvents.map((p) =>
          p.id === eventId ? { ...p, shareWithTrainer } : p,
        ),
      }));
      if (isCloudSynced && firebaseUser) {
        const trainerUserId = activeCoach && !isFixtureId(activeCoach.id) ? activeCoach.userId : '';
        try {
          if (target.photoPath) {
            await fsService.updateProgressPhotoShareMetadata({
              photoPath: target.photoPath,
              shareWithTrainer,
              authorizedTrainerUid: trainerUserId || undefined,
            });
          }
          await fsService.updateProgressEventShareDoc(eventId, shareWithTrainer);
          pushToast(shareWithTrainer ? 'Shared with your active coach.' : 'Photo set to private.', 'info');
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Unable to update sharing preference.', 'error');
        }
      }
    },
    [store.progressEvents, persist, isCloudSynced, firebaseUser, activeCoach, pushToast],
  );

  const enrollWithCoachPackage = useCallback(
    (trainerId: string, pkg: Package) => {
      if (!activeClient) return;
      const trainer = store.trainers.find((t) => t.id === trainerId);
      const endedRelationshipIds = store.relationships
        .filter((r) => r.clientId === activeClient.id && r.status === 'active')
        .map((r) => r.id);
      const endedEnrollmentIds = store.enrollments
        .filter((e) => e.clientId === activeClient.id && e.status === 'active')
        .map((e) => e.id);

      const { relationships, enrollments: rawEnrollments } = createDemoEnrollmentState({
        clientId: activeClient.id,
        trainerId,
        pkg,
        existingRelationships: store.relationships,
        existingEnrollments: store.enrollments,
      });
      const enrollments = rawEnrollments.map((e, idx) =>
        idx === rawEnrollments.length - 1 ? { ...e, isDemoCheckout: !isCloudSynced } : e,
      );

      const hasWorkoutPlan = store.workoutPlans.some((w) => w.clientId === activeClient.id && w.trainerId === trainerId);
      const generated = hasWorkoutPlan
        ? null
        : generateDefaultClientPlans({
            clientId: activeClient.id,
            trainerId,
            goal: activeClient.primaryGoal,
            dietaryPreference: activeClient.dietaryPreference,
          });

      persist((prev) => ({
        ...prev,
        relationships,
        enrollments,
        workoutPlans: generated ? [...prev.workoutPlans, generated.workoutPlan] : prev.workoutPlans,
        mealPlans: generated ? [...prev.mealPlans, generated.mealPlan] : prev.mealPlans,
      }));

      if (isCloudSynced && firebaseUser && trainer && !isFixtureId(trainer.id) && !isFixtureId(pkg.id)) {
        const latestRel = relationships[relationships.length - 1];
        const latestEnr = enrollments[enrollments.length - 1];
        runCloudWrite(
          fsService.enrollWithTrainerPackageInFirestore({
            clientId: activeClient.id,
            clientUserId: firebaseUser.uid,
            trainerId: trainer.id,
            trainerUserId: trainer.userId,
            pkg,
            relationship: latestRel,
            enrollment: latestEnr,
            endedRelationshipIds: endedRelationshipIds.filter((id) => !isFixtureId(id)),
            endedEnrollmentIds: endedEnrollmentIds.filter((id) => !isFixtureId(id)),
            generatedWorkoutPlan: generated?.workoutPlan,
            generatedMealPlan: generated?.mealPlan,
          }),
        );
        pushToast(`Connected with ${trainer.displayName}.`);
      } else {
        pushToast("You're connected in this demo.");
      }
    },
    [
      activeClient,
      store.trainers,
      store.relationships,
      store.enrollments,
      store.workoutPlans,
      persist,
      isCloudSynced,
      firebaseUser,
      runCloudWrite,
      pushToast,
    ],
  );

  const acceptDemoInviteAndPackage = useCallback(
    (inviteToken: string, pkg: Package) => {
      if (!activeClient) return;
      const inv = store.invites.find((i) => i.token.toUpperCase() === inviteToken.toUpperCase());
      if (!inv) return;
      const trainer = store.trainers.find((t) => t.id === inv.trainerId);
      const endedRelationshipIds = store.relationships
        .filter((r) => r.clientId === activeClient.id && r.status === 'active')
        .map((r) => r.id);
      const endedEnrollmentIds = store.enrollments
        .filter((e) => e.clientId === activeClient.id && e.status === 'active')
        .map((e) => e.id);

      const { relationships, enrollments: rawEnrollments } = createDemoEnrollmentState({
        clientId: activeClient.id,
        trainerId: inv.trainerId,
        pkg,
        existingRelationships: store.relationships,
        existingEnrollments: store.enrollments,
      });
      const enrollments = rawEnrollments.map((e, idx) =>
        idx === rawEnrollments.length - 1 ? { ...e, isDemoCheckout: !isCloudSynced } : e,
      );

      const hasWorkoutPlan = store.workoutPlans.some(
        (w) => w.clientId === activeClient.id && w.trainerId === inv.trainerId,
      );
      const generated = hasWorkoutPlan
        ? null
        : generateDefaultClientPlans({
            clientId: activeClient.id,
            trainerId: inv.trainerId,
            goal: activeClient.primaryGoal,
            dietaryPreference: activeClient.dietaryPreference,
          });

      writeStoredPendingInvite(undefined);
      persist((prev) => ({
        ...prev,
        invites: prev.invites.map((i) =>
          i.id === inv.id ? { ...i, status: 'redeemed', redeemedByClientId: activeClient.id } : i,
        ),
        relationships,
        enrollments,
        workoutPlans: generated ? [...prev.workoutPlans, generated.workoutPlan] : prev.workoutPlans,
        mealPlans: generated ? [...prev.mealPlans, generated.mealPlan] : prev.mealPlans,
        session: {
          ...prev.session,
          pendingInviteToken: undefined,
        },
      }));

      if (isCloudSynced && firebaseUser && trainer && !isFixtureId(trainer.id) && !isFixtureId(pkg.id)) {
        const latestRel = relationships[relationships.length - 1];
        const latestEnr = enrollments[enrollments.length - 1];
        runCloudWrite(
          fsService.enrollWithTrainerPackageInFirestore({
            clientId: activeClient.id,
            clientUserId: firebaseUser.uid,
            trainerId: trainer.id,
            trainerUserId: trainer.userId,
            pkg,
            relationship: latestRel,
            enrollment: latestEnr,
            endedRelationshipIds: endedRelationshipIds.filter((id) => !isFixtureId(id)),
            endedEnrollmentIds: endedEnrollmentIds.filter((id) => !isFixtureId(id)),
            redeemInviteId: !isFixtureId(inv.id) && !inv.id.startsWith('inv_fit_') ? inv.id : undefined,
            generatedWorkoutPlan: generated?.workoutPlan,
            generatedMealPlan: generated?.mealPlan,
          }),
        );
        runCloudWrite(fsService.updateUserPrivateState(firebaseUser.uid, { pendingInviteToken: '' }));
        pushToast(`Connected with ${trainer.displayName}.`);
      } else {
        pushToast("You're connected in this demo.");
      }
    },
    [
      activeClient,
      store.invites,
      store.trainers,
      store.relationships,
      store.enrollments,
      store.workoutPlans,
      persist,
      isCloudSynced,
      firebaseUser,
      runCloudWrite,
      pushToast,
    ],
  );

  const rejectInvite = useCallback(
    (inviteToken: string) => {
      persist((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          pendingInviteToken:
            prev.session.pendingInviteToken?.toUpperCase() === inviteToken.toUpperCase()
              ? undefined
              : prev.session.pendingInviteToken,
        },
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.updateUserPrivateState(firebaseUser.uid, { pendingInviteToken: '' }));
      }
      pushToast('Invitation declined.', 'info');
    },
    [persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const requestCoachConnection = useCallback(
    async (trainerId: string, packageId?: string): Promise<{ ok: boolean; error?: string }> => {
      if (!activeClient) return { ok: false, error: 'Complete client onboarding first.' };
      const trainer =
        store.trainers.find((t) => t.id === trainerId) ||
        publicDirectory.trainers.find((t) => t.id === trainerId);
      if (!trainer) return { ok: false, error: 'Coach profile not found.' };

      const alreadyPending = store.relationships.some(
        (r) =>
          r.clientId === activeClient.id &&
          r.trainerId === trainerId &&
          (r.status === 'pending' || r.status === 'active'),
      );
      if (alreadyPending) {
        pushToast('You already have a pending or active connection with this coach.', 'info');
        return { ok: false, error: 'Connection request already exists.' };
      }

      const rel: CoachingRelationship = {
        id: uid('rel'),
        trainerId,
        clientId: activeClient.id,
        packageId,
        status: 'pending',
        startedAt: new Date().toISOString(),
      };

      persist((prev) => ({
        ...prev,
        relationships: [rel, ...prev.relationships],
      }));

      if (isCloudSynced && firebaseUser && !isFixtureId(trainer.id)) {
        try {
          await fsService.createPendingRelationshipDoc({
            relationshipId: rel.id,
            trainerId: trainer.id,
            trainerUserId: trainer.userId,
            clientId: activeClient.id,
            clientUserId: firebaseUser.uid,
            packageId,
          });
          pushToast(`Coaching request sent to ${trainer.displayName}.`);
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Could not send coaching request.';
          pushToast(msg, 'error');
          return { ok: false, error: msg };
        }
      }

      pushToast(`Coaching request sent to ${trainer.displayName} (demo).`);
      return { ok: true };
    },
    [activeClient, store.trainers, store.relationships, publicDirectory.trainers, persist, isCloudSynced, firebaseUser, pushToast],
  );

  const disconnectActiveCoach = useCallback(() => {
    if (!activeClient) return;
    const now = new Date().toISOString();
    const activeRelIds = store.relationships
      .filter((r) => r.clientId === activeClient.id && r.status === 'active')
      .map((r) => r.id);
    const activeEnrIds = store.enrollments
      .filter((e) => e.clientId === activeClient.id && e.status === 'active')
      .map((e) => e.id);

    persist((prev) => ({
      ...prev,
      relationships: prev.relationships.map((r) =>
        r.clientId === activeClient.id && r.status === 'active'
          ? { ...r, status: 'ended', endedAt: now }
          : r,
      ),
      enrollments: prev.enrollments.map((e) =>
        e.clientId === activeClient.id && e.status === 'active'
          ? { ...e, status: 'ended', endedAt: now }
          : e,
      ),
    }));

    if (isCloudSynced && firebaseUser) {
      runCloudWrite(
        fsService.disconnectCoachInFirestore({
          clientId: activeClient.id,
          relationshipIds: activeRelIds.filter((id) => !isFixtureId(id)),
          enrollmentIds: activeEnrIds.filter((id) => !isFixtureId(id)),
        }),
      );
    }

    pushToast('Coaching relationship ended.', 'info');
  }, [activeClient, store.relationships, store.enrollments, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast]);

  const bookSlot = useCallback(
    (slotId: string, topic: string) => {
      if (!activeClient) return { ok: false, error: 'Client profile required.' };
      const targetSlot = store.consultationSlots.find((s) => s.id === slotId);
      const res = attemptBookConsultationSlot({
        slotId,
        clientId: activeClient.id,
        topic,
        slots: store.consultationSlots,
        bookings: store.bookings,
      });
      if (!res.ok) {
        const errorMsg =
          res.reason === 'duplicate'
            ? 'That slot already has an active booking.'
            : 'That slot is no longer available.';
        pushToast(errorMsg, 'error');
        return { ok: false, error: errorMsg };
      }

      const bookingWithLink: Booking = targetSlot?.meetingLink
        ? { ...res.booking, meetingLink: targetSlot.meetingLink }
        : res.booking;

      persist((prev) => ({
        ...prev,
        consultationSlots: res.slots,
        bookings: [...prev.bookings, bookingWithLink],
      }));

      const trainer = store.trainers.find((t) => t.id === bookingWithLink.trainerId);
      if (isCloudSynced && firebaseUser && trainer && !isFixtureId(trainer.id)) {
        runCloudWrite(
          fsService.bookSlotInFirestore({
            booking: bookingWithLink,
            clientUserId: firebaseUser.uid,
            trainerUserId: trainer.userId,
          }),
        );
      }

      pushToast('Consultation booked.');
      return { ok: true };
    },
    [
      activeClient,
      store.consultationSlots,
      store.bookings,
      store.trainers,
      persist,
      isCloudSynced,
      firebaseUser,
      runCloudWrite,
      pushToast,
    ],
  );

  const rescheduleBooking = useCallback(
    (bookingId: string, newSlotId: string) => {
      const oldBooking = store.bookings.find((b) => b.id === bookingId);
      const res = rescheduleConsultationBooking({
        bookingId,
        newSlotId,
        slots: store.consultationSlots,
        bookings: store.bookings,
      });
      if (!res.ok) {
        pushToast(res.reason, 'error');
        return { ok: false, error: res.reason };
      }
      persist((prev) => ({
        ...prev,
        consultationSlots: res.slots,
        bookings: res.bookings,
      }));

      const newBooking = res.bookings[res.bookings.length - 1];
      const trainer = store.trainers.find((t) => t.id === newBooking.trainerId);
      if (isCloudSynced && firebaseUser && oldBooking && trainer && !isFixtureId(trainer.id)) {
        runCloudWrite(
          fsService.rescheduleBookingInFirestore({
            oldBooking,
            newBooking,
            clientUserId: firebaseUser.uid,
            trainerUserId: trainer.userId,
          }),
        );
      }

      pushToast('Consultation rescheduled.');
      return { ok: true };
    },
    [
      store.consultationSlots,
      store.bookings,
      store.trainers,
      persist,
      isCloudSynced,
      firebaseUser,
      runCloudWrite,
      pushToast,
    ],
  );

  const cancelBooking = useCallback(
    (bookingId: string) => {
      const target = store.bookings.find((b) => b.id === bookingId);
      if (!target) return;
      persist((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'canceled', updatedAt: new Date().toISOString() } : b,
        ),
        consultationSlots: prev.consultationSlots.map((s) =>
          s.id === target.slotId ? { ...s, status: 'available' } : s,
        ),
      }));

      if (isCloudSynced && firebaseUser && !target.id.startsWith('bk_demo')) {
        runCloudWrite(fsService.cancelBookingInFirestore(target));
      }

      pushToast('Booking canceled.', 'info');
    },
    [store.bookings, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const updateClientDetails = useCallback(
    (updates: Partial<ClientProfile>) => {
      if (!activeClient) return;
      persist((prev) => ({
        ...prev,
        clients: prev.clients.map((c) => (c.id === activeClient.id ? { ...c, ...updates } : c)),
        users:
          updates.firstName || updates.lastName
            ? prev.users.map((u) =>
                u.id === activeUser.id
                  ? {
                      ...u,
                      firstName: updates.firstName ?? u.firstName,
                      lastName: updates.lastName ?? u.lastName,
                    }
                  : u,
              )
            : prev.users,
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.updateClientProfileDoc(activeClient.id, updates));
        if (updates.firstName || updates.lastName) {
          runCloudWrite(
            fsService.updateUserMetadata(firebaseUser.uid, {
              firstName: updates.firstName,
              lastName: updates.lastName,
            }),
          );
        }
      }
      pushToast('Changes saved.');
    },
    [activeClient, activeUser.id, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const createInvite = useCallback(
    (clientLabel: string, suggestedPackageId?: string) => {
      const trainerId = activeTrainer?.id ?? 'trn_arjun';
      const token = generateCryptoInviteToken('FIT');
      const now = new Date().toISOString();
      const inv: Invite = {
        id: isCloudSynced ? token : uid('inv'),
        token,
        trainerId,
        clientEmailOrLabel: clientLabel.trim() || 'New client',
        suggestedPackageId,
        status: 'active',
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        createdAt: now,
      };
      persist((prev) => ({
        ...prev,
        invites: [inv, ...prev.invites],
      }));
      if (isCloudSynced && firebaseUser && activeTrainer) {
        runCloudWrite(fsService.createInviteDoc(inv, firebaseUser.uid));
      }
      pushToast(isCloudSynced ? 'Invite created & synced.' : 'Demo invite created.');
      return inv;
    },
    [activeTrainer, isCloudSynced, firebaseUser, persist, runCloudWrite, pushToast],
  );

  const revokeInvite = useCallback(
    (inviteId: string) => {
      persist((prev) => ({
        ...prev,
        invites: prev.invites.map((i) => (i.id === inviteId ? { ...i, status: 'revoked' } : i)),
      }));
      if (isCloudSynced && firebaseUser && !inviteId.startsWith('inv_fit_')) {
        runCloudWrite(fsService.revokeInviteDoc(inviteId));
      }
      pushToast('Invite revoked.', 'info');
    },
    [persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const createClientGroup = useCallback(
    (input: { name: string; description?: string }) => {
      if (!activeTrainer) return;
      const cleanName = input.name.trim();
      if (!cleanName) return;
      const now = new Date().toISOString();
      const group: ClientGroup = {
        id: uid('grp'),
        trainerId: activeTrainer.id,
        trainerUserId: firebaseUser?.uid || activeTrainer.userId,
        name: cleanName.slice(0, 80),
        description: input.description?.trim().slice(0, 300) || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setClientGroups((prev) => [group, ...prev]);
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.createClientGroupDoc(group));
      }
      pushToast(`Group "${group.name}" created.`);
    },
    [activeTrainer, firebaseUser, isCloudSynced, runCloudWrite, pushToast],
  );

  const deleteClientGroup = useCallback(
    (groupId: string) => {
      setClientGroups((prev) => prev.filter((g) => g.id !== groupId));
      setClientGroupMembers((prev) => prev.filter((m) => m.groupId !== groupId));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.deleteClientGroupDoc(groupId));
      }
      pushToast('Group removed.', 'info');
    },
    [isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const toggleClientGroupMember = useCallback(
    (groupId: string, clientId: string) => {
      if (!activeTrainer) return;
      const client = store.clients.find((c) => c.id === clientId);
      if (!client) return;
      const exists = clientGroupMembers.some((m) => m.groupId === groupId && m.clientId === clientId);
      if (exists) {
        setClientGroupMembers((prev) =>
          prev.filter((m) => !(m.groupId === groupId && m.clientId === clientId)),
        );
        if (isCloudSynced && firebaseUser) {
          runCloudWrite(fsService.removeClientFromGroupDoc(groupId, clientId));
        }
        pushToast('Removed from group.', 'info');
      } else {
        const member: ClientGroupMember = {
          groupId,
          clientId,
          clientUserId: client.userId,
          trainerUserId: firebaseUser?.uid || activeTrainer.userId,
          addedAt: new Date().toISOString(),
        };
        setClientGroupMembers((prev) => [...prev, member]);
        if (isCloudSynced && firebaseUser) {
          runCloudWrite(fsService.addClientToGroupDoc(member));
        }
        pushToast('Added to group.');
      }
    },
    [activeTrainer, store.clients, clientGroupMembers, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const respondPendingRelationship = useCallback(
    async (
      relationshipId: string,
      action: 'accept' | 'decline',
    ): Promise<{ ok: boolean; error?: string }> => {
      const target = store.relationships.find((r) => r.id === relationshipId);
      if (!target) return { ok: false, error: 'Request not found.' };

      if (isCloudSynced && firebaseUser) {
        try {
          const headers = await getApiSecurityHeaders();
          const res = await fetch('/api/relationships/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ relationshipId, action }),
          });
          const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (!res.ok || !data.ok) {
            const errMsg = data.error || 'Unable to process coaching request.';
            pushToast(errMsg, 'error');
            return { ok: false, error: errMsg };
          }
          persistCloudOptimistic((prev) => ({
            ...prev,
            relationships: prev.relationships.map((r) =>
              r.id === relationshipId
                ? {
                    ...r,
                    status: action === 'accept' ? 'active' : 'ended',
                    endedAt: action === 'decline' ? new Date().toISOString() : r.endedAt,
                  }
                : r,
            ),
          }));
          pushToast(action === 'accept' ? 'Client accepted into your roster.' : 'Request declined.', 'info');
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Network error.';
          pushToast(msg, 'error');
          return { ok: false, error: msg };
        }
      }

      persist((prev) => ({
        ...prev,
        relationships: prev.relationships.map((r) =>
          r.id === relationshipId
            ? {
                ...r,
                status: action === 'accept' ? 'active' : 'ended',
                endedAt: action === 'decline' ? new Date().toISOString() : r.endedAt,
              }
            : r,
        ),
      }));
      pushToast(action === 'accept' ? 'Client accepted (demo).' : 'Request declined (demo).', 'info');
      return { ok: true };
    },
    [store.relationships, isCloudSynced, firebaseUser, persistCloudOptimistic, persist, pushToast],
  );

  const toggleClientRecoveryDay = useCallback(
    async (clientId: string, dateKey: string, approved: boolean) => {
      const client = store.clients.find((c) => c.id === clientId);
      if (!client || !activeTrainer) return;
      const activityId = `${clientId}_${dateKey}`;
      const now = new Date().toISOString();

      setDailyActivities((prev) => {
        const exists = prev.some((d) => d.id === activityId || (d.clientId === clientId && d.dateKey === dateKey));
        if (exists) {
          return prev.map((d) =>
            d.id === activityId || (d.clientId === clientId && d.dateKey === dateKey)
              ? { ...d, recoveryApproved: approved, updatedAt: now }
              : d,
          );
        }
        return [
          ...prev,
          {
            id: activityId,
            clientId,
            clientUserId: client.userId,
            trainerUserId: activeTrainer.userId,
            dateKey,
            hydrationGlasses: 0,
            recoveryApproved: approved,
            createdAt: now,
            updatedAt: now,
          },
        ];
      });

      if (isCloudSynced && firebaseUser) {
        try {
          const headers = await getApiSecurityHeaders();
          const res = await fetch('/api/streaks/recalculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({
              clientId,
              recoveryDay: { dateKey, approved },
            }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            pushToast(body.error || 'Could not update recovery day on server.', 'error');
            return;
          }
        } catch {
          pushToast('Could not reach streak service.', 'error');
          return;
        }
      }

      pushToast(
        approved
          ? `Approved rest/recovery day for ${dateKey}. Streak preserved.`
          : `Recovery approval removed for ${dateKey}.`,
        'info',
      );
    },
    [store.clients, activeTrainer, isCloudSynced, firebaseUser, pushToast],
  );

  const runBulkAssignment = useCallback(
    (input: Omit<BulkAssignInput, 'trainerId' | 'existingAssignments'>) => {
      if (!activeTrainer) return { createdCount: 0, skippedCount: 0 };
      const clientUserIdMap: Record<string, string> = {};
      for (const c of store.clients) {
        clientUserIdMap[c.id] = c.userId;
      }

      const { created, skippedClientIds, notifications } = buildBulkAssignments(
        {
          ...input,
          trainerId: activeTrainer.id,
          existingAssignments: store.assignments,
        },
        clientUserIdMap,
      );

      persist((prev) => ({
        ...prev,
        assignments: [...prev.assignments, ...created],
        notifications: [...notifications, ...prev.notifications],
      }));

      if (isCloudSynced && firebaseUser && created.length > 0) {
        const assignmentPayloads = created.map((item) => ({
          item,
          clientUserId: clientUserIdMap[item.clientId] || '',
        }));
        const notifPayloads = notifications.map((item, idx) => ({
          item,
          relatedClientId: created[idx]?.clientId || '',
        }));
        runCloudWrite(
          fsService.createBulkAssignmentsAndNotifications({
            assignments: assignmentPayloads,
            notifications: notifPayloads,
            trainerUserId: firebaseUser.uid,
          }),
        );
      }

      pushToast(
        created.length > 0
          ? `Assigned to ${created.length} client${created.length === 1 ? '' : 's'}${skippedClientIds.length ? ` (${skippedClientIds.length} duplicate skipped)` : ''}.`
          : 'No new assignments created (duplicates skipped).',
        created.length > 0 ? 'success' : 'info',
      );
      return { createdCount: created.length, skippedCount: skippedClientIds.length };
    },
    [
      activeTrainer,
      store.clients,
      store.assignments,
      persist,
      isCloudSynced,
      firebaseUser,
      runCloudWrite,
      pushToast,
    ],
  );

  const saveTemplate = useCallback(
    (tpl: Omit<TaskTemplate, 'id' | 'trainerId' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      if (!activeTrainer) return;
      const now = new Date().toISOString();
      if (tpl.id) {
        const existing = store.templates.find((t) => t.id === tpl.id);
        const updated: TaskTemplate = {
          ...(existing ?? {
            id: tpl.id,
            trainerId: activeTrainer.id,
            createdAt: now,
          }),
          ...tpl,
          id: tpl.id,
          trainerId: activeTrainer.id,
          updatedAt: now,
        };
        persist((prev) => ({
          ...prev,
          templates: prev.templates.map((t) => (t.id === tpl.id ? updated : t)),
        }));
        if (isCloudSynced && firebaseUser) {
          runCloudWrite(fsService.upsertTaskTemplateDoc(updated, firebaseUser.uid, true));
        }
        pushToast('Template updated.');
      } else {
        const created: TaskTemplate = {
          ...tpl,
          id: uid('tpl'),
          trainerId: activeTrainer.id,
          createdAt: now,
          updatedAt: now,
        };
        persist((prev) => ({
          ...prev,
          templates: [created, ...prev.templates],
        }));
        if (isCloudSynced && firebaseUser) {
          runCloudWrite(fsService.upsertTaskTemplateDoc(created, firebaseUser.uid, false));
        }
        pushToast('Template created.');
      }
    },
    [activeTrainer, store.templates, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const duplicateTemplate = useCallback(
    (templateId: string) => {
      const source = store.templates.find((t) => t.id === templateId);
      if (!source) return;
      const now = new Date().toISOString();
      const copy: TaskTemplate = {
        ...source,
        id: uid('tpl'),
        title: `${source.title} (Copy)`,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      persist((prev) => ({
        ...prev,
        templates: [copy, ...prev.templates],
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.upsertTaskTemplateDoc(copy, firebaseUser.uid, false));
      }
      pushToast('Template duplicated.');
    },
    [store.templates, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const toggleArchiveTemplate = useCallback(
    (templateId: string) => {
      const source = store.templates.find((t) => t.id === templateId);
      if (!source) return;
      const updated = { ...source, archived: !source.archived, updatedAt: new Date().toISOString() };
      persist((prev) => ({
        ...prev,
        templates: prev.templates.map((t) => (t.id === templateId ? updated : t)),
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.upsertTaskTemplateDoc(updated, firebaseUser.uid, true));
      }
      pushToast('Template status updated.', 'info');
    },
    [store.templates, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const generateAIDraft = useCallback(
    (params: {
      objective: GoalFocus;
      experienceLevel: ExperienceLevel;
      daysPerWeek: number;
      environment: TrainingEnvironment;
      dietaryPreference: DietaryPreference;
      constraints: string;
    }) => {
      const draft = generateDeterministicPlanDraft({
        trainerId: activeTrainer?.id ?? 'trn_arjun',
        ...params,
      });
      persist((prev) => ({
        ...prev,
        aiDrafts: [draft, ...prev.aiDrafts],
      }));
      if (isCloudSynced && firebaseUser && activeTrainer) {
        runCloudWrite(fsService.upsertAIDraftDoc(draft, firebaseUser.uid, false));
      }
      return draft;
    },
    [activeTrainer, isCloudSynced, firebaseUser, persist, runCloudWrite],
  );

  const generateAIPlanWithCopilot = useCallback(
    async (params: {
      objective: GoalFocus;
      experienceLevel: ExperienceLevel;
      daysPerWeek: number;
      environment: TrainingEnvironment;
      dietaryPreference: DietaryPreference;
      constraints: string;
      clientId?: string;
    }): Promise<{ ok: boolean; draft?: AIPlanDraft; error?: string }> => {
      if (!isCloudSynced || !firebaseUser) {
        const draft = generateAIDraft(params);
        return { ok: true, draft };
      }

      try {
        const headers = await getApiSecurityHeaders();
        const res = await fetch('/api/ai/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            ...params,
            trainerId: activeTrainer?.id,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          draft?: AIPlanDraft;
          remainingDailyQuota?: number;
          error?: string;
        };

        if (typeof data.remainingDailyQuota === 'number') {
          setAiQuotaRemaining(data.remainingDailyQuota);
        }

        if (!res.ok || !data.ok || !data.draft) {
          const msg = data.error || 'Gemini AI Copilot could not generate a plan right now.';
          pushToast(msg, 'error');
          return { ok: false, error: msg };
        }

        const createdDraft = data.draft;
        persistCloudOptimistic((prev) => ({
          ...prev,
          aiDrafts: [createdDraft, ...prev.aiDrafts.filter((d) => d.id !== createdDraft.id)],
        }));
        pushToast('Gemini draft ready for your review.');
        return { ok: true, draft: createdDraft };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to reach AI Copilot server.';
        pushToast(msg, 'error');
        return { ok: false, error: msg };
      }
    },
    [isCloudSynced, firebaseUser, activeTrainer?.id, generateAIDraft, persistCloudOptimistic, pushToast],
  );

  const updateAIDraft = useCallback(
    (draft: AIPlanDraft) => {
      const updated = { ...draft, updatedAt: new Date().toISOString() };
      persist((prev) => ({
        ...prev,
        aiDrafts: prev.aiDrafts.map((d) => (d.id === draft.id ? updated : d)),
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.upsertAIDraftDoc(updated, firebaseUser.uid, true));
      }
      pushToast('Draft edits saved.');
    },
    [persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const approveAndSaveAIDraftAsTemplate = useCallback(
    (draftId: string) => {
      const draft = store.aiDrafts.find((d) => d.id === draftId);
      if (!draft || !activeTrainer) return;
      const now = new Date().toISOString();
      const category: TaskCategory = 'workout';
      const newTemplate: TaskTemplate = {
        id: uid('tpl'),
        trainerId: activeTrainer.id,
        title: draft.title,
        category,
        instructions: `${draft.summary}\n\nSessions:\n${draft.workoutDays
          .map((d) => `${d.dayLabel}: ${d.focus} — ${d.sampleSession}`)
          .join('\n')}`,
        durationMinutes: 40,
        completionType: 'session_log',
        targetLabel: `${draft.daysPerWeek} days/week`,
        isRecoveryDefault: false,
        isOptionalDefault: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      const savedDraft: AIPlanDraft = { ...draft, status: 'saved', updatedAt: now };
      persist((prev) => ({
        ...prev,
        aiDrafts: prev.aiDrafts.map((d) => (d.id === draftId ? savedDraft : d)),
        templates: [newTemplate, ...prev.templates],
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.upsertAIDraftDoc(savedDraft, firebaseUser.uid, true));
        runCloudWrite(fsService.upsertTaskTemplateDoc(newTemplate, firebaseUser.uid, false));
      }
      pushToast('Draft approved and saved to Templates.');
    },
    [store.aiDrafts, activeTrainer, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const savePackage = useCallback(
    (pkg: Omit<Package, 'id' | 'trainerId' | 'createdAt' | 'isDemoSample'> & { id?: string }) => {
      if (!activeTrainer) return;
      const now = new Date().toISOString();
      if (pkg.id) {
        const existing = store.packages.find((p) => p.id === pkg.id);
        const updated: Package = {
          ...(existing ?? {
            id: pkg.id,
            trainerId: activeTrainer.id,
            isDemoSample: !isCloudSynced,
            createdAt: now,
          }),
          ...pkg,
          id: pkg.id,
          trainerId: activeTrainer.id,
        };
        persist((prev) => ({
          ...prev,
          packages: prev.packages.map((p) => (p.id === pkg.id ? updated : p)),
        }));
        if (isCloudSynced && firebaseUser) {
          runCloudWrite(fsService.upsertPackageDoc(updated, firebaseUser.uid, true));
        }
        pushToast('Package updated.');
      } else {
        const created: Package = {
          ...pkg,
          id: uid('pkg'),
          trainerId: activeTrainer.id,
          isDemoSample: !isCloudSynced,
          createdAt: now,
        };
        persist((prev) => ({
          ...prev,
          packages: [...prev.packages, created],
        }));
        if (isCloudSynced && firebaseUser) {
          runCloudWrite(fsService.upsertPackageDoc(created, firebaseUser.uid, false));
        }
        pushToast('Package created.');
      }
    },
    [activeTrainer, store.packages, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const togglePackageStatus = useCallback(
    (packageId: string) => {
      const existing = store.packages.find((p) => p.id === packageId);
      if (!existing) return;
      const updated: Package = {
        ...existing,
        status: existing.status === 'active' ? 'paused' : 'active',
      };
      persist((prev) => ({
        ...prev,
        packages: prev.packages.map((p) => (p.id === packageId ? updated : p)),
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.upsertPackageDoc(updated, firebaseUser.uid, true));
      }
      pushToast('Package visibility updated.', 'info');
    },
    [store.packages, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const updateTrainerProfile = useCallback(
    (updates: Partial<TrainerProfile>) => {
      if (!activeTrainer) return;
      persist((prev) => ({
        ...prev,
        trainers: prev.trainers.map((t) => (t.id === activeTrainer.id ? { ...t, ...updates } : t)),
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.updateTrainerProfileDoc(activeTrainer.id, updates));
      }
      pushToast('Storefront profile saved.');
    },
    [activeTrainer, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const addConsultationSlot = useCallback(
    (input: {
      dateKey: string;
      startTime: string;
      endTime: string;
      mode: 'online' | 'in_person';
      meetingLink?: string;
    }) => {
      if (!activeTrainer) return;
      const duplicate = store.consultationSlots.some(
        (s) =>
          s.trainerId === activeTrainer.id &&
          s.dateKey === input.dateKey &&
          s.startTime === input.startTime,
      );
      if (duplicate) {
        pushToast('A slot already exists at that date and time.', 'error');
        return;
      }
      const slot: ConsultationSlot = {
        id: uid('slt'),
        trainerId: activeTrainer.id,
        dateKey: input.dateKey,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: activeUser.timezone || 'Asia/Kolkata',
        mode: input.mode,
        meetingLink: input.meetingLink?.trim() || undefined,
        status: 'available',
      };
      persist((prev) => ({
        ...prev,
        consultationSlots: [...prev.consultationSlots, slot],
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.createConsultationSlotDoc(slot, firebaseUser.uid));
      }
      pushToast('Availability slot added.');
    },
    [
      activeTrainer,
      store.consultationSlots,
      activeUser.timezone,
      persist,
      isCloudSynced,
      firebaseUser,
      runCloudWrite,
      pushToast,
    ],
  );

  const markBookingCompleted = useCallback(
    (bookingId: string, meetingLink?: string) => {
      const target = store.bookings.find((b) => b.id === bookingId);
      if (!target) return;
      const cleanLink = meetingLink !== undefined ? meetingLink.trim() : (target.meetingLink || '');
      const now = new Date().toISOString();
      persist((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) =>
          b.id === bookingId
            ? { ...b, status: 'completed', meetingLink: cleanLink || undefined, updatedAt: now }
            : b,
        ),
      }));
      if (isCloudSynced && firebaseUser && !target.id.startsWith('bk_demo')) {
        runCloudWrite(
          fsService.updateBookingMeetingOrCompleteDoc(bookingId, {
            status: 'completed',
            meetingLink: cleanLink,
          }),
        );
      }
      pushToast('Consultation marked completed.');
    },
    [store.bookings, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const updateConsultationMeetingLink = useCallback(
    (params: { bookingId?: string; slotId?: string; meetingLink: string }) => {
      const cleanLink = params.meetingLink.trim();
      const now = new Date().toISOString();
      if (params.bookingId) {
        persist((prev) => ({
          ...prev,
          bookings: prev.bookings.map((b) =>
            b.id === params.bookingId ? { ...b, meetingLink: cleanLink || undefined, updatedAt: now } : b,
          ),
        }));
        if (isCloudSynced && firebaseUser && !params.bookingId.startsWith('bk_demo')) {
          runCloudWrite(
            fsService.updateBookingMeetingOrCompleteDoc(params.bookingId, {
              meetingLink: cleanLink,
            }),
          );
        }
        pushToast('Session meeting link saved.');
        return;
      }
      if (params.slotId) {
        const slot = store.consultationSlots.find((s) => s.id === params.slotId);
        persist((prev) => ({
          ...prev,
          consultationSlots: prev.consultationSlots.map((s) =>
            s.id === params.slotId ? { ...s, meetingLink: cleanLink || undefined } : s,
          ),
        }));
        if (isCloudSynced && firebaseUser && slot && slot.status !== 'booked') {
          runCloudWrite(
            fsService.updateSlotMeetingLinkDoc(
              params.slotId,
              slot.status === 'blocked' ? 'blocked' : 'available',
              cleanLink,
            ),
          );
        }
        pushToast('Slot meeting link saved.');
      }
    },
    [store.consultationSlots, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const updateClientCoachNotes = useCallback(
    (clientId: string, notes: string) => {
      if (!isClientLinkedToActiveTrainer(clientId)) return;
      persist((prev) => ({
        ...prev,
        clients: prev.clients.map((c) => (c.id === clientId ? { ...c, coachNotes: notes } : c)),
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.updateClientProfileDoc(clientId, { coachNotes: notes }));
      }
      pushToast('Coach notes saved.');
    },
    [isClientLinkedToActiveTrainer, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
  );

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      persist((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        ),
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(fsService.markNotificationReadDoc(notificationId));
      }
    },
    [persist, isCloudSynced, firebaseUser, runCloudWrite],
  );

  const markAllNotificationsRead = useCallback(() => {
    const unreadIds = store.notifications
      .filter((n) => n.recipientUserId === activeUser.id && !n.read)
      .map((n) => n.id);
    persist((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.recipientUserId === activeUser.id ? { ...n, read: true } : n,
      ),
    }));
    if (isCloudSynced && firebaseUser && unreadIds.length > 0) {
      runCloudWrite(fsService.markAllNotificationsReadBatch(unreadIds));
    }
  }, [store.notifications, activeUser.id, persist, isCloudSynced, firebaseUser, runCloudWrite]);

  const reviews = useMemo(() => {
    if (!isCloudSynced) {
      const map = new Map<string, TrainerReview>();
      for (const r of publicDirectory.reviews) map.set(r.id, r);
      for (const r of demoReviews) map.set(r.id, r);
      return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const map = new Map<string, TrainerReview>();
    for (const r of publicDirectory.reviews) map.set(r.id, r);
    for (const r of cloudReviews) map.set(r.id, r);
    return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [isCloudSynced, publicDirectory.reviews, demoReviews, cloudReviews]);

  const createPackageOrder = useCallback(
    async (params: { trainerId: string; packageId: string; inviteId?: string }) => {
      if (!isCloudSynced || !firebaseUser) {
        return { ok: false, error: 'Sign in with a verified account to complete checkout.' };
      }
      try {
        const headers = await getApiSecurityHeaders();
        const res = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            trainerId: params.trainerId,
            packageId: params.packageId,
            clientId: activeClient?.id,
            inviteId: params.inviteId,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          mode?: 'free_enrolled' | 'razorpay_checkout';
          keyId?: string;
          orderId?: string;
          amountPaise?: number;
          amountInr?: number;
          paymentId?: string;
          packageName?: string;
          trainerName?: string;
          invoiceNumber?: string;
          error?: string;
          code?: string;
        };
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Checkout could not be started.', code: data.code };
        }
        return {
          ok: true,
          mode: data.mode,
          keyId: data.keyId,
          orderId: data.orderId,
          amountPaise: data.amountPaise,
          amountInr: data.amountInr,
          paymentId: data.paymentId,
          packageName: data.packageName,
          trainerName: data.trainerName,
          invoiceNumber: data.invoiceNumber,
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Unable to reach checkout server.' };
      }
    },
    [isCloudSynced, firebaseUser, activeClient?.id],
  );

  const verifyPackageOrder = useCallback(
    async (params: {
      paymentId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      if (!isCloudSynced || !firebaseUser) {
        return { ok: false, error: 'Authentication required.' };
      }
      try {
        const headers = await getApiSecurityHeaders();
        const res = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(params),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          invoiceNumber?: string;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          pushToast(data.error || 'Payment verification failed.', 'error');
          return { ok: false, error: data.error || 'Payment verification failed.' };
        }
        pushToast(`Enrollment confirmed (${data.invoiceNumber || 'Receipt ready'}).`);
        return { ok: true, invoiceNumber: data.invoiceNumber };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to verify payment.';
        pushToast(msg, 'error');
        return { ok: false, error: msg };
      }
    },
    [isCloudSynced, firebaseUser, pushToast],
  );

  const submitTrainerReview = useCallback(
    async (params: { trainerId: string; rating: number; comment: string }) => {
      if (!activeClient) {
        return { ok: false, error: 'Client profile required to leave a review.' };
      }
      const eligibleRel = findEligibleReviewRelationship(activeClient.id, params.trainerId, store.relationships);
      if (!eligibleRel) {
        return { ok: false, error: 'Only clients who have coached with this trainer can post a verified review.' };
      }
      const trimmedComment = params.comment.trim();
      if (trimmedComment.length < 4) {
        return { ok: false, error: 'Please share at least a few words (4+ characters).' };
      }

      const existing = reviews.find(
        (r) => r.trainerId === params.trainerId && r.clientId === activeClient.id,
      );
      const now = new Date().toISOString();
      const review: TrainerReview = {
        id: existing?.id || uid('rev'),
        trainerId: params.trainerId,
        clientId: activeClient.id,
        clientUserId: activeUser.id,
        relationshipId: existing?.relationshipId || eligibleRel.id,
        authorName: `${activeClient.firstName}${activeClient.lastName ? ` ${activeClient.lastName[0]}.` : ''}`.trim() || 'FitPlus Member',
        rating: Math.min(5, Math.max(1, Math.round(params.rating))),
        comment: trimmedComment.slice(0, 600),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      if (isCloudSynced && firebaseUser) {
        try {
          await fsService.upsertTrainerReviewDoc(review, Boolean(existing));
          setCloudReviews((prev) =>
            existing ? prev.map((r) => (r.id === review.id ? review : r)) : [review, ...prev],
          );
          setPublicDirectory((prev) => ({
            ...prev,
            reviews: existing
              ? prev.reviews.map((r) => (r.id === review.id ? review : r))
              : [review, ...prev.reviews],
          }));
          pushToast(existing ? 'Your verified review was updated.' : 'Verified review published.');
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unable to save review.';
          pushToast(msg, 'error');
          return { ok: false, error: msg };
        }
      }

      setDemoReviews((prev) =>
        existing ? prev.map((r) => (r.id === review.id ? review : r)) : [review, ...prev],
      );
      pushToast(existing ? 'Review updated (demo).' : 'Review added (demo).');
      return { ok: true };
    },
    [activeClient, activeUser.id, store.relationships, reviews, isCloudSynced, firebaseUser, pushToast],
  );

  const deleteTrainerReview = useCallback(
    async (reviewId: string) => {
      if (isCloudSynced && firebaseUser) {
        try {
          await fsService.deleteTrainerReviewDoc(reviewId);
          setCloudReviews((prev) => prev.filter((r) => r.id !== reviewId));
          setPublicDirectory((prev) => ({
            ...prev,
            reviews: prev.reviews.filter((r) => r.id !== reviewId),
          }));
          pushToast('Review removed.', 'info');
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Unable to delete review.', 'error');
        }
        return;
      }
      setDemoReviews((prev) => prev.filter((r) => r.id !== reviewId));
      pushToast('Review removed (demo).', 'info');
    },
    [isCloudSynced, firebaseUser, pushToast],
  );

  const updateNotificationPrefs = useCallback(
    async (next: NotificationPrefs) => {
      const updated = { ...next, updatedAt: new Date().toISOString() };
      setNotificationPrefs(updated);
      if (isCloudSynced && firebaseUser) {
        try {
          await fsService.updateUserPrivateState(firebaseUser.uid, { notificationPrefs: updated });
          pushToast('Notification preferences saved.');
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Could not save preferences.', 'error');
        }
        return;
      }
      pushToast('Notification preferences updated.');
    },
    [isCloudSynced, firebaseUser, pushToast],
  );

  const fetchAdminOverview = useCallback(async () => {
    if (!isCloudSynced || !firebaseUser) {
      return { ok: false, error: 'Sign in as platform admin to inspect live metrics.' };
    }
    try {
      const headers = await getApiSecurityHeaders();
      const res = await fetch('/api/admin/overview', {
        method: 'GET',
        headers: { ...headers },
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        overview?: AdminOverviewStats;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.overview) {
        return { ok: false, error: data.error || 'Unable to load admin metrics.' };
      }
      return { ok: true, overview: data.overview };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unable to reach admin overview API.' };
    }
  }, [isCloudSynced, firebaseUser]);

  const moderateAdminContent = useCallback(
    async (
      input:
        | { action: 'toggle_trainer_publish'; trainerId: string; isPublished: boolean }
        | { action: 'delete_review'; reviewId: string },
    ) => {
      if (!isCloudSynced || !firebaseUser) {
        return { ok: false, error: 'Verified admin authentication required.' };
      }
      try {
        const headers = await getApiSecurityHeaders();
        const res = await fetch('/api/admin/overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          pushToast(data.error || 'Moderation action failed.', 'error');
          return { ok: false, error: data.error || 'Moderation action failed.' };
        }
        if (input.action === 'delete_review') {
          setCloudReviews((prev) => prev.filter((r) => r.id !== input.reviewId));
          setPublicDirectory((prev) => ({
            ...prev,
            reviews: prev.reviews.filter((r) => r.id !== input.reviewId),
          }));
          pushToast('Review removed.', 'info');
        } else {
          pushToast(input.isPublished ? 'Coach storefront published.' : 'Coach storefront hidden.', 'info');
        }
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Moderation failed.';
        pushToast(msg, 'error');
        return { ok: false, error: msg };
      }
    },
    [isCloudSynced, firebaseUser, pushToast],
  );

  useEffect(() => {
    setCelebrateStreakToday(false);
  }, [activeUser?.id]);

  const value: AppContextValue = {
    store,
    todayKey,
    activeUser,
    activeClient,
    activeTrainer,
    activeRelationship,
    activeCoach,
    linkedClientsForActiveTrainer,
    toasts,
    celebrateStreakToday,
    dismissStreakCelebration,
    pushToast,
    dismissToast,
    isAuthReady,
    firebaseUser,
    isEmailVerified,
    isPlatformAdmin,
    isCloudSynced,
    isDemoSandbox,
    authBusy,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resendVerificationEmail,
    refreshVerificationState,
    sendPasswordReset,
    deleteMyAccount,
    signOutGoogle,
    lookupInviteToken,
    publicDirectory,
    subscriptions,
    payments,
    reviews,
    notificationPrefs,
    todayHydrationGlasses,
    setTodayHydrationGlasses,
    consents,
    recordConsent,
    verificationRequests,
    auditLogs,
    submitVerificationRequest,
    resolveVerificationRequest,
    switchDemoPersona,
    setDemoSimulationFlags,
    signOutDemo,
    startDemoAsRole,
    exitDemoSandbox,
    setPendingInviteToken,
    resetDemoState,
    updateTimezone,
    completeClientOnboarding,
    completeTrainerOnboarding,
    toggleAssignmentCompletion,
    saveAssignmentLog,
    addProgressMeasurement,
    toggleProgressPhotoShare,
    acceptDemoInviteAndPackage,
    rejectInvite,
    enrollWithCoachPackage,
    requestCoachConnection,
    disconnectActiveCoach,
    bookSlot,
    rescheduleBooking,
    cancelBooking,
    updateClientDetails,
    dailyActivities,
    streaks,
    clientGroups,
    clientGroupMembers,
    pendingRelationshipsForActiveTrainer,
    aiQuotaRemaining,
    getClientApprovedRecoveryDates,
    isClientLinkedToActiveTrainer,
    createInvite,
    revokeInvite,
    createClientGroup,
    deleteClientGroup,
    toggleClientGroupMember,
    respondPendingRelationship,
    toggleClientRecoveryDay,
    runBulkAssignment,
    saveTemplate,
    duplicateTemplate,
    toggleArchiveTemplate,
    generateAIDraft,
    generateAIPlanWithCopilot,
    updateAIDraft,
    approveAndSaveAIDraftAsTemplate,
    savePackage,
    togglePackageStatus,
    updateTrainerProfile,
    addConsultationSlot,
    markBookingCompleted,
    updateConsultationMeetingLink,
    updateClientCoachNotes,
    markNotificationRead,
    markAllNotificationsRead,
    createPackageOrder,
    verifyPackageOrder,
    submitTrainerReview,
    deleteTrainerReview,
    updateNotificationPrefs,
    fetchAdminOverview,
    moderateAdminContent,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
