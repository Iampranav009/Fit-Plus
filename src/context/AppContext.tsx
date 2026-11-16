import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import type {
  AIPlanDraft,
  Assignment,
  Booking,
  ClientProfile,
  CoachingRelationship,
  CompletionEvent,
  ConsultationSlot,
  DietaryPreference,
  ExperienceLevel,
  GoalFocus,
  Invite,
  MealPlan,
  Notification,
  Package,
  ProgressEvent,
  StoreSnapshot,
  TaskCategory,
  TaskTemplate,
  TrainerProfile,
  TrainingEnvironment,
  User,
  UserRole,
  WorkoutPlan,
} from '../types/domain';
import { demoRepository } from '../data/repository';
import { createSeedSnapshot, STORE_SCHEMA_VERSION } from '../data/demo/fixtures';
import { auth } from '../lib/firebase';
import * as fsService from '../data/firestoreService';
import { getTodayKey } from '../lib/date';
import {
  attemptBookConsultationSlot,
  buildBulkAssignments,
  createDemoEnrollmentState,
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
  heightCm?: number;
  weightKg?: number;
  primaryGoal: GoalFocus;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  environment: TrainingEnvironment;
  equipment: string[];
  dietaryPreference: DietaryPreference;
  dietaryNotes: string;
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
  packageName: string;
  packagePriceInr: number;
  packageSummary: string;
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

  // Firebase Auth & Cloud Sync State
  isAuthReady: boolean;
  firebaseUser: FirebaseAuthUser | null;
  isCloudSynced: boolean;
  authBusy: boolean;
  signInWithGoogle: () => Promise<{
    ok: boolean;
    onboardingCompleted?: boolean;
    role?: UserRole;
    error?: string;
  }>;
  signOutGoogle: () => Promise<void>;
  lookupInviteToken: (token: string) => Promise<Invite | null>;

  // Demo & Session Controls
  switchDemoPersona: (userId: string) => void;
  setDemoSimulationFlags: (flags: { simulateLoading?: boolean; simulateError?: boolean }) => void;
  signOutDemo: () => void;
  startDemoAsRole: (role: UserRole, userId?: string) => void;
  setPendingInviteToken: (token?: string) => void;
  resetDemoState: () => void;
  updateTimezone: (timezone: string) => void;

  // Onboarding
  completeClientOnboarding: (draft: OnboardingClientDraft) => void;
  completeTrainerOnboarding: (draft: OnboardingTrainerDraft) => void;

  // Client Actions
  toggleAssignmentCompletion: (assignmentId: string, dateKey: string, payload?: { loggedValue?: string; notes?: string }) => void;
  saveAssignmentLog: (assignmentId: string, dateKey: string, loggedValue: string, notes: string) => void;
  addProgressMeasurement: (input: { dateKey: string; metricType: 'weight' | 'strength'; label: string; value: number; unit: string; note?: string }) => void;
  acceptDemoInviteAndPackage: (inviteToken: string, pkg: Package) => void;
  rejectInvite: (inviteToken: string) => void;
  enrollWithCoachPackage: (trainerId: string, pkg: Package) => void;
  disconnectActiveCoach: () => void;
  bookSlot: (slotId: string, topic: string) => { ok: boolean; error?: string };
  rescheduleBooking: (bookingId: string, newSlotId: string) => { ok: boolean; error?: string };
  cancelBooking: (bookingId: string) => void;
  updateClientDetails: (updates: Partial<ClientProfile>) => void;

  // Trainer Actions
  isClientLinkedToActiveTrainer: (clientId: string) => boolean;
  createInvite: (clientLabel: string, suggestedPackageId?: string) => Invite;
  revokeInvite: (inviteId: string) => void;
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
  updateAIDraft: (draft: AIPlanDraft) => void;
  approveAndSaveAIDraftAsTemplate: (draftId: string) => void;
  savePackage: (pkg: Omit<Package, 'id' | 'trainerId' | 'createdAt' | 'isDemoSample'> & { id?: string }) => void;
  togglePackageStatus: (packageId: string) => void;
  updateTrainerProfile: (updates: Partial<TrainerProfile>) => void;
  addConsultationSlot: (input: { dateKey: string; startTime: string; endTime: string; mode: 'online' | 'in_person' }) => void;
  updateClientCoachNotes: (clientId: string, notes: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function createEmptyCloudSnapshot(
  user: User,
  onboardingCompleted: boolean,
  celebratedDateKeys: string[],
  pendingInviteToken?: string,
): StoreSnapshot {
  const seed = createSeedSnapshot();
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
    trainers: seed.trainers,
    clients: [],
    goals: [],
    relationships: [],
    invites: seed.invites,
    packages: seed.packages,
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

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of fallback) map.set(item.id, item);
  for (const item of primary) map.set(item.id, item);
  return Array.from(map.values());
}

function isFixtureId(id?: string): boolean {
  return Boolean(id && (id.startsWith('usr_') || id.startsWith('trn_arjun') || id.startsWith('trn_meera') || id.startsWith('trn_kabir')));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStore, setLocalStore] = useState<StoreSnapshot>(() => demoRepository.loadSnapshot());
  const [cloudStore, setCloudStore] = useState<StoreSnapshot | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [demoPreviewOverride, setDemoPreviewOverride] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [celebrateStreakToday, setCelebrateStreakToday] = useState(false);

  const workspaceUnsubRef = useRef<(() => void) | null>(null);

  const isCloudSynced = Boolean(firebaseUser && cloudStore && !demoPreviewOverride);
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

  // Attach Firebase auth listener & authenticated Firestore workspace listeners
  useEffect(() => {
    const seed = createSeedSnapshot();

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (workspaceUnsubRef.current) {
        workspaceUnsubRef.current();
        workspaceUnsubRef.current = null;
      }

      setFirebaseUser(fbUser);

      if (!fbUser) {
        setCloudStore(null);
        setDemoPreviewOverride(false);
        setIsAuthReady(true);
        return;
      }

      setDemoPreviewOverride(false);
      void fsService
        .ensureUserDocument(fbUser)
        .then((boot) => {
          setCloudStore(
            createEmptyCloudSnapshot(
              boot.user,
              boot.onboardingCompleted,
              boot.celebratedDateKeys,
              boot.pendingInviteToken,
            ),
          );

          workspaceUnsubRef.current = fsService.subscribeAuthenticatedWorkspace(fbUser, (patch) => {
            setCloudStore((prev) => {
              if (!prev) return prev;
              const nextUser = patch.users?.[0] ?? prev.users[0];
              return {
                ...prev,
                users: patch.users ?? prev.users,
                trainers: patch.trainers ? mergeById(patch.trainers, seed.trainers) : prev.trainers,
                packages: patch.packages ? mergeById(patch.packages, seed.packages) : prev.packages,
                clients: patch.clients ?? prev.clients,
                relationships: patch.relationships ?? prev.relationships,
                invites: patch.invites ? mergeById(patch.invites, seed.invites) : prev.invites,
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
          });
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
  }, []);

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

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    try {
      const fbUser = await fsService.signInWithGooglePopup();
      const boot = await fsService.ensureUserDocument(fbUser);
      setDemoPreviewOverride(false);
      pushToast(`Signed in as ${boot.user.firstName}`);
      return {
        ok: true,
        onboardingCompleted: boot.onboardingCompleted,
        role: boot.user.role,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      pushToast('Google sign-in canceled or blocked.', 'error');
      return { ok: false, error: message };
    } finally {
      setAuthBusy(false);
    }
  }, [pushToast]);

  const signOutGoogle = useCallback(async () => {
    setAuthBusy(true);
    try {
      await fsService.signOutFirebaseAuth();
      setCloudStore(null);
      setDemoPreviewOverride(false);
      pushToast('Signed out of Google account.', 'info');
    } catch {
      pushToast('Could not sign out cleanly.', 'error');
    } finally {
      setAuthBusy(false);
    }
  }, [pushToast]);

  const lookupInviteToken = useCallback(
    async (token: string): Promise<Invite | null> => {
      const upper = token.trim().toUpperCase();
      const localMatch = store.invites.find((i) => i.token.toUpperCase() === upper);
      if (localMatch) return localMatch;
      if (!firebaseUser) return null;
      try {
        const fetched = await fsService.fetchInviteDocByToken(upper);
        if (fetched) {
          setCloudStore((prev) =>
            prev
              ? {
                  ...prev,
                  invites: mergeById([fetched], prev.invites),
                }
              : prev,
          );
        }
        return fetched;
      } catch {
        return null;
      }
    },
    [store.invites, firebaseUser],
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

  const setPendingInviteToken = useCallback(
    (token?: string) => {
      persist((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          pendingInviteToken: token,
        },
      }));
      if (isCloudSynced && firebaseUser) {
        runCloudWrite(
          fsService.updateUserPrivateState(firebaseUser.uid, { pendingInviteToken: token || '' }),
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
      const useCloud = Boolean(firebaseUser);
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
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        primaryGoal: draft.primaryGoal,
        experienceLevel: draft.experienceLevel,
        daysPerWeek: draft.daysPerWeek,
        environment: draft.environment,
        equipment: draft.equipment,
        dietaryPreference: draft.dietaryPreference,
        dietaryNotes: draft.dietaryNotes,
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
            user: newUser,
            client: newClient,
            starterAssignment,
            workoutPlan,
            mealPlan,
            initialProgress,
          }),
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
    [firebaseUser, activeUser.timezone, persistCloudOptimistic, persistLocal, runCloudWrite, pushToast],
  );

  const completeTrainerOnboarding = useCallback(
    (draft: OnboardingTrainerDraft) => {
      const useCloud = Boolean(firebaseUser);
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
        coachingStyle: 'Practical weekly programming and check-ins.',
        city: draft.city.trim() || 'Mumbai',
        coachingMode: draft.coachingMode,
        specialties: draft.specialties.length ? draft.specialties : ['General fitness'],
        languages: draft.languages.length ? draft.languages : ['English', 'Hindi'],
        experienceYears: Math.max(1, draft.experienceYears || 2),
        avatarKey: 'coachArjun',
        coverKey: 'coachCover',
        isDemoVerified: false,
        demoVerificationNote: useCloud ? 'Cloud profile · Unverified demo listing' : 'Unverified demo coach profile',
        demoPhoneLabel: 'Demo contact only (disabled)',
        acceptingClients: true,
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
        isDemoSample: true,
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
        runCloudWrite(
          fsService.saveTrainerOnboardingToFirestore({
            uid: firebaseUser.uid,
            user: newUser,
            trainer: newTrainer,
            starterPackage: starterPkg,
          }),
          'Could not save trainer studio to Firestore.',
        );
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
    [firebaseUser, activeUser.timezone, persistCloudOptimistic, persistLocal, runCloudWrite, pushToast],
  );

  const toggleAssignmentCompletion = useCallback(
    (assignmentId: string, dateKey: string, payload?: { loggedValue?: string; notes?: string }) => {
      if (!activeClient) return;

      const existing = store.completions.find(
        (c) => c.assignmentId === assignmentId && c.clientId === activeClient.id && c.dateKey === dateKey,
      );

      const clientAssignments = store.assignments.filter((a) => a.clientId === activeClient.id);
      const clientCompletions = store.completions.filter((c) => c.clientId === activeClient.id);
      const prevDayStatus = computeDayConsistency(dateKey, clientAssignments, clientCompletions, todayKey).status;

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
      const nextDay = computeDayConsistency(dateKey, clientAssignments, nextClientCompletions, todayKey);
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

      if (shouldCelebrate && isCloudSynced && firebaseUser) {
        runCloudWrite(
          fsService.updateUserPrivateState(firebaseUser.uid, {
            celebratedDateKeys: nextCelebratedKeys,
          }),
        );
      }

      if (shouldCelebrate) {
        setCelebrateStreakToday(true);
        const streak = computeStreakSummary(clientAssignments, nextClientCompletions, todayKey);
        pushToast(`You showed up today · ${streak.currentStreak} day streak`);
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
    (input: { dateKey: string; metricType: 'weight' | 'strength'; label: string; value: number; unit: string; note?: string }) => {
      if (!activeClient) return;
      const event: ProgressEvent = {
        id: uid('prg'),
        clientId: activeClient.id,
        dateKey: input.dateKey,
        metricType: input.metricType,
        label: input.label,
        value: input.value,
        unit: input.unit,
        note: input.note,
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
        const trainerUserId = activeCoach && !isFixtureId(activeCoach.id) ? activeCoach.userId : '';
        runCloudWrite(
          fsService.createProgressEventDoc(
            event,
            firebaseUser.uid,
            trainerUserId,
            input.metricType === 'weight' ? input.value : undefined,
          ),
        );
      }
      pushToast('Measurement saved.');
    },
    [activeClient, activeCoach, persist, isCloudSynced, firebaseUser, runCloudWrite, pushToast],
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

      const { relationships, enrollments } = createDemoEnrollmentState({
        clientId: activeClient.id,
        trainerId,
        pkg,
        existingRelationships: store.relationships,
        existingEnrollments: store.enrollments,
      });

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

      const { relationships, enrollments } = createDemoEnrollmentState({
        clientId: activeClient.id,
        trainerId: inv.trainerId,
        pkg,
        existingRelationships: store.relationships,
        existingEnrollments: store.enrollments,
      });

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

      persist((prev) => ({
        ...prev,
        consultationSlots: res.slots,
        bookings: [...prev.bookings, res.booking],
      }));

      const trainer = store.trainers.find((t) => t.id === res.booking.trainerId);
      if (isCloudSynced && firebaseUser && trainer && !isFixtureId(trainer.id)) {
        runCloudWrite(
          fsService.bookSlotInFirestore({
            booking: res.booking,
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
      const token = `FIT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-2026`;
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
            isDemoSample: true,
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
          isDemoSample: true,
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
    (input: { dateKey: string; startTime: string; endTime: string; mode: 'online' | 'in_person' }) => {
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
    isCloudSynced,
    authBusy,
    signInWithGoogle,
    signOutGoogle,
    lookupInviteToken,
    switchDemoPersona,
    setDemoSimulationFlags,
    signOutDemo,
    startDemoAsRole,
    setPendingInviteToken,
    resetDemoState,
    updateTimezone,
    completeClientOnboarding,
    completeTrainerOnboarding,
    toggleAssignmentCompletion,
    saveAssignmentLog,
    addProgressMeasurement,
    acceptDemoInviteAndPackage,
    rejectInvite,
    enrollWithCoachPackage,
    disconnectActiveCoach,
    bookSlot,
    rescheduleBooking,
    cancelBooking,
    updateClientDetails,
    isClientLinkedToActiveTrainer,
    createInvite,
    revokeInvite,
    runBulkAssignment,
    saveTemplate,
    duplicateTemplate,
    toggleArchiveTemplate,
    generateAIDraft,
    updateAIDraft,
    approveAndSaveAIDraftAsTemplate,
    savePackage,
    togglePackageStatus,
    updateTrainerProfile,
    addConsultationSlot,
    updateClientCoachNotes,
    markNotificationRead,
    markAllNotificationsRead,
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
