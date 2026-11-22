// Request authentication now uses Supabase Auth (see requestAuth.ts). The
// Firestore admin context is still exported for routes not yet moved off Firestore.
import {
  getFirestoreAdminContext,
  isFirebaseAdminConfigured,
  type AppletConfig,
} from './firestoreAdmin.js';

export type { AppletConfig };
export { getFirestoreAdminContext, getFirestoreAdminContext as getFirebaseAdminContext, isFirebaseAdminConfigured };
export { AuthHttpError, verifyAuthenticatedRequest, type VerifiedRequestAuth } from './requestAuth.js';
