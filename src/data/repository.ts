import type { StoreSnapshot } from '../types/domain';
import { getTodayKey } from '../lib/date';

export const STORE_SCHEMA_VERSION = 1;
export const DEMO_STORAGE_KEY = 'fitplus_demo_store_v1';

function createDemoSeed(): StoreSnapshot {
  const today = getTodayKey();
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    anchorDateKey: today,
    session: {
      isAuthenticated: false,
      activeUserId: 'usr_demo_trainer',
      activeRole: 'trainer',
      onboardingCompleted: true,
      celebratedDateKeys: [],
      simulateLoading: false,
      simulateError: false,
    },
    users: [
      {
        id: 'usr_demo_trainer',
        firstName: 'Demo',
        lastName: 'Trainer',
        email: 'trainer@fitplus.demo',
        role: 'trainer',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        isAdultConfirmed: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_demo_client',
        firstName: 'Demo',
        lastName: 'Client',
        email: 'client@fitplus.demo',
        role: 'client',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        isAdultConfirmed: true,
        createdAt: new Date().toISOString(),
      },
    ],
    trainers: [
      {
        id: 'trn_demo',
        userId: 'usr_demo_trainer',
        slug: 'demo-trainer',
        displayName: 'Demo Trainer',
        headline: 'Your FitPlus Demo Coach',
        bio: '',
        coachingStyle: '',
        city: 'Mumbai',
        coachingMode: 'online',
        specialties: [],
        languages: ['English'],
        experienceYears: 0,
        avatarKey: '',
        coverKey: '',
        isDemoVerified: false,
        demoVerificationNote: '',
        demoPhoneLabel: '',
        acceptingClients: true,
        isPublished: false,
        createdAt: new Date().toISOString(),
      },
    ],
    clients: [
      {
        id: 'cl_demo',
        userId: 'usr_demo_client',
        firstName: 'Demo',
        lastName: 'Client',
        primaryGoal: 'general_fitness',
        experienceLevel: 'beginner',
        daysPerWeek: 3,
        environment: 'gym',
        equipment: [],
        dietaryPreference: 'prefer_not_to_say',
        createdAt: new Date().toISOString(),
      },
    ],
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

/**
 * Repository abstraction designed so Stage 2 can swap LocalDemoRepository
 * for a persistent Firebase / Supabase adapter without rewriting UI components.
 */
export interface FitPlusRepository {
  loadSnapshot(): StoreSnapshot;
  saveSnapshot(snapshot: StoreSnapshot): void;
  resetDemo(): StoreSnapshot;
}

export class LocalDemoRepository implements FitPlusRepository {
  private storageKey: string;

  constructor(storageKey = DEMO_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  loadSnapshot(): StoreSnapshot {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDemoSeed();
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        const seed = createDemoSeed();
        this.saveSnapshot(seed);
        return seed;
      }

      const parsed = JSON.parse(raw) as Partial<StoreSnapshot>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        parsed.schemaVersion !== STORE_SCHEMA_VERSION ||
        !Array.isArray(parsed.users) ||
        !Array.isArray(parsed.assignments) ||
        !parsed.session
      ) {
        const seed = createDemoSeed();
        this.saveSnapshot(seed);
        return seed;
      }

      return parsed as StoreSnapshot;
    } catch {
      // Gracefully recover from corrupt local JSON without crashing the app
      const seed = createDemoSeed();
      this.saveSnapshot(seed);
      return seed;
    }
  }

  saveSnapshot(snapshot: StoreSnapshot): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota issues in constrained browser environments
    }
  }

  resetDemo(): StoreSnapshot {
    const seed = createDemoSeed();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(this.storageKey);
      } catch {
        // ignore
      }
    }
    this.saveSnapshot(seed);
    return seed;
  }
}

export const demoRepository = new LocalDemoRepository();
