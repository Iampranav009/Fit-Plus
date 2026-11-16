-- =============================================================================
-- FITPLUS STAGE 4D: SECURITY, AUTHENTICATION & PRIVACY HARDENING
-- Migration 006: Additive RLS Hardening, Storage Protection & Privilege Lock
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper Functions with Explicit search_path
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_firebase_uid()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
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
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE firebase_uid = current_firebase_uid()
  ) OR (
    lower(coalesce(auth.jwt()->>'email', '')) = 'pranavshindeji5001@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION is_conversation_participant(p_conv_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = p_conv_id
      AND (client_user_id = current_firebase_uid() OR trainer_user_id = current_firebase_uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Privilege Escalation Prevention: app_users Role Tampering Lock
-- -----------------------------------------------------------------------------

-- Drop previous permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON app_users;

-- Recreate UPDATE policy with strict role lock in WITH CHECK
CREATE POLICY "Users can update own profile"
  ON app_users FOR UPDATE
  USING (firebase_uid = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (
    is_platform_admin()
    OR (
      firebase_uid = current_firebase_uid()
      AND role = 'client'
    )
  );

-- Database trigger preventing role changes by non-admins
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> OLD.role AND NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Privilege Escalation Blocked: Role changes require platform administrator authority.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON app_users;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- -----------------------------------------------------------------------------
-- 3. Coaching Relationships: Restrict Direct Insertion & Block Self-Pairing
-- -----------------------------------------------------------------------------

-- Drop permissive ALL policy
DROP POLICY IF EXISTS "Trainers or clients manage relationships" ON coaching_relationships;
DROP POLICY IF EXISTS "Participants read relationships" ON coaching_relationships;

CREATE POLICY "Participants read relationships"
  ON coaching_relationships FOR SELECT
  USING (
    trainer_user_id = current_firebase_uid() 
    OR client_user_id = current_firebase_uid()
    OR is_platform_admin()
  );

-- Clients can only insert pending relationships if there is an active invite from that trainer
-- Clients cannot unilaterally activate a coaching relationship or pair with themselves
CREATE POLICY "Authorized coaching relationships insert"
  ON coaching_relationships FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (
      trainer_user_id = current_firebase_uid()
      AND trainer_user_id <> client_user_id
    )
    OR (
      client_user_id = current_firebase_uid()
      AND trainer_user_id <> client_user_id
      AND status = 'pending'
      AND EXISTS (
        SELECT 1 FROM trainer_invites ti
        WHERE ti.trainer_user_id = coaching_relationships.trainer_user_id
          AND ti.status = 'active'
          AND ti.expires_at > now()
      )
    )
  );

CREATE POLICY "Trainers or admins update relationships"
  ON coaching_relationships FOR UPDATE
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers or admins delete relationships"
  ON coaching_relationships FOR DELETE
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin());

-- -----------------------------------------------------------------------------
-- 4. RLS Hardening for All 7 Unpolicied Tables
-- -----------------------------------------------------------------------------

-- 4.1 referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Referrals owner and referee read" ON referrals;
DROP POLICY IF EXISTS "Referrals user insert own" ON referrals;
DROP POLICY IF EXISTS "Admins manage referrals" ON referrals;

CREATE POLICY "Referrals owner and referee read"
  ON referrals FOR SELECT
  USING (
    referrer_user_id = current_firebase_uid()
    OR referee_user_id = current_firebase_uid()
    OR is_platform_admin()
  );

CREATE POLICY "Referrals user insert own"
  ON referrals FOR INSERT
  WITH CHECK (
    referrer_user_id = current_firebase_uid()
    OR is_platform_admin()
  );

CREATE POLICY "Admins manage referrals"
  ON referrals FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- 4.2 scheduled_reminders
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own scheduled reminders" ON scheduled_reminders;

CREATE POLICY "Users manage own scheduled reminders"
  ON scheduled_reminders FOR ALL
  USING (recipient_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (recipient_user_id = current_firebase_uid() OR is_platform_admin());

-- 4.3 client_groups
ALTER TABLE client_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trainers manage own client groups" ON client_groups;
DROP POLICY IF EXISTS "Group members view client groups" ON client_groups;

CREATE POLICY "Trainers manage own client groups"
  ON client_groups FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Group members view client groups"
  ON client_groups FOR SELECT
  USING (
    trainer_user_id = current_firebase_uid()
    OR is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM client_group_members cgm
      WHERE cgm.group_id = client_groups.id
        AND cgm.client_user_id = current_firebase_uid()
    )
  );

-- 4.4 client_group_members
ALTER TABLE client_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Group members readable by trainer and member client" ON client_group_members;
DROP POLICY IF EXISTS "Trainers manage client group members" ON client_group_members;

CREATE POLICY "Group members readable by trainer and member client"
  ON client_group_members FOR SELECT
  USING (
    trainer_user_id = current_firebase_uid() 
    OR client_user_id = current_firebase_uid() 
    OR is_platform_admin()
  );

CREATE POLICY "Trainers manage client group members"
  ON client_group_members FOR ALL
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin())
  WITH CHECK (trainer_user_id = current_firebase_uid() OR is_platform_admin());

-- 4.5 consent_records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own consent records" ON consent_records;
DROP POLICY IF EXISTS "Users record own consent" ON consent_records;

CREATE POLICY "Users read own consent records"
  ON consent_records FOR SELECT
  USING (user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Users record own consent"
  ON consent_records FOR INSERT
  WITH CHECK (user_id = current_firebase_uid() OR is_platform_admin());

-- 4.6 trainer_verification_requests
ALTER TABLE trainer_verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trainers read own verification requests, admins read all" ON trainer_verification_requests;
DROP POLICY IF EXISTS "Trainers submit verification requests" ON trainer_verification_requests;
DROP POLICY IF EXISTS "Admins update verification requests" ON trainer_verification_requests;

CREATE POLICY "Trainers read own verification requests, admins read all"
  ON trainer_verification_requests FOR SELECT
  USING (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Trainers submit verification requests"
  ON trainer_verification_requests FOR INSERT
  WITH CHECK (trainer_user_id = current_firebase_uid() OR is_platform_admin());

CREATE POLICY "Admins update verification requests"
  ON trainer_verification_requests FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- 4.7 audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs readable by administrators only" ON audit_logs;
DROP POLICY IF EXISTS "System inserts audit logs" ON audit_logs;

CREATE POLICY "Audit logs readable by administrators only"
  ON audit_logs FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "System inserts audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (actor_user_id = current_firebase_uid() OR is_platform_admin() OR current_firebase_uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 5. Chat Messages: Recipient-Only Read Status Updates & Tamper Prevention
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Recipients mark messages read" ON chat_messages;

CREATE POLICY "Recipients mark messages read"
  ON chat_messages FOR UPDATE
  USING (
    sender_user_id <> current_firebase_uid()
    AND is_conversation_participant(conversation_id)
  )
  WITH CHECK (
    sender_user_id <> current_firebase_uid()
    AND is_conversation_participant(conversation_id)
    AND read_by_recipient = true
  );

CREATE OR REPLACE FUNCTION prevent_message_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_prevent_message_tampering ON chat_messages;
CREATE TRIGGER trg_prevent_message_tampering
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_message_tampering();

-- -----------------------------------------------------------------------------
-- 6. Trainer Reviews: Restrict Insert to Active or Completed Enrollments
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Clients write reviews" ON trainer_reviews;

CREATE POLICY "Clients write reviews"
  ON trainer_reviews FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (
      client_user_id = current_firebase_uid()
      AND (
        EXISTS (
          SELECT 1 FROM coaching_relationships cr
          WHERE cr.client_user_id = current_firebase_uid()
            AND cr.trainer_user_id = trainer_reviews.trainer_user_id
            AND cr.status IN ('active', 'ended')
        )
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.client_user_id = current_firebase_uid()
            AND e.trainer_user_id = trainer_reviews.trainer_user_id
            AND e.status IN ('active', 'completed')
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 7. Supabase Storage Security: Scoped Paths and Signed URLs
-- -----------------------------------------------------------------------------

-- Ensure private buckets are strictly non-public
UPDATE storage.buckets SET public = false WHERE id IN ('progress-photos', 'coaching-attachments', 'verification-documents');
UPDATE storage.buckets SET public = true WHERE id IN ('public-trainer-assets', 'profile-avatars');

-- 7.1 coaching-attachments: Only conversation participants can access/upload
DROP POLICY IF EXISTS "Participants access coaching attachments" ON storage.objects;

CREATE POLICY "Participants access coaching attachments"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'coaching-attachments'
    AND (
      is_conversation_participant((storage.foldername(name))[1])
      OR is_platform_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'coaching-attachments'
    AND (
      is_conversation_participant((storage.foldername(name))[1])
      OR is_platform_admin()
    )
  );

-- 7.2 profile-avatars: Scoped path enforcement ({userId}/*)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-avatars'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-avatars'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

-- 7.3 progress-photos: Scoped path enforcement ({userId}/*) and coach read
DROP POLICY IF EXISTS "Users access own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users and linked trainers read progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users manage own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own progress photos" ON storage.objects;

CREATE POLICY "Users and linked trainers read progress photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR (storage.foldername(name))[1] IN (
        SELECT client_user_id FROM coaching_relationships
        WHERE trainer_user_id = current_firebase_uid() AND status = 'active'
      )
      OR is_platform_admin()
    )
  );

CREATE POLICY "Users manage own progress photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

CREATE POLICY "Users update own progress photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'progress-photos'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

CREATE POLICY "Users delete own progress photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

-- 7.4 verification-documents: Scoped path enforcement ({trainerId}/*)
DROP POLICY IF EXISTS "Trainers upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Trainers and admins read verification documents" ON storage.objects;

CREATE POLICY "Trainers upload verification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

CREATE POLICY "Trainers and admins read verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );

-- 7.5 public-trainer-assets: Scoped upload
DROP POLICY IF EXISTS "Users can upload their own public trainer assets" ON storage.objects;

CREATE POLICY "Users can upload their own public trainer assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-trainer-assets'
    AND (
      (storage.foldername(name))[1] = current_firebase_uid()
      OR is_platform_admin()
    )
  );
