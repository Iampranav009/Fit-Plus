import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
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

export function getFirestoreAdminContext(): {
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
