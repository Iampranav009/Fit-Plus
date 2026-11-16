-- =============================================================================
-- FITPLUS STAGE 4E: SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Migration 002: Row Level Security (RLS) Policies
-- Integrated with Firebase Authentication (auth.jwt()->>'sub')
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper Functions for Firebase Auth Context
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_firebase_uid()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    auth.jwt()->>'sub',
    auth.jwt()->>'user_id',
    current_setting('request.jwt.claim.sub', true)
  );
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE firebase_uid = current_firebase_uid()
  ) OR (
    lower(coalesce(auth.jwt()->>'email', '')) = 'pranavshindeji5001@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION is_coach_of_client(p_client_uid TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coaching_relationships
    WHERE trainer_user_id = current_firebase_uid()
      AND client_user_id = p_client_uid
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_client_of_coach(p_trainer_uid TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coaching_relationships
    WHERE client_user_id = current_firebase_uid()
      AND trainer_user_id = p_trainer_uid
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION am_conversation_participant(p_conv_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = p_conv_id
      AND (client_user_id = current_firebase_uid() OR trainer_user_id = current_firebase_uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on All Tables
-- -----------------------------------------------------------------------------

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_plan_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- app_users Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
  ON app_users FOR SELECT
  USING (firebase_uid = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Coaches can read client users and vice versa"
  ON app_users FOR SELECT
  USING (
    is_coach_of_client(firebase_uid) 
    OR is_client_of_coach(firebase_uid)
  );

CREATE POLICY "Users can insert own profile"
  ON app_users FOR INSERT
  WITH CHECK (firebase_uid = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Users can update own profile"
  ON app_users FOR UPDATE
  USING (firebase_uid = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (firebase_uid = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- trainer_profiles Policies (Public marketplace)
-- -----------------------------------------------------------------------------
CREATE POLICY "Published trainers are readable by all"
  ON trainer_profiles FOR SELECT
  USING (is_published = true OR user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers can manage own profile"
  ON trainer_profiles FOR ALL
  USING (user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- client_profiles Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Clients read own profile, coaches read linked clients"
  ON client_profiles FOR SELECT
  USING (
    user_id = current_firebase_uid() 
    OR is_coach_of_client(user_id)
    OR is_platform_admin()
  );

CREATE POLICY "Clients can manage own profile"
  ON client_profiles FOR ALL
  USING (user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers can update coach notes on linked clients"
  ON client_profiles FOR UPDATE
  USING (is_coach_of_client(user_id) OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- coaching_packages Policies (Public marketplace)
-- -----------------------------------------------------------------------------
CREATE POLICY "Active packages are readable by all"
  ON coaching_packages FOR SELECT
  USING (status = 'active' OR trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers manage own packages"
  ON coaching_packages FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (trainer_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- coaching_relationships Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Participants read relationships"
  ON coaching_relationships FOR SELECT
  USING (
    trainer_user_id = current_firebase_uid() 
    OR client_user_id = current_firebase_uid()
    OR is_platform_admin()
  );

CREATE POLICY "Trainers or clients manage relationships"
  ON coaching_relationships FOR ALL
  USING (
    trainer_user_id = current_firebase_uid() 
    OR client_user_id = current_firebase_uid()
    OR is_platform_admin()
  );

-- -----------------------------------------------------------------------------
-- trainer_invites Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can look up active invite tokens"
  ON trainer_invites FOR SELECT
  USING (status = 'active' OR trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers manage own invites"
  ON trainer_invites FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (trainer_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- enrollments & subscriptions & payment_records Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Participants read enrollments"
  ON enrollments FOR SELECT
  USING (client_user_id = current_firebase_uid() OR trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Participants read subscriptions"
  ON subscriptions FOR SELECT
  USING (client_user_id = current_firebase_uid() OR trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Participants read payments"
  ON payment_records FOR SELECT
  USING (client_user_id = current_firebase_uid() OR trainer_user_id = current_firebase_uid() OR is_platform_admin());

-- Note: Financial writes are executed via serverless API routes or secure database functions
CREATE POLICY "Users insert pending payments"
  ON payment_records FOR INSERT
  WITH CHECK (client_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- task_templates, assignments & completions Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Trainers manage task templates"
  ON task_templates FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Participants read and manage assignments"
  ON task_assignments FOR ALL
  USING (
    client_user_id = current_firebase_uid() 
    OR trainer_user_id = current_firebase_uid() 
    OR is_platform_admin()
  );

CREATE POLICY "Participants manage completions"
  ON task_completions FOR ALL
  USING (
    client_user_id = current_firebase_uid() 
    OR trainer_user_id = current_firebase_uid() 
    OR is_platform_admin()
  );

-- -----------------------------------------------------------------------------
-- workout_plans & meal_plans Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Participants read/write workout plans"
  ON workout_plans FOR ALL
  USING (client_user_id = current_firebase_uid() OR trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Participants read/write meal plans"
  ON meal_plans FOR ALL
  USING (client_user_id = current_firebase_uid() OR trainer_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- chat_conversations & chat_messages Policies (FitPlus Connect)
-- -----------------------------------------------------------------------------
CREATE POLICY "Conversation participants read and update conversation"
  ON chat_conversations FOR ALL
  USING (
    client_user_id = current_firebase_uid() 
    OR trainer_user_id = current_firebase_uid()
    OR is_platform_admin()
  );

CREATE POLICY "Participants read messages"
  ON chat_messages FOR SELECT
  USING (am_conversation_participant(conversation_id) OR is_platform_admin());

CREATE POLICY "Participants send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    am_conversation_participant(conversation_id) 
    AND sender_user_id = current_firebase_uid()
  );

CREATE POLICY "Recipients mark messages read"
  ON chat_messages FOR UPDATE
  USING (am_conversation_participant(conversation_id));

-- -----------------------------------------------------------------------------
-- notifications Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users manage own notifications"
  ON notifications FOR ALL
  USING (recipient_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (recipient_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- workout_sessions, nutrition_diary, check_ins, progress_events, daily_activity, streaks
-- -----------------------------------------------------------------------------
CREATE POLICY "Client and linked trainer access workout sessions"
  ON workout_sessions FOR ALL
  USING (client_user_id = current_firebase_uid() OR is_coach_of_client(client_user_id) OR is_platform_admin());

CREATE POLICY "Client and linked trainer access nutrition diary"
  ON nutrition_diary_entries FOR ALL
  USING (client_user_id = current_firebase_uid() OR is_coach_of_client(client_user_id) OR is_platform_admin());

CREATE POLICY "Client and linked trainer access weekly check-ins"
  ON weekly_check_ins FOR ALL
  USING (client_user_id = current_firebase_uid() OR is_coach_of_client(client_user_id) OR is_platform_admin());

CREATE POLICY "Client and linked trainer access progress events"
  ON progress_events FOR ALL
  USING (
    client_user_id = current_firebase_uid() 
    OR (share_with_trainer = true AND is_coach_of_client(client_user_id))
    OR is_platform_admin()
  );

CREATE POLICY "Client and linked trainer access daily activity"
  ON daily_activity FOR ALL
  USING (client_user_id = current_firebase_uid() OR is_coach_of_client(client_user_id) OR is_platform_admin());

CREATE POLICY "Client and linked trainer access streaks"
  ON streak_records FOR ALL
  USING (client_user_id = current_firebase_uid() OR is_coach_of_client(client_user_id) OR is_platform_admin());

CREATE POLICY "Client accesses achievements"
  ON achievement_unlocks FOR ALL
  USING (client_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- consultation_slots & consultation_bookings
-- -----------------------------------------------------------------------------
CREATE POLICY "Available consultation slots are readable by all"
  ON consultation_slots FOR SELECT
  USING (status = 'available' OR trainer_user_id = current_firebase_uid() OR booked_by_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers manage own consultation slots"
  ON consultation_slots FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Participants manage consultation bookings"
  ON consultation_bookings FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR client_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- ai_plan_drafts & templates
-- -----------------------------------------------------------------------------
CREATE POLICY "Trainers manage own AI drafts"
  ON ai_plan_drafts FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers manage workout program templates"
  ON workout_program_templates FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers manage nutrition program templates"
  ON nutrition_program_templates FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- Public / Shared Collections
-- -----------------------------------------------------------------------------
CREATE POLICY "Exercise definitions are readable by all"
  ON exercise_definitions FOR SELECT
  USING (true);

CREATE POLICY "Users can create custom exercises"
  ON exercise_definitions FOR INSERT
  WITH CHECK (created_by_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Coupons are readable by authenticated users"
  ON coupons FOR SELECT
  USING (is_active = true OR is_platform_admin());

CREATE POLICY "Reviews are readable by all"
  ON trainer_reviews FOR SELECT
  USING (true);

CREATE POLICY "Clients write reviews"
  ON trainer_reviews FOR INSERT
  WITH CHECK (client_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Feature flags readable by all"
  ON feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admin platform access"
  ON platform_admins FOR ALL
  USING (is_platform_admin());
