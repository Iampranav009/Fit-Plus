-- =============================================================================
-- FITPLUS STAGE 4E: SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Migration 004: Performance Indexes & Realtime Publications
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Identity & Profiles Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(lower(email));
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);

CREATE INDEX IF NOT EXISTS idx_trainer_profiles_user_id ON trainer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_slug ON trainer_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_accepting ON trainer_profiles(accepting_clients) WHERE accepting_clients = true;
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_published ON trainer_profiles(is_published) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id ON client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_active_trainer ON client_profiles(active_trainer_user_id);

-- -----------------------------------------------------------------------------
-- 2. Coaching & Commerce Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_coaching_packages_trainer ON coaching_packages(trainer_user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_packages_status ON coaching_packages(status);

CREATE INDEX IF NOT EXISTS idx_relationships_trainer ON coaching_relationships(trainer_user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_client ON coaching_relationships(client_user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_status ON coaching_relationships(status);

CREATE INDEX IF NOT EXISTS idx_invites_token ON trainer_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_trainer ON trainer_invites(trainer_user_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_client ON enrollments(client_user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_trainer ON enrollments(trainer_user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trainer ON subscriptions(trainer_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payment_records(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payment_records(client_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_trainer ON payment_records(trainer_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_records(status);

-- -----------------------------------------------------------------------------
-- 3. Fitness, Assignments & Tracking Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assignments_client ON task_assignments(client_user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_trainer ON task_assignments(trainer_user_id);

CREATE INDEX IF NOT EXISTS idx_completions_client_date ON task_completions(client_user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_completions_assignment ON task_completions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_workout_plans_client ON workout_plans(client_user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client ON meal_plans(client_user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_client ON workout_sessions(client_user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_nutrition_diary_client ON nutrition_diary_entries(client_user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_weekly_check_ins_client ON weekly_check_ins(client_user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_progress_events_client ON progress_events(client_user_id, date_key);
CREATE INDEX IF NOT EXISTS idx_daily_activity_client ON daily_activity(client_user_id, date_key);

-- -----------------------------------------------------------------------------
-- 4. Messaging & Notifications Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_conversations_client ON chat_conversations(client_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_trainer ON chat_conversations(trainer_user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON chat_messages(conversation_id, read_by_recipient) WHERE read_by_recipient = false;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_reminders_recipient ON scheduled_reminders(recipient_user_id, scheduled_for ASC);

-- -----------------------------------------------------------------------------
-- 5. Realtime Publication Setup
-- Enable Supabase Realtime for instant synchronization
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Add critical tables to supabase_realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE 
    chat_conversations,
    chat_messages,
    notifications,
    task_assignments,
    task_completions,
    coaching_relationships,
    consultation_bookings;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- table already in publication
  WHEN undefined_object THEN
    NULL; -- supabase_realtime publication not created yet
END;
$$;
