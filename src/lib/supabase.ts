import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';
import type { Database } from '../types/database.types';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || '';

const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '';

/**
 * FitPlus Supabase Client
 * 
 * Integrated with Firebase Authentication:
 * Supabase uses the current Firebase user's ID token via the accessToken callback.
 * RLS policies on PostgreSQL check auth.jwt()->>'sub' matching the Firebase UID.
 */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  accessToken: async () => {
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
