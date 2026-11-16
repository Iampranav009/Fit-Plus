import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

export interface AppletConfig {
  projectId: string;
  firestoreDatabaseId: string;
}

const DEFAULT_PROJECT_ID = 'gen-lang-client-0381020502';
const DEFAULT_FIRESTORE_DATABASE_ID = 'ai-studio-fitplus-848bd738-a0f2-48f4-9c61-6e832da89841';

function loadAppletConfig(): AppletConfig {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppletConfig>;
    return {
      projectId: parsed.projectId?.trim() || process.env.FIREBASE_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID,
      firestoreDatabaseId:
        parsed.firestoreDatabaseId?.trim() ||
        process.env.FIREBASE_FIRESTORE_DATABASE_ID?.trim() ||
        DEFAULT_FIRESTORE_DATABASE_ID,
    };
  } catch {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID,
      firestoreDatabaseId:
        process.env.FIREBASE_FIRESTORE_DATABASE_ID?.trim() || DEFAULT_FIRESTORE_DATABASE_ID,
    };
  }
}

export function getFirebaseAdminConfig(): AppletConfig {
  return loadAppletConfig();
}

let cachedFirestore: Firestore | null = null;

function normalizePrivateKey(raw: string | undefined): string {
  if (!raw) return '';
  return raw.replace(/\\n/g, '\n').trim();
}

function parseServiceAccount(): ServiceAccount | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const decoded = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as Partial<ServiceAccount> & {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      const projectId = (parsed.projectId || parsed.project_id || '').trim();
      const clientEmail = (parsed.clientEmail || parsed.client_email || '').trim();
      const privateKey = normalizePrivateKey(parsed.privateKey || parsed.private_key);
      if (projectId && clientEmail && privateKey && privateKey.includes('BEGIN')) {
        return { projectId, clientEmail, privateKey };
      }
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (projectId && clientEmail && privateKey && privateKey.includes('BEGIN')) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(parseServiceAccount() || process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
}

export function getFirebaseAdminStatus(): {
  projectId: string;
  firestoreDatabaseId: string;
  adminConfigured: boolean;
  appCheckEnforced: boolean;
} {
  const config = loadAppletConfig();
  return {
    projectId: config.projectId,
    firestoreDatabaseId: config.firestoreDatabaseId,
    adminConfigured: isFirebaseAdminConfigured(),
    appCheckEnforced: process.env.REQUIRE_APP_CHECK === 'true',
  };
}

export function getFirebaseAdminContext(): {
  app: App;
  db: Firestore;
  config: AppletConfig;
} {
  const config = loadAppletConfig();
  let app: App;
  if (getApps().length > 0) {
    app = getApp();
  } else {
    const serviceAccount = parseServiceAccount();
    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: config.projectId,
      });
    } else {
      app = initializeApp({ projectId: config.projectId });
    }
  }

  if (!cachedFirestore) {
    try {
      cachedFirestore = initializeFirestore(app, { preferRest: true }, config.firestoreDatabaseId);
    } catch {
      cachedFirestore = getFirestore(app, config.firestoreDatabaseId);
    }
  }

  return { app, db: cachedFirestore, config };
}

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

  const { app, db } = getFirebaseAdminContext();

  if (process.env.REQUIRE_APP_CHECK === 'true') {
    const appCheckHeader = Array.isArray(headers['x-firebase-appcheck'])
      ? headers['x-firebase-appcheck'][0]
      : headers['x-firebase-appcheck'];
    if (!appCheckHeader) {
      throw new AuthHttpError(401, 'app-check/missing', 'Missing Firebase App Check token.');
    }
    try {
      await getAppCheck(app).verifyToken(appCheckHeader);
    } catch {
      throw new AuthHttpError(401, 'app-check/invalid', 'Invalid Firebase App Check token.');
    }
  }

  let decoded: DecodedIdToken;
  try {
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
