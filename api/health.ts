import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const adminConfigured = checkAdminConfigured();
    const cashfree = checkCashfreeConfig();

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
        geminiConfigured: Boolean(
          process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
        ),
        cashfreeConfigured: cashfree.isConfigured,
        cashfreeEnv: cashfree.env,
        cashfreeApiVersion: cashfree.apiVersion,
        easySplitEnabled: cashfree.easySplitEnabled,
      },
    });
  } catch (error) {
    return res.status(200).json({
      ok: true,
      degraded: true,
      service: 'fitplus-api',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Degraded mode',
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID?.trim() || 'gen-lang-client-0381020502',
        firestoreDatabaseId:
          process.env.FIREBASE_FIRESTORE_DATABASE_ID?.trim() ||
          'ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841',
        adminConfigured: false,
        appCheckEnforced: false,
      },
      capabilities: {
        geminiConfigured: false,
        cashfreeConfigured: false,
        cashfreeEnv: 'sandbox',
        cashfreeApiVersion: '2025-01-01',
        easySplitEnabled: false,
      },
    });
  }
}
