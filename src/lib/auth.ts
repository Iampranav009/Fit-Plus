import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * The signed-in user as the rest of the app consumes it. `uid` is the Supabase
 * auth user id, which is what app_users.firebase_uid (legacy column name) stores.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerData: { providerId: string }[];
  getIdToken: () => Promise<string>;
}

async function currentAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Not signed in.');
  return data.session.access_token;
}

export function toAuthUser(user: SupabaseUser): AuthUser {
  const meta = user.user_metadata || {};
  const providers = (user.app_metadata?.providers as string[] | undefined) || [user.app_metadata?.provider || 'email'];
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (meta.full_name as string) || (meta.name as string) || null,
    photoURL: (meta.avatar_url as string) || (meta.picture as string) || null,
    emailVerified: true,
    providerData: providers.map((p) => ({ providerId: p === 'email' ? 'password' : `${p}.com` })),
    getIdToken: currentAccessToken,
  };
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ? toAuthUser(data.session.user) : null;
}

export function onAuthUserChanged(callback: (user: AuthUser | null) => void): () => void {
  let lastUid: string | null | undefined;
  const emit = (session: Session | null) => {
    const uid = session?.user.id ?? null;
    // Token refreshes re-fire the listener; only react to real sign-in changes.
    if (uid === lastUid) return;
    lastUid = uid;
    callback(session ? toAuthUser(session.user) : null);
  };
  void supabase.auth.getSession().then(({ data }) => emit(data.session));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // Supabase warns against awaiting other auth calls inside this callback.
    setTimeout(() => emit(session), 0);
  });
  return () => data.subscription.unsubscribe();
}

/** Starts the Google OAuth redirect. The page navigates away; the session is picked up on return. */
export async function signInWithGoogleRedirect(returnPath?: string): Promise<void> {
  const target = returnPath || `${window.location.pathname}${window.location.search}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${target}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function registerWithEmailPassword(params: {
  email: string;
  password: string;
  fullName: string;
}): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: { data: { full_name: params.fullName.trim() } },
  });
  if (error) throw error;
  // With "Confirm email" disabled Supabase returns a session immediately.
  return data.session ? toAuthUser(data.session.user) : null;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return toAuthUser(data.user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth`,
  });
  if (error) throw error;
}

export async function signOutAuth(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getApiSecurityHeaders(): Promise<Record<string, string>> {
  try {
    return { Authorization: `Bearer ${await currentAccessToken()}` };
  } catch {
    return {};
  }
}

export async function deleteAccountAndData(): Promise<{ ok: boolean; error?: string }> {
  const headers = await getApiSecurityHeaders();
  if (!headers.Authorization) return { ok: false, error: 'You must be signed in to delete your account.' };
  try {
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: body.error || 'Could not delete account.' };
    await signOutAuth();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Try again.' };
  }
}
