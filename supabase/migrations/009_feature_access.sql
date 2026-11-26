-- Add feature_access jsonb column to coaching_relationships
-- Trainers toggle which premium features each client can use
ALTER TABLE coaching_relationships
  ADD COLUMN IF NOT EXISTS feature_access jsonb DEFAULT '{"workout_studio":false,"nutrition_studio":false,"exercise_library":false}'::jsonb;
