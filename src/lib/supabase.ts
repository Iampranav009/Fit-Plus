import { createClient } from '@supabase/supabase-js';
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

/** FitPlus Supabase client. Supabase Auth is the identity provider; RLS reads auth.jwt()->>'sub'. */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
