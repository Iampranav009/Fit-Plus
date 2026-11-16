import { supabase } from '../../lib/supabase';
import type { User, UserRole } from '../../types/domain';

export async function getUser(firebaseUid: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.firebase_uid,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    role: data.role as UserRole,
    timezone: data.timezone,
    locale: data.locale as 'en-IN',
    isAdultConfirmed: data.is_adult_confirmed,
    privacyConsentAccepted: data.privacy_consent_accepted,
    createdAt: data.created_at,
  };
}

export async function upsertUser(user: Partial<User> & { id: string; email: string; firstName: string }): Promise<void> {
  const { error } = await supabase.from('app_users').upsert({
    firebase_uid: user.id,
    first_name: user.firstName,
    last_name: user.lastName || '',
    email: user.email,
    role: (user.role as UserRole) || 'client',
    timezone: user.timezone || 'Asia/Kolkata',
    locale: user.locale || 'en-IN',
    is_adult_confirmed: Boolean(user.isAdultConfirmed),
    privacy_consent_accepted: Boolean(user.privacyConsentAccepted),
  });

  if (error) {
    console.warn('upsertUser error in Supabase:', error.message);
  }
}

export async function checkIsAdmin(firebaseUid: string): Promise<boolean> {
  const { data } = await supabase
    .from('platform_admins')
    .select('firebase_uid')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  return Boolean(data);
}
