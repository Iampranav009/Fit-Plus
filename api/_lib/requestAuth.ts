import { getSupabaseAdminClient, isSupabaseAdminConfigured } from './supabaseAdmin.js';

export interface VerifiedRequestAuth {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: 'client' | 'trainer' | 'admin';
  isAdmin: boolean;
  name: string;
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

function readBearer(authorization?: string | string[]): string {
  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!raw || !raw.startsWith('Bearer ')) {
    throw new AuthHttpError(401, 'auth/missing-token', 'Missing Authorization Bearer token.');
  }
  const token = raw.slice('Bearer '.length).trim();
  if (!token) throw new AuthHttpError(401, 'auth/empty-token', 'Empty access token.');
  return token;
}

export function bootstrapAdminEmail(): string {
  return (process.env.FITPLUS_ADMIN_EMAIL || 'pranavshindeji5001@gmail.com').toLowerCase();
}

/** Verifies a Supabase Auth access token and resolves the caller's role from app_users. */
export async function verifyAuthenticatedRequest(headers: {
  authorization?: string | string[];
}): Promise<VerifiedRequestAuth> {
  const token = readBearer(headers.authorization);

  if (!isSupabaseAdminConfigured()) {
    throw new AuthHttpError(503, 'server/admin-unconfigured', 'Supabase service credentials are not configured on this server.');
  }

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthHttpError(401, 'auth/invalid-token', 'Invalid or expired session. Please sign in again.');
  }

  const uid = data.user.id;
  const email = (data.user.email || '').toLowerCase();
  const meta = data.user.user_metadata || {};
  const name = String(meta.full_name || meta.name || '');

  const [userRes, adminRes] = await Promise.all([
    sb.from('app_users').select('role').eq('firebase_uid', uid).maybeSingle(),
    sb.from('platform_admins').select('firebase_uid').eq('firebase_uid', uid).maybeSingle(),
  ]);

  const isAdmin = (Boolean(email) && email === bootstrapAdminEmail()) || Boolean(adminRes.data);
  const role: VerifiedRequestAuth['role'] = isAdmin
    ? 'admin'
    : userRes.data?.role === 'trainer'
      ? 'trainer'
      : 'client';

  return { uid, email, emailVerified: true, role, isAdmin, name };
}
