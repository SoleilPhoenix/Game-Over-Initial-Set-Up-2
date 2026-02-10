-- Fix infinite recursion in event_participants RLS policies
-- The original policy had a self-referencing query that caused recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants of their events" ON event_participants;

-- Recreate with a non-recursive approach using a helper function
CREATE OR REPLACE FUNCTION is_event_participant(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policy using the helper function
CREATE POLICY "Users can view participants of their events"
  ON event_participants FOR SELECT
  USING (
    -- User can see participants if they are the event creator
    event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    OR
    -- OR if they are a participant themselves (using helper function to avoid recursion)
    is_event_participant(event_id, auth.uid())
  );
