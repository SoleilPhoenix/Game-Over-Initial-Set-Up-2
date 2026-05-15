-- Allow authenticated users to insert notifications targeting an event organizer,
-- as long as the inserting user is a participant of that event.
-- This enables guests to notify organizers (e.g. "Guest Updated Profile", "Guest Joined").
CREATE POLICY "Participants can notify event organizer"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- The notification must be for an event the current user participates in
  EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = notifications.event_id
      AND ep.user_id = auth.uid()
  )
  AND
  -- The recipient (user_id) must be the organizer of that event
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = notifications.event_id
      AND e.created_by = notifications.user_id
  )
);
