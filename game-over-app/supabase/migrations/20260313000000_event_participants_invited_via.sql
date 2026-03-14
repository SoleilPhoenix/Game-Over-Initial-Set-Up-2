-- Add invited_via column to event_participants
-- Records how a participant joined (e.g. 'link', 'manual')
ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS invited_via TEXT;
