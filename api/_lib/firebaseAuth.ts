import type { DecodedIdToken } from 'firebase-admin/auth';
import { getApps, initializeApp, cert, getApp, type App } from 'firebase-admin/app';
import { isFirebaseAdminConfigured, type AppletConfig } from './firestoreAdmin.js';

export class AuthHttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Pure Firebase ID Token verification without Firestore database queries
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  if (!idToken || !idToken.trim()) {
    throw new AuthHttpError(401, 'auth/empty-token', 'Empty Firebase ID token.');
  }

  const apps = getApps();
  let app: App;
  if (apps.length > 0) {
    app = getApp();
  } else {
    app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0381020502',
    });
  }

  const { getAuth } = await import('firebase-admin/auth');
  try {
    return await getAuth(app).verifyIdToken(idToken, true);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AuthHttpError(401, 'auth/invalid-token', `Invalid or expired Firebase ID token: ${msg}`);
  }
}
