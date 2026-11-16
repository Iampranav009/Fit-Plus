import type { DecodedIdToken } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';
import {
  getFirestoreAdminContext,
  isFirebaseAdminConfigured,
  type AppletConfig,
} from './firestoreAdmin.js';

export type { AppletConfig };
export { getFirestoreAdminContext, getFirestoreAdminContext as getFirebaseAdminContext, isFirebaseAdminConfigured };

export interface VerifiedRequestAuth {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: 'client' | 'trainer' | 'admin';
  isAdmin: boolean;
  decoded: DecodedIdToken;
}

export class AuthHttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function verifyAuthenticatedRequest(headers: {
  authorization?: string | string[];
  'x-firebase-appcheck'?: string | string[];
}): Promise<VerifiedRequestAuth> {
  const rawAuth = Array.isArray(headers.authorization)
    ? headers.authorization[0]
    : headers.authorization;

  if (!rawAuth || !rawAuth.startsWith('Bearer ')) {
    throw new AuthHttpError(401, 'auth/missing-token', 'Missing Authorization Bearer Firebase ID token.');
  }

  const idToken = rawAuth.slice('Bearer '.length).trim();
  if (!idToken) {
    throw new AuthHttpError(401, 'auth/empty-token', 'Empty Firebase ID token.');
  }

  if (!isFirebaseAdminConfigured()) {
    throw new AuthHttpError(
      503,
      'server/admin-unconfigured',
      'Firebase Admin credentials are not configured on this server.',
    );
  }

  const { app, db } = getFirestoreAdminContext();

  if (process.env.REQUIRE_APP_CHECK === 'true') {
    const appCheckHeader = Array.isArray(headers['x-firebase-appcheck'])
      ? headers['x-firebase-appcheck'][0]
      : headers['x-firebase-appcheck'];
    if (!appCheckHeader) {
      throw new AuthHttpError(401, 'app-check/missing', 'Missing Firebase App Check token.');
    }
    try {
      const { getAppCheck } = await import('firebase-admin/app-check');
      await getAppCheck(app).verifyToken(appCheckHeader);
    } catch {
      throw new AuthHttpError(401, 'app-check/invalid', 'Invalid Firebase App Check token.');
    }
  }

  let decoded: DecodedIdToken;
  try {
    const { getAuth } = await import('firebase-admin/auth');
    decoded = await getAuth(app).verifyIdToken(idToken, true);
  } catch {
    throw new AuthHttpError(401, 'auth/invalid-token', 'Invalid or expired Firebase ID token.');
  }

  const email = decoded.email || '';
  const emailVerified = Boolean(decoded.email_verified);
  if (!emailVerified) {
    throw new AuthHttpError(403, 'auth/email-unverified', 'Verified email address is required.');
  }

  const [userSnap, adminSnap] = await Promise.all([
    db.collection('users').doc(decoded.uid).get(),
    db.collection('admins').doc(decoded.uid).get(),
  ]);

  const bootstrapAdminEmail = (
    process.env.FITPLUS_ADMIN_EMAIL || 'pranavshindeji5001@gmail.com'
  ).toLowerCase();
  const isAdmin =
    adminSnap.exists || (Boolean(email) && email.toLowerCase() === bootstrapAdminEmail);

  const storedRole = userSnap.data()?.role;
  const role: 'client' | 'trainer' | 'admin' = isAdmin
    ? 'admin'
    : storedRole === 'trainer'
      ? 'trainer'
      : 'client';

  return {
    uid: decoded.uid,
    email,
    emailVerified,
    role,
    isAdmin,
    decoded,
  };
}
