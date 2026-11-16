import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminContext, isFirebaseAdminConfigured } from './_lib/firebaseAdmin.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { config } = getFirebaseAdminContext();
  return res.status(200).json({
    ok: true,
    service: 'fitplus-api',
    timestamp: new Date().toISOString(),
    firebase: {
      projectId: config.projectId,
      firestoreDatabaseId: config.firestoreDatabaseId,
      adminConfigured: isFirebaseAdminConfigured(),
      appCheckEnforced: process.env.REQUIRE_APP_CHECK === 'true',
    },
    capabilities: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    },
  });
}
