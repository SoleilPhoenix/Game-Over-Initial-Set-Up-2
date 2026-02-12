-- =============================================================================
-- QUESTIONNAIRE REDESIGN: 12 AI-Matching Questions
-- Replaces old Step 2/3 columns with new question-based columns
-- Pre-launch MVP — no production data migration needed
-- =============================================================================

-- New ENUM types for Honoree questions (H1–H6)
CREATE TYPE honoree_energy AS ENUM ('relaxed', 'active', 'action', 'party');
CREATE TYPE spotlight_comfort AS ENUM ('background', 'group', 'center_stage');
CREATE TYPE competition_style AS ENUM ('cooperative', 'competitive', 'spectator');
CREATE TYPE enjoyment_type AS ENUM ('food', 'drinks', 'experience');
CREATE TYPE indoor_outdoor AS ENUM ('indoor', 'outdoor', 'mix');
CREATE TYPE evening_style AS ENUM ('dinner_only', 'dinner_bar', 'full_night');

-- New ENUM types for Group questions (G3–G5)
CREATE TYPE fitness_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE drinking_culture AS ENUM ('low', 'social', 'central');
CREATE TYPE group_dynamic_type AS ENUM ('team_players', 'competitive', 'relaxed');

-- Add new columns to event_preferences
ALTER TABLE event_preferences
  ADD COLUMN honoree_energy honoree_energy,
  ADD COLUMN spotlight_comfort spotlight_comfort,
  ADD COLUMN competition_style competition_style,
  ADD COLUMN enjoyment_type enjoyment_type,
  ADD COLUMN indoor_outdoor indoor_outdoor,
  ADD COLUMN evening_style evening_style,
  ADD COLUMN fitness_level fitness_level,
  ADD COLUMN drinking_culture drinking_culture,
  ADD COLUMN group_dynamic group_dynamic_type;

-- Drop old columns (no production data — safe for MVP)
ALTER TABLE event_preferences
  DROP COLUMN IF EXISTS gathering_size,
  DROP COLUMN IF EXISTS social_approach,
  DROP COLUMN IF EXISTS energy_level;

-- Update group_cohesion enum: rename 'mixed_group' → 'mixed'
-- Create new enum, migrate column, drop old
ALTER TYPE group_cohesion RENAME TO group_cohesion_old;
CREATE TYPE group_cohesion AS ENUM ('close_friends', 'mixed', 'strangers');
ALTER TABLE event_preferences
  ALTER COLUMN group_cohesion TYPE group_cohesion
  USING CASE
    WHEN group_cohesion::text = 'mixed_group' THEN 'mixed'::group_cohesion
    ELSE group_cohesion::text::group_cohesion
  END;
DROP TYPE group_cohesion_old;

-- Drop old ENUM types that are no longer referenced
DROP TYPE IF EXISTS gathering_size;
DROP TYPE IF EXISTS social_approach;
DROP TYPE IF EXISTS energy_level;
