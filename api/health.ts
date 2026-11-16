import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminStatus } from './_lib/firebaseAdmin.js';
import { getCashfreeConfig } from './_lib/payments.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const firebaseStatus = getFirebaseAdminStatus();
    const cashfree = getCashfreeConfig();
    return res.status(200).json({
      ok: true,
      service: 'fitplus-api',
      timestamp: new Date().toISOString(),
      runtime: {
        node: process.version,
        vercel: Boolean(process.env.VERCEL),
      },
      firebase: {
        projectId: firebaseStatus.projectId,
        firestoreDatabaseId: firebaseStatus.firestoreDatabaseId,
        adminConfigured: firebaseStatus.adminConfigured,
        appCheckEnforced: firebaseStatus.appCheckEnforced,
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
  } catch {
    return res.status(200).json({
      ok: true,
      degraded: true,
      service: 'fitplus-api',
      timestamp: new Date().toISOString(),
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0381020502',
        firestoreDatabaseId:
          process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
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
