-- =============================================================================
-- FITPLUS STAGE 4E: SUPABASE STORAGE BUCKET MIGRATION
-- Migration 005: Storage Buckets & Policies
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Storage Buckets
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
('public-trainer-assets', 'public-trainer-assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
('profile-avatars', 'profile-avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
('progress-photos', 'progress-photos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
('coaching-attachments', 'coaching-attachments', false, 20971520, NULL),
('verification-documents', 'verification-documents', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Storage RLS Policies
-- -----------------------------------------------------------------------------

-- Public buckets: Anyone can read
CREATE POLICY "Public trainer assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-trainer-assets');

CREATE POLICY "Profile avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-avatars');

-- Authenticated uploads to public buckets (scoped to own folder or trainer id)
CREATE POLICY "Users can upload their own public trainer assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-trainer-assets' 
    AND (auth.jwt()->>'sub' IS NOT NULL)
  );

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-avatars' 
    AND (auth.jwt()->>'sub' IS NOT NULL)
  );

-- Private buckets: progress photos (owner read/write, coach read)
CREATE POLICY "Users access own progress photos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'progress-photos' 
    AND (
      (storage.foldername(name))[1] = coalesce(auth.jwt()->>'sub', '')
      OR (storage.foldername(name))[1] IN (
        SELECT client_user_id FROM coaching_relationships 
        WHERE trainer_user_id = coalesce(auth.jwt()->>'sub', '') AND status = 'active'
      )
    )
  );

-- Private buckets: verification documents (trainer upload, admin read)
CREATE POLICY "Trainers upload verification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.jwt()->>'sub' IS NOT NULL
  );

CREATE POLICY "Trainers and admins read verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents'
    AND (
      (storage.foldername(name))[1] = coalesce(auth.jwt()->>'sub', '')
      OR is_platform_admin()
    )
  );

-- Private buckets: coaching chat attachments
CREATE POLICY "Participants access coaching attachments"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'coaching-attachments'
    AND auth.jwt()->>'sub' IS NOT NULL
  );
