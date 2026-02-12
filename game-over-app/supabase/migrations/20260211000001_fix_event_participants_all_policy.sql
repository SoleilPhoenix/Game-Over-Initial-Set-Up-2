-- Fix RLS recursion in "Event creators can manage participants" ALL policy.
-- The old policy did: event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
-- This triggers the events SELECT policy, which reads event_participants, causing recursion.
--
-- Fix: Use a SECURITY DEFINER function to bypass RLS when checking event ownership.

-- Helper function that checks event ownership WITHOUT triggering events RLS
CREATE OR REPLACE FUNCTION public.is_event_creator(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND created_by = auth.uid()
  );
$$;

-- Helper function that checks participant membership WITHOUT triggering events RLS
CREATE OR REPLACE FUNCTION public.is_event_participant(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_participants WHERE event_id = p_event_id AND user_id = auth.uid()
  );
$$;

-- Replace the ALL policy on event_participants
DROP POLICY IF EXISTS "Event creators can manage participants" ON event_participants;

CREATE POLICY "Event creators can manage participants"
  ON event_participants FOR ALL
  USING (public.is_event_creator(event_id));

-- Replace the events SELECT policy to use SECURITY DEFINER function
-- This avoids any possible recursion through event_participants policies
DROP POLICY IF EXISTS "Users can view events they participate in" ON events;

CREATE POLICY "Users can view events they participate in"
  ON events FOR SELECT
  USING (
    auth.uid() = created_by
    OR public.is_event_participant(id)
  );
