-- Fix RLS recursion properly by disabling RLS inside security definer function
-- Drop old broken function and policy
DROP POLICY IF EXISTS "Users can view participants of their events" ON event_participants;
DROP FUNCTION IF EXISTS is_event_participant(UUID, UUID);

-- Create function that bypasses RLS completely
CREATE OR REPLACE FUNCTION check_event_access(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_creator BOOLEAN;
  is_participant BOOLEAN;
BEGIN
  -- Check if user created the event (bypasses RLS by checking events table directly)
  SELECT EXISTS(SELECT 1 FROM events WHERE id = p_event_id AND created_by = p_user_id)
  INTO is_creator;

  IF is_creator THEN
    RETURN TRUE;
  END IF;

  -- Check participation without triggering RLS (using SET LOCAL to bypass RLS temporarily)
  SET LOCAL row_security = off;
  SELECT EXISTS(SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id)
  INTO is_participant;
  SET LOCAL row_security = on;

  RETURN is_participant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policy using the non-recursive function
CREATE POLICY "Users can view participants of their events"
  ON event_participants FOR SELECT
  USING (check_event_access(event_id, auth.uid()));
