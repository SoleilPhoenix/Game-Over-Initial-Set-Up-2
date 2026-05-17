-- Allow any event participant (not just organizers) to create polls
-- The previous policy restricted poll creation to organizers only.

DROP POLICY IF EXISTS "Event organizers can create polls" ON polls;

CREATE POLICY "Event participants can create polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    event_id IN (
      SELECT event_id FROM event_participants
      WHERE user_id = auth.uid()
    )
  );
