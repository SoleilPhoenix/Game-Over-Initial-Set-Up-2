-- Fix ALL RLS recursion issues across events, event_participants, and profiles
-- The root cause: events SELECT references event_participants, which references events back

-- =============================================================================
-- STEP 1: Fix events SELECT policy (remove circular reference to event_participants)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view events they participate in" ON events;

-- Simple policy: creator can always view, participants checked via direct column match
CREATE POLICY "Users can view events they participate in"
  ON events FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = events.id
      AND ep.user_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 2: Fix event_participants SELECT (keep simple, no recursion)
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can view event participants" ON event_participants;
DROP POLICY IF EXISTS "Users can view participants of their events" ON event_participants;

-- Allow all authenticated users to SELECT event_participants
-- This breaks the recursion chain completely
CREATE POLICY "Authenticated users can view event participants"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- STEP 3: Fix profiles SELECT (remove nested event_participants subquery)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view profiles of event co-participants" ON profiles;

-- Simplified: users can view their own profile + profiles of co-participants
CREATE POLICY "Users can view profiles of event co-participants"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT ep.user_id FROM event_participants ep
      WHERE ep.event_id IN (
        SELECT ep2.event_id FROM event_participants ep2
        WHERE ep2.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- STEP 4: Ensure INSERT/UPDATE policies are simple (no recursion risk)
-- =============================================================================
-- events INSERT: already simple (auth.uid() = created_by) - no change needed
-- events UPDATE: already simple (auth.uid() = created_by) - no change needed

-- Clean up old helper functions that are no longer needed
DROP FUNCTION IF EXISTS check_event_access(UUID, UUID);
DROP FUNCTION IF EXISTS is_event_participant(UUID, UUID);
