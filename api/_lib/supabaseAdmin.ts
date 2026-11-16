import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

let cachedClient: SupabaseClient<Database> | null = null;

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!cachedClient) {
    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      throw new Error('Supabase admin credentials are not configured on this server.');
    }
    cachedClient = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}
