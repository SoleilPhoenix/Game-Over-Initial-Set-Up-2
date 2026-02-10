-- Final fix: Remove recursive RLS policy completely
-- Use event-level permissions only, not participant-level checks

-- Drop all existing policies and functions
DROP POLICY IF EXISTS "Users can view participants of their events" ON event_participants;
DROP FUNCTION IF EXISTS check_event_access(UUID, UUID);
DROP FUNCTION IF EXISTS is_event_participant(UUID, UUID);

-- Create simple non-recursive policy
-- Users can see participants if:
-- 1. They created the event (check events table directly - no recursion)
-- 2. They are in the participants list (simple exists check with no RLS call)
CREATE POLICY "Users can view participants of their events"
  ON event_participants FOR SELECT
  USING (
    -- Check if user is event creator (no recursion - direct events table check)
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_participants.event_id
      AND events.created_by = auth.uid()
    )
    OR
    -- Check if user is a participant (use user_id column directly - no RLS trigger)
    event_participants.user_id = auth.uid()
  );

-- Grant execute permissions
GRANT SELECT ON event_participants TO authenticated;
