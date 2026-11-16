import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

function getCredentials() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  return { url, key };
}

let cachedClient: SupabaseClient<Database> | null = null;

export function isSupabaseAdminConfigured(): boolean {
  const { url, key } = getCredentials();
  return Boolean(url && key);
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!cachedClient) {
    const { url, key } = getCredentials();
    if (!url || !key) {
      throw new Error('Supabase admin credentials are not configured on this server.');
    }
    cachedClient = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}
