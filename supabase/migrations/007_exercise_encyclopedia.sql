-- =============================================================================
-- FITPLUS — VISUAL EXERCISE ENCYCLOPEDIA UPGRADE
-- Migration 007: Expanded Exercise Schema & Dedicated Storage Bucket
-- =============================================================================

-- 1. Extend exercise_definitions schema with visual encyclopedia columns
ALTER TABLE exercise_definitions
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'strength',
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS benefits TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS start_image_url TEXT,
  ADD COLUMN IF NOT EXISTS end_image_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS movement_phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS safety_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS alternative_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_verified_by_trainer BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Indexes for accelerated full-text search and filtering
CREATE INDEX IF NOT EXISTS idx_exercise_defs_muscle ON exercise_definitions(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_defs_difficulty ON exercise_definitions(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercise_defs_environment ON exercise_definitions(environment);
CREATE INDEX IF NOT EXISTS idx_exercise_defs_category ON exercise_definitions(category);

-- 3. Dedicated Supabase Storage Bucket for Exercise Demonstration & Anatomical Assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-assets',
  'exercise-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/webp', 'image/svg+xml', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/webp', 'image/svg+xml', 'image/png', 'image/jpeg'];

-- 4. Storage RLS Policies for exercise-assets Bucket
-- Public Read: Any authenticated user or anonymous visitor can view public demonstration assets
DROP POLICY IF EXISTS "Public read access for exercise assets" ON storage.objects;
CREATE POLICY "Public read access for exercise assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exercise-assets');

-- Admin Only Insert/Update/Delete: Restrict upload and modification to authorized administrators
DROP POLICY IF EXISTS "Platform admin insert exercise assets" ON storage.objects;
CREATE POLICY "Platform admin insert exercise assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exercise-assets' AND (
      is_platform_admin() OR
      EXISTS (
        SELECT 1 FROM platform_admins
        WHERE platform_admins.firebase_uid = coalesce(auth.jwt()->>'sub', auth.jwt()->>'user_id', auth.uid()::text, '')
      )
    )
  );

DROP POLICY IF EXISTS "Platform admin update exercise assets" ON storage.objects;
CREATE POLICY "Platform admin update exercise assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'exercise-assets' AND (
      is_platform_admin() OR
      EXISTS (
        SELECT 1 FROM platform_admins
        WHERE platform_admins.firebase_uid = coalesce(auth.jwt()->>'sub', auth.jwt()->>'user_id', auth.uid()::text, '')
      )
    )
  );

DROP POLICY IF EXISTS "Platform admin delete exercise assets" ON storage.objects;
CREATE POLICY "Platform admin delete exercise assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'exercise-assets' AND (
      is_platform_admin() OR
      EXISTS (
        SELECT 1 FROM platform_admins
        WHERE platform_admins.firebase_uid = coalesce(auth.jwt()->>'sub', auth.jwt()->>'user_id', auth.uid()::text, '')
      )
    )
  );
