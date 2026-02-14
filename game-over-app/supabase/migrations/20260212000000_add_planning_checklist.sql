-- Add planning_checklist JSONB column to events table
-- Stores manual checklist state for post-booking planning steps (4-8)
-- Keys: quiz, accommodations, travel, surprise, final_briefing (boolean values)
ALTER TABLE events ADD COLUMN IF NOT EXISTS planning_checklist JSONB DEFAULT '{}';
