-- Allow event organizers to insert notifications targeting guests of their event.
-- This enables organizers to notify confirmed guests (e.g. "Organizer updated their details").
CREATE POLICY "Organizers can notify event guests"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- The inserting user must be the organizer (creator) of the event
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = notifications.event_id
      AND e.created_by = auth.uid()
  )
  AND
  -- The recipient (user_id) must be a participant (guest) of that event
  EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = notifications.event_id
      AND ep.user_id = notifications.user_id
      AND ep.role = 'guest'
  )
);
