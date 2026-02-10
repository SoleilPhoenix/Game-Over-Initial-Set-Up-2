-- FINAL FIX: Disable RLS for SELECT on event_participants entirely
-- Check permissions at channel/message level instead

-- Drop ALL existing policies on event_participants SELECT
DROP POLICY IF EXISTS "Users can view participants of their events" ON event_participants;

-- Create permissive SELECT policy that allows all authenticated users
-- Permissions will be enforced at the channel/message level instead
CREATE POLICY "Authenticated users can view event participants"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

-- Keep restrictive policies for INSERT/UPDATE/DELETE
-- (These don't cause recursion since they're not querying the same table)
