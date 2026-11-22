-- =============================================================================
-- FITPLUS MIGRATION 008: Native Supabase Auth
-- =============================================================================
-- Sign-in moves from Firebase Auth to Supabase Auth. The column name
-- app_users.firebase_uid is kept (every FK and RLS policy uses it) but it now
-- holds auth.users.id::text. RLS already reads auth.jwt()->>'sub', which is the
-- Supabase user id, so no policy needs rewriting.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Let user-id changes cascade, so an old Firebase-keyed account can be
--    relinked to its new Supabase user id in one UPDATE.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.app_users'::regclass
      AND c.confupdtype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON UPDATE CASCADE', r.tbl, r.conname, r.def);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Triggers: allow the server (service_role) and the relink routine through.
--    Before this, the service-role key could never set a trainer's role,
--    because is_platform_admin() looks for the admin email in the JWT.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_trusted_backend()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt()->>'role', '') = 'service_role'
      OR current_setting('fitplus.relinking', true) = 'on'
      OR current_user IN ('postgres', 'supabase_admin', 'service_role');
$$;

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> OLD.role AND NOT is_platform_admin() AND NOT is_trusted_backend() THEN
    RAISE EXCEPTION 'Privilege Escalation Blocked: Role changes require platform administrator authority.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_message_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_trusted_backend() THEN
    RETURN NEW;
  END IF;
  IF NEW.id <> OLD.id
     OR NEW.conversation_id <> OLD.conversation_id
     OR NEW.sender_user_id <> OLD.sender_user_id
     OR NEW.sender_role <> OLD.sender_role
     OR NEW.text <> OLD.text
     OR NEW.created_at <> OLD.created_at
     OR NEW.attachment IS DISTINCT FROM OLD.attachment
     OR NEW.reply_to IS DISTINCT FROM OLD.reply_to
     OR NEW.reference IS DISTINCT FROM OLD.reference THEN
    RAISE EXCEPTION 'Message Tampering Blocked: Only read status can be updated by the recipient.';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Recovery-day approvals (previously only stored in Firestore)
-- -----------------------------------------------------------------------------
ALTER TABLE daily_activity ADD COLUMN IF NOT EXISTS recovery_approved BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- 4. Relink an existing account to a new auth user id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION relink_app_user(p_old_uid TEXT, p_new_uid TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_old_uid IS NULL OR p_new_uid IS NULL OR p_old_uid = p_new_uid THEN
    RETURN;
  END IF;
  PERFORM set_config('fitplus.relinking', 'on', true);
  -- A stub row may already exist for the new id; the old row carries the data.
  DELETE FROM app_users WHERE firebase_uid = p_new_uid;
  UPDATE app_users SET firebase_uid = p_new_uid WHERE firebase_uid = p_old_uid;
  UPDATE client_profiles SET active_trainer_user_id = p_new_uid WHERE active_trainer_user_id = p_old_uid;
  UPDATE platform_admins SET granted_by = p_new_uid WHERE granted_by = p_old_uid;
  UPDATE chat_conversations SET blocked_by_user_id = p_new_uid WHERE blocked_by_user_id = p_old_uid;
  UPDATE chat_conversations SET last_message_sender_id = p_new_uid WHERE last_message_sender_id = p_old_uid;
  PERFORM set_config('fitplus.relinking', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION relink_app_user(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Create / relink the app_users row whenever someone signs up
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_uid TEXT;
  v_full_name TEXT := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(NEW.email, 'FitPlus Member'), '@', 1)
  );
BEGIN
  -- Only Google-verified emails relink automatically: with email confirmation
  -- turned off, an email/password sign-up proves nothing about the address.
  IF NEW.email IS NOT NULL AND coalesce(NEW.raw_app_meta_data->>'provider', '') = 'google' THEN
    SELECT firebase_uid INTO v_old_uid
    FROM app_users
    WHERE lower(email) = lower(NEW.email)
      AND firebase_uid <> NEW.id::text
      -- 'usr_*' ids are synthetic rows written by the e2e test suite; never adopt them.
      AND firebase_uid NOT LIKE 'usr\_%'
    ORDER BY onboarding_completed DESC, created_at ASC
    LIMIT 1;
  END IF;

  IF v_old_uid IS NOT NULL THEN
    PERFORM relink_app_user(v_old_uid, NEW.id::text);
  ELSE
    INSERT INTO app_users (firebase_uid, first_name, last_name, email, role, onboarding_completed)
    VALUES (
      NEW.id::text,
      coalesce(nullif(split_part(v_full_name, ' ', 1), ''), 'Member'),
      coalesce(nullif(trim(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 1)), ''), ''),
      coalesce(NEW.email, NEW.id::text || '@fitplus.local'),
      'client',
      false
    )
    ON CONFLICT (firebase_uid) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 6. Realtime: admin panel listens for new users and trainer profiles
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trainer_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trainer_profiles;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
  END IF;
END $$;
