-- =============================================================================
-- event_participants authorization hardening
-- =============================================================================
-- Two pre-existing RLS flaws found in the adversarial audit:
--
--  HIGH (BOLA / uninvited join): the "Users can join events as participant"
--  INSERT policy only checked WITH CHECK (auth.uid() = user_id) with NO tie to
--  the event, so any authenticated user could add themselves to ANY event (given
--  its UUID) and read its chat, polls, bookings and participant list — bypassing
--  the invite flow entirely. Legitimate joins now go through the accept_invite
--  SECURITY DEFINER RPC (which validates the code and inserts as owner, bypassing
--  RLS), and the event creator adds participants via "Event creators can manage
--  participants". So this broad self-insert policy is no longer needed.
--
--  HIGH (privilege escalation): the "Users can update their own participation"
--  UPDATE policy had no WITH CHECK and no column restriction, letting a guest run
--  UPDATE event_participants SET role='organizer' on their own row. We keep the
--  policy (participants legitimately update confirmed_at / their own fields) but
--  add a trigger that forbids non-creator, non-service-role callers from changing
--  `role`.
-- =============================================================================

-- (1) Remove the overly-broad self-insert policy.
DROP POLICY IF EXISTS "Users can join events as participant" ON event_participants;

-- (2) Lock role changes to the event creator / service role.
CREATE OR REPLACE FUNCTION public.enforce_participant_role_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() <> 'service_role' AND NOT public.is_event_creator(NEW.event_id) THEN
      RAISE EXCEPTION 'Only the event organizer can change a participant role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_participant_role_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_participant_role_integrity ON event_participants;
CREATE TRIGGER trg_participant_role_integrity
  BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_participant_role_integrity();
