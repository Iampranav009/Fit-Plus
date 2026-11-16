import type { StoreSnapshot } from '../types/domain';
import { createSeedSnapshot, STORE_SCHEMA_VERSION } from './demo/fixtures';

export const DEMO_STORAGE_KEY = 'fitplus_demo_store_v1';

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
      return createSeedSnapshot();
    }

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        const seed = createSeedSnapshot();
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
        const seed = createSeedSnapshot();
        this.saveSnapshot(seed);
        return seed;
      }

      return parsed as StoreSnapshot;
    } catch {
      // Gracefully recover from corrupt local JSON without crashing the app
      const seed = createSeedSnapshot();
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
    const seed = createSeedSnapshot();
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
