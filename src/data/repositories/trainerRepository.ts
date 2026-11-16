import { supabase } from '../../lib/supabase';
import type { TrainerProfile, Package, Invite } from '../../types/domain';

export async function getTrainerProfileByUserId(userId: string): Promise<TrainerProfile | null> {
  const { data, error } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    slug: data.slug,
    displayName: data.display_name,
    headline: data.headline,
    bio: data.bio,
    coachingStyle: data.coaching_style,
    city: data.city,
    coachingMode: data.coaching_mode,
    specialties: data.specialties || [],
    languages: data.languages || [],
    certifications: data.certifications || [],
    experienceYears: data.experience_years,
    avatarKey: data.avatar_key,
    coverKey: data.cover_key,
    photoUrl: data.photo_url || undefined,
    whatsappBusinessE164: data.whatsapp_business_e164 || undefined,
    verificationStatus: data.verification_status,
    isDemoVerified: data.is_demo_verified,
    demoVerificationNote: data.demo_verification_note,
    demoPhoneLabel: data.demo_phone_label,
    acceptingClients: data.accepting_clients,
    isPublished: data.is_published,
    createdAt: data.created_at,
  };
}

export async function getPublicTrainers(): Promise<TrainerProfile[]> {
  const { data, error } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('accepting_clients', true)
    .eq('is_published', true);

  if (error || !data) return [];

  return data.map((t) => ({
    id: t.id,
    userId: t.user_id,
    slug: t.slug,
    displayName: t.display_name,
    headline: t.headline,
    bio: t.bio,
    coachingStyle: t.coaching_style,
    city: t.city,
    coachingMode: t.coaching_mode,
    specialties: t.specialties || [],
    languages: t.languages || [],
    certifications: t.certifications || [],
    experienceYears: t.experience_years,
    avatarKey: t.avatar_key,
    coverKey: t.cover_key,
    photoUrl: t.photo_url || undefined,
    whatsappBusinessE164: t.whatsapp_business_e164 || undefined,
    verificationStatus: t.verification_status,
    isDemoVerified: t.is_demo_verified,
    demoVerificationNote: t.demo_verification_note,
    demoPhoneLabel: t.demo_phone_label,
    acceptingClients: t.accepting_clients,
    isPublished: t.is_published,
    createdAt: t.created_at,
  }));
}

export async function upsertTrainerProfile(profile: TrainerProfile): Promise<void> {
  const { error } = await supabase.from('trainer_profiles').upsert({
    id: profile.id,
    user_id: profile.userId,
    slug: profile.slug,
    display_name: profile.displayName,
    headline: profile.headline,
    bio: profile.bio,
    coaching_style: profile.coachingStyle,
    city: profile.city,
    coaching_mode: profile.coachingMode,
    specialties: profile.specialties,
    languages: profile.languages,
    certifications: profile.certifications || [],
    experience_years: profile.experienceYears,
    avatar_key: profile.avatarKey,
    cover_key: profile.coverKey,
    photo_url: profile.photoUrl || null,
    whatsapp_business_e164: profile.whatsappBusinessE164 || null,
    verification_status: profile.verificationStatus || 'unverified',
    is_demo_verified: Boolean(profile.isDemoVerified),
    demo_verification_note: profile.demoVerificationNote || '',
    demo_phone_label: profile.demoPhoneLabel || '',
    accepting_clients: Boolean(profile.acceptingClients),
    is_published: profile.isPublished !== false,
  });

  if (error) {
    console.warn('upsertTrainerProfile error in Supabase:', error.message);
  }
}

export async function getTrainerPackages(trainerUserId: string): Promise<Package[]> {
  const { data, error } = await supabase
    .from('coaching_packages')
    .select('*')
    .eq('trainer_user_id', trainerUserId);

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    trainerId: p.trainer_id,
    name: p.name,
    summary: p.summary,
    priceInr: p.price_inr,
    cadence: p.cadence,
    durationDays: p.duration_days,
    consultationsIncluded: p.consultations_included,
    features: p.features || [],
    status: p.status,
    isDemoSample: p.is_demo_sample,
    createdAt: p.created_at,
  }));
}
