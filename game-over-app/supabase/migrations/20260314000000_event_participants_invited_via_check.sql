-- Add CHECK constraint to invited_via column to enforce valid values
ALTER TABLE event_participants
  DROP CONSTRAINT IF EXISTS event_participants_invited_via_check;

ALTER TABLE event_participants
  ADD CONSTRAINT event_participants_invited_via_check
  CHECK (invited_via IS NULL OR invited_via IN ('link', 'manual'));
