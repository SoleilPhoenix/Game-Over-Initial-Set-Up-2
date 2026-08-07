DROP POLICY IF EXISTS "Users can join events as participant" ON event_participants;

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
