REVOKE EXECUTE ON FUNCTION public.increment_invite_use_count(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "avatar_public_read" ON storage.objects;

ALTER FUNCTION public.generate_booking_reference()            SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()                       SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_invite_use_count(uuid)        SET search_path = public, pg_temp;
ALTER FUNCTION public.is_event_creator(uuid)                  SET search_path = public, pg_temp;
ALTER FUNCTION public.is_event_participant(uuid)              SET search_path = public, pg_temp;
ALTER FUNCTION public.set_booking_reference()                 SET search_path = public, pg_temp;
ALTER FUNCTION public.update_invite_codes_updated_at()        SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column()              SET search_path = public, pg_temp;

ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS payment_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_participant_update_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND auth.role() <> 'service_role'
     AND NOT public.is_event_creator(NEW.event_id)
  THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only the event organizer can change a participant role';
    END IF;
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Only the event organizer can confirm payment status';
    END IF;
    IF NEW.contribution_amount_cents IS DISTINCT FROM OLD.contribution_amount_cents THEN
      RAISE EXCEPTION 'Only the event organizer can set contribution amounts';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_participant_update_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_participant_role_integrity ON event_participants;
DROP TRIGGER IF EXISTS trg_participant_update_integrity ON event_participants;
CREATE TRIGGER trg_participant_update_integrity
  BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_participant_update_integrity();

DROP FUNCTION IF EXISTS public.enforce_participant_role_integrity();
