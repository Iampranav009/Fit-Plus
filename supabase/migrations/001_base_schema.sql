-- =============================================================================
-- FITPLUS STAGE 4E: SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Migration 001: Base Database Schema
-- Compatible with Firebase Authentication (Firebase UID stored as TEXT)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Identity & Core Users
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_users (
  firebase_uid TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'trainer', 'admin')) DEFAULT 'client',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  locale TEXT NOT NULL DEFAULT 'en-IN',
  is_adult_confirmed BOOLEAN NOT NULL DEFAULT false,
  privacy_consent_accepted BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  celebrated_date_keys TEXT[] NOT NULL DEFAULT '{}',
  pending_invite_token TEXT,
  notification_prefs JSONB NOT NULL DEFAULT '{"workoutReminders": true, "checkInReminders": true, "chatMessages": true, "billingAlerts": true}'::jsonb,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  firebase_uid TEXT PRIMARY KEY REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Trainer & Client Profiles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trainer_profiles (
  id TEXT PRIMARY KEY, -- e.g. 'tr_<uid>'
  user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  coaching_style TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  coaching_mode TEXT NOT NULL CHECK (coaching_mode IN ('online', 'in_person', 'hybrid')) DEFAULT 'online',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  experience_years INTEGER NOT NULL DEFAULT 1,
  avatar_key TEXT NOT NULL DEFAULT '',
  cover_key TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  whatsapp_business_e164 TEXT,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'pending', 'verified')) DEFAULT 'unverified',
  is_demo_verified BOOLEAN NOT NULL DEFAULT false,
  demo_verification_note TEXT NOT NULL DEFAULT '',
  demo_phone_label TEXT NOT NULL DEFAULT '',
  accepting_clients BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_profiles (
  id TEXT PRIMARY KEY, -- e.g. 'cl_<uid>'
  user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  age INTEGER,
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),
  target_weight_kg NUMERIC(5,2),
  primary_goal TEXT NOT NULL DEFAULT 'general_fitness',
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'experienced')) DEFAULT 'beginner',
  days_per_week INTEGER NOT NULL DEFAULT 3,
  environment TEXT NOT NULL CHECK (environment IN ('gym', 'home', 'outdoors')) DEFAULT 'gym',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  dietary_preference TEXT NOT NULL DEFAULT 'non_vegetarian',
  dietary_notes TEXT DEFAULT '',
  food_allergies TEXT DEFAULT '',
  health_limitations TEXT DEFAULT '',
  preferred_language TEXT DEFAULT 'English',
  coaching_preferences TEXT DEFAULT '',
  coach_notes TEXT DEFAULT '',
  scenario_tag TEXT,
  renewal_due_date DATE,
  active_trainer_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. Coaching Relationships & Packages
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS coaching_packages (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  price_inr INTEGER NOT NULL DEFAULT 0,
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'quarterly', 'free')) DEFAULT 'monthly',
  duration_days INTEGER NOT NULL DEFAULT 30,
  consultations_included INTEGER NOT NULL DEFAULT 1,
  features TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  is_demo_sample BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coaching_relationships (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  package_id TEXT REFERENCES coaching_packages(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'ended')) DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_user_id, client_user_id)
);

CREATE TABLE IF NOT EXISTS trainer_invites (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  trainer_id TEXT NOT NULL,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  client_email_or_label TEXT NOT NULL,
  suggested_package_id TEXT REFERENCES coaching_packages(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'redeemed', 'expired', 'revoked')) DEFAULT 'active',
  redeemed_by_client_id TEXT,
  redeemed_by_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_id TEXT NOT NULL,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES coaching_packages(id) ON DELETE RESTRICT,
  subscription_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')) DEFAULT 'active',
  is_demo_checkout BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 4. Commerce & Financial Ledger
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES coaching_packages(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')) DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  amount_inr INTEGER NOT NULL DEFAULT 0,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES coaching_packages(id) ON DELETE RESTRICT,
  subscription_id TEXT,
  amount_inr INTEGER NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  cashfree_order_id TEXT UNIQUE NOT NULL,
  cashfree_payment_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'captured', 'failed', 'refunded')) DEFAULT 'pending',
  gateway_status TEXT,
  payment_method TEXT,
  coupon_code TEXT,
  discount_inr INTEGER NOT NULL DEFAULT 0,
  gst_inr INTEGER NOT NULL DEFAULT 0,
  platform_fee_inr INTEGER NOT NULL DEFAULT 0,
  trainer_net_inr INTEGER NOT NULL DEFAULT 0,
  is_demo_order BOOLEAN NOT NULL DEFAULT false,
  raw_gateway_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(10,2) NOT NULL,
  max_discount_inr INTEGER,
  min_order_inr INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  referrer_name TEXT NOT NULL,
  referrer_role TEXT NOT NULL CHECK (referrer_role IN ('client', 'trainer')),
  referral_code TEXT NOT NULL,
  referee_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  referee_name TEXT,
  referee_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'signed_up', 'converted')) DEFAULT 'pending',
  reward_inr INTEGER NOT NULL DEFAULT 0,
  reward_paise INTEGER NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('coaching_credit', 'payout')) DEFAULT 'coaching_credit',
  package_id TEXT REFERENCES coaching_packages(id),
  package_name TEXT,
  payment_id TEXT REFERENCES payment_records(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. Fitness, Plans & Coaching Work
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('workout', 'nutrition', 'habit', 'recovery', 'check_in')),
  instructions TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  completion_type TEXT NOT NULL CHECK (completion_type IN ('checkbox', 'log_value', 'session_log')),
  target_label TEXT,
  is_recovery_default BOOLEAN NOT NULL DEFAULT false,
  is_optional_default BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_id TEXT,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  template_id TEXT REFERENCES task_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('workout', 'nutrition', 'habit', 'recovery', 'check_in')),
  instructions TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  due_time TEXT NOT NULL DEFAULT '08:00',
  completion_type TEXT NOT NULL CHECK (completion_type IN ('checkbox', 'log_value', 'session_log')),
  target_label TEXT,
  scheduled_dates TEXT[] NOT NULL DEFAULT '{}',
  is_optional BOOLEAN NOT NULL DEFAULT false,
  is_recovery BOOLEAN NOT NULL DEFAULT false,
  has_custom_override BOOLEAN NOT NULL DEFAULT false,
  override_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_completions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  date_key TEXT NOT NULL, -- 'YYYY-MM-DD'
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, date_key)
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_id TEXT,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  focus TEXT NOT NULL DEFAULT 'General',
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_id TEXT,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  daily_calories INTEGER NOT NULL DEFAULT 2000,
  protein_g INTEGER NOT NULL DEFAULT 120,
  carbs_g INTEGER NOT NULL DEFAULT 200,
  fat_g INTEGER NOT NULL DEFAULT 60,
  hydration_target_glasses INTEGER NOT NULL DEFAULT 8,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_program_templates (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Strength',
  tags TEXT[] NOT NULL DEFAULT '{}',
  week_count INTEGER NOT NULL DEFAULT 4,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_program_templates (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  dietary_type TEXT NOT NULL DEFAULT 'non_vegetarian',
  target_kcal INTEGER NOT NULL DEFAULT 2000,
  target_protein_g INTEGER NOT NULL DEFAULT 120,
  hydration_target_glasses INTEGER NOT NULL DEFAULT 8,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  equipment_required TEXT NOT NULL DEFAULT 'none',
  instructions TEXT[] NOT NULL DEFAULT '{}',
  tips TEXT[] NOT NULL DEFAULT '{}',
  gif_url TEXT,
  video_url TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  assignment_id TEXT REFERENCES task_assignments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date_key TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  total_volume_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  coach_feedback TEXT,
  coach_feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_diary_entries (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  date_key TEXT NOT NULL,
  slot TEXT NOT NULL,
  foods JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_kcal INTEGER NOT NULL DEFAULT 0,
  total_protein_g INTEGER NOT NULL DEFAULT 0,
  total_carbs_g INTEGER NOT NULL DEFAULT 0,
  total_fat_g INTEGER NOT NULL DEFAULT 0,
  photo_url TEXT,
  coach_feedback TEXT,
  coach_feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_check_ins (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  date_key TEXT NOT NULL,
  weight_kg NUMERIC(5,2),
  energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
  sleep_rating INTEGER CHECK (sleep_rating BETWEEN 1 AND 5),
  stress_rating INTEGER CHECK (stress_rating BETWEEN 1 AND 5),
  digestive_rating INTEGER CHECK (digestive_rating BETWEEN 1 AND 5),
  win_of_the_week TEXT,
  struggle_of_the_week TEXT,
  coach_notes TEXT,
  photo_url TEXT,
  trainer_feedback TEXT,
  trainer_feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. Progress, Streaks & Achievements
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS progress_events (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  date_key TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'weight_kg', 'waist_cm', etc.
  numeric_value NUMERIC(8,2) NOT NULL,
  photo_url TEXT,
  photo_key TEXT,
  share_with_trainer BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_activity (
  id TEXT PRIMARY KEY, -- 'act_<uid>_<dateKey>'
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  date_key TEXT NOT NULL,
  water_glasses INTEGER NOT NULL DEFAULT 0,
  step_count INTEGER NOT NULL DEFAULT 0,
  sleep_hours NUMERIC(4,2),
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_user_id, date_key)
);

CREATE TABLE IF NOT EXISTS streak_records (
  id TEXT PRIMARY KEY, -- 'strk_<uid>'
  client_id TEXT NOT NULL,
  client_user_id TEXT UNIQUE NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date_key TEXT,
  streak_freeze_available INTEGER NOT NULL DEFAULT 1,
  consistency_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievement_unlocks (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  celebrated BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (client_user_id, badge_id)
);

-- -----------------------------------------------------------------------------
-- 7. Communication & Messaging
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY, -- e.g. 'conv_<cId>_<tId>'
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_avatar TEXT,
  trainer_id TEXT NOT NULL,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  trainer_name TEXT NOT NULL,
  trainer_avatar TEXT,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_id TEXT,
  unread_count_client INTEGER NOT NULL DEFAULT 0,
  unread_count_trainer INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_user_id, trainer_user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'trainer', 'admin')),
  text TEXT NOT NULL,
  reply_to JSONB,
  attachment JSONB,
  reference JSONB,
  read_by_recipient BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('workout', 'nutrition', 'check_in', 'billing', 'chat', 'admin')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('workout', 'check_in', 'consultation', 'subscription', 'chat')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  trigger_status TEXT NOT NULL CHECK (trigger_status IN ('scheduled', 'sent', 'cancelled')) DEFAULT 'scheduled',
  idempotency_key TEXT UNIQUE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'whatsapp_manual', 'push')) DEFAULT 'in_app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 8. Scheduling & Consultations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consultation_slots (
  id TEXT PRIMARY KEY,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'booked', 'cancelled')) DEFAULT 'available',
  meeting_link TEXT,
  booked_by_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultation_bookings (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES consultation_slots(id) ON DELETE CASCADE,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'confirmed',
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. AI Copilot Drafts & Client Groups
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_plan_drafts (
  id TEXT PRIMARY KEY,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  objective TEXT NOT NULL,
  level TEXT NOT NULL,
  days_per_week INTEGER NOT NULL DEFAULT 3,
  split TEXT NOT NULL DEFAULT 'Full Body',
  dietary_pref TEXT NOT NULL DEFAULT 'vegetarian',
  target_calories INTEGER NOT NULL DEFAULT 2000,
  target_protein_g INTEGER NOT NULL DEFAULT 120,
  workout_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  meal_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  trainer_approved BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'applied', 'discarded')) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_groups (
  id TEXT PRIMARY KEY,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, client_user_id)
);

-- -----------------------------------------------------------------------------
-- 10. Compliance & Administration
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT
);

CREATE TABLE IF NOT EXISTS trainer_verification_requests (
  id TEXT PRIMARY KEY,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  qualification_title TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewer_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  reviewer_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainer_reviews (
  id TEXT PRIMARY KEY,
  trainer_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  client_user_id TEXT NOT NULL REFERENCES app_users(firebase_uid) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL DEFAULT '',
  verified_enrollment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_user_id, client_user_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES app_users(firebase_uid) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
