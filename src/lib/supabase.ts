import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';
import type { Database } from '../types/database.types';

const configuredSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
if (!configuredSupabaseUrl) {
  // createClient('') throws and blanks the whole app. Fall back to an unroutable
  // host so public pages and the demo still render; data calls fail visibly.
  console.error('[FitPlus] VITE_SUPABASE_URL is not set — live data is unavailable.');
}
const supabaseUrl = configuredSupabaseUrl || 'https://supabase-not-configured.invalid';

// createClient also throws on an empty key, so use an inert placeholder.
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 'not-configured';

let thirdPartyAuthFailed = false;

export function markThirdPartyAuthFailed(): void {
  thirdPartyAuthFailed = true;
}

export function resetThirdPartyAuthState(): void {
  thirdPartyAuthFailed = false;
}

export function isThirdPartyAuthFailing(): boolean {
  return thirdPartyAuthFailed;
}

/**
 * FitPlus Supabase Client
 * 
 * Integrated with Firebase Authentication:
 * Supabase uses the current Firebase user's ID token via the accessToken callback
 * when Supabase Third-Party Auth is enabled.
 * If Supabase PostgREST rejects the third-party JWT (status 401 / PGRST301),
 * markThirdPartyAuthFailed() prevents repeated 401 request spam, allowing the client
 * to proceed safely with publishable key queries and backend profile coordination.
 */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  accessToken: async () => {
    if (thirdPartyAuthFailed) {
      return null;
    }
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token for Supabase client:', err);
      return null;
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
