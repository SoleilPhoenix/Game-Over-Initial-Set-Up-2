-- Allow everyone who belongs to an event to send notifications to that event's honoree.
--
-- Until now the honoree was unreachable: "Organizers can notify event guests" only
-- covers role = 'guest', and 'honoree' became its own role in
-- 20260806073606_honoree_participant_role.sql. That left the honoree cut off from
-- chat messages and from every app-initiated reminder.
--
-- The honoree pays their own share of the package price (see the honoree share RPC
-- from the same migration), so being reachable is not a convenience - without it
-- they cannot act on what the group asks of them. Organizers and guests alike need
-- to reach them, which is why the sender side accepts both.
--
-- Note this does NOT let the honoree see any figures; that restriction lives in the
-- bookings policies and in src/utils/permissions.ts, and stays untouched here.
DROP POLICY IF EXISTS "Event members can notify the event honoree" ON notifications;
CREATE POLICY "Event members can notify the event honoree"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- The sender belongs to the event: either its creator or one of its participants.
  -- Organizers do not necessarily carry a participant row - events.created_by is the
  -- only source of truth for that role - so both cases have to be spelled out.
  (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = notifications.event_id
        AND e.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = notifications.event_id
        AND ep.user_id = auth.uid()
    )
  )
  AND
  -- The recipient is the honoree of that same event.
  EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = notifications.event_id
      AND ep.user_id = notifications.user_id
      AND ep.role = 'honoree'
  )
);
