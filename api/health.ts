import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './_lib/supabaseAdmin.js';
import { applySecurityHeaders } from './_lib/security.js';

export type ServiceStatus = 'configured' | 'reachable' | 'operational' | 'unavailable';

function checkAdminConfigured(): boolean {
  const json = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const privKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const googleAppCreds = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  return Boolean(
    (json && (json.startsWith('{') || json.length > 20)) ||
      (privKey && privKey.includes('BEGIN') && clientEmail) ||
      googleAppCreds,
  );
}

function checkCashfreeConfig(): {
  isConfigured: boolean;
  env: 'sandbox' | 'production';
  apiVersion: string;
  easySplitEnabled: boolean;
} {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  const rawEnv = (process.env.CASHFREE_ENV || 'sandbox').trim().toLowerCase();
  const env = rawEnv === 'production' ? 'production' : 'sandbox';
  const apiVersion = (process.env.CASHFREE_API_VERSION || '2025-01-01').trim() || '2025-01-01';
  const easySplitEnabled = process.env.CASHFREE_EASY_SPLIT_ENABLED === 'true';

  return {
    isConfigured: Boolean(appId && secretKey),
    env,
    apiVersion,
    easySplitEnabled,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const databaseProvider = process.env.DATABASE_PROVIDER || 'supabase';
  const storageProvider = process.env.STORAGE_PROVIDER || 'supabase';
  const authProvider = process.env.AUTH_PROVIDER || 'firebase';

  const supabaseConfigured = isSupabaseAdminConfigured();
  let supabaseDbStatus: ServiceStatus = supabaseConfigured ? 'configured' : 'unavailable';
  let supabaseStorageStatus: ServiceStatus = supabaseConfigured ? 'configured' : 'unavailable';

  if (supabaseConfigured) {
    try {
      const supabaseAdmin = getSupabaseAdminClient();
      const dbStart = Date.now();
      const { error: dbError } = await supabaseAdmin.from('feature_flags').select('flag_key').limit(1);
      if (!dbError) {
        supabaseDbStatus = 'operational';
      } else if (dbError.code === 'PGRST116' || Date.now() - dbStart < 5000) {
        supabaseDbStatus = 'reachable';
      } else {
        supabaseDbStatus = 'unavailable';
      }

      const { error: storageError } = await supabaseAdmin.storage.listBuckets();
      if (!storageError) {
        supabaseStorageStatus = 'operational';
      } else {
        supabaseStorageStatus = 'reachable';
      }
    } catch {
      supabaseDbStatus = supabaseConfigured ? 'configured' : 'unavailable';
      supabaseStorageStatus = supabaseConfigured ? 'configured' : 'unavailable';
    }
  }

  const adminConfigured = checkAdminConfigured();
  const firebaseAuthStatus: ServiceStatus = adminConfigured
    ? 'operational'
    : process.env.FIREBASE_PROJECT_ID
      ? 'configured'
      : 'unavailable';

  const cashfree = checkCashfreeConfig();
  const cashfreeStatus: ServiceStatus = cashfree.isConfigured
    ? 'operational'
    : process.env.CASHFREE_APP_ID
      ? 'configured'
      : 'unavailable';

  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
  );
  const geminiStatus: ServiceStatus = geminiConfigured
    ? 'operational'
    : process.env.GEMINI_API_KEY
      ? 'configured'
      : 'unavailable';

  return res.status(200).json({
    ok: true,
    service: 'fitplus-api',
    timestamp: new Date().toISOString(),
    runtime: {
      node: process.version,
      vercel: Boolean(process.env.VERCEL),
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID?.trim() || 'gen-lang-client-0381020502',
      firestoreDatabaseId:
        process.env.FIREBASE_FIRESTORE_DATABASE_ID?.trim() ||
        'ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841',
      adminConfigured,
      appCheckEnforced: process.env.REQUIRE_APP_CHECK === 'true',
    },
    capabilities: {
      geminiConfigured,
      cashfreeConfigured: cashfree.isConfigured,
      cashfreeEnv: cashfree.env,
      cashfreeApiVersion: cashfree.apiVersion,
      easySplitEnabled: cashfree.easySplitEnabled,
    },
    providers: {
      database: databaseProvider,
      storage: storageProvider,
      auth: authProvider,
    },
    services: {
      firebaseAuth: firebaseAuthStatus,
      supabaseDatabase: supabaseDbStatus,
      supabaseStorage: supabaseStorageStatus,
      gemini: geminiStatus,
      cashfree: cashfreeStatus,
    },
  });
}
