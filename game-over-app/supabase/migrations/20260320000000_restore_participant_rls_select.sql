-- Restore scoped RLS on event_participants SELECT.
-- The USING (true) policy exposed ALL participant data to ALL authenticated users.
-- The SECURITY DEFINER helper functions from 20260211000001 already exist.

DROP POLICY IF EXISTS "Authenticated users can view event participants" ON event_participants;

CREATE POLICY "Participants and creators can view event participants"
  ON event_participants FOR SELECT TO authenticated
  USING (
    public.is_event_creator(event_id)
    OR public.is_event_participant(event_id)
  );
