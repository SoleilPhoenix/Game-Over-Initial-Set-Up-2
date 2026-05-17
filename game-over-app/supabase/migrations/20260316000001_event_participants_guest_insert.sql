-- Allow authenticated users to insert themselves as event participants
-- This is needed when accepting an invite via invite code.
-- The is_event_creator ALL policy covers organizers; guests have no INSERT policy.
-- Auth check: user can only add themselves (auth.uid() = user_id).

CREATE POLICY "Users can join events as participant"
  ON event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);
