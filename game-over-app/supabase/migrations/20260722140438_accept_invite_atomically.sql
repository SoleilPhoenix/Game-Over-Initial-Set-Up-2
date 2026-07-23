-- Formalise the server-authoritative, atomic invite acceptance function.
--
-- This function was already applied to the production database out-of-band but
-- never captured in a migration (DB drift). This file records it so the repo and
-- a fresh database match production, and tightens EXECUTE to authenticated only.
--
-- Acceptance runs entirely server-side: a guest can no longer self-insert into
-- event_participants (the old permissive INSERT policy is dropped below), and
-- validate + insert + use_count increment happen under a single FOR UPDATE lock,
-- so concurrent joins cannot exceed max_uses.
--
-- The return shape (success, event_id, reason) is the one already live; the
-- client (invitesRepository.accept) reads exactly these columns.

CREATE OR REPLACE FUNCTION public.accept_invite(p_code text)
  RETURNS TABLE(success boolean, event_id uuid, reason text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_invite invite_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'unauthenticated'::text;
    RETURN;
  END IF;

  SELECT * INTO v_invite
    FROM invite_codes
    WHERE code = upper(p_code)
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'not_found'::text;
    RETURN;
  END IF;

  IF NOT v_invite.is_active THEN
    RETURN QUERY SELECT false, v_invite.event_id, 'inactive'::text;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= NOW() THEN
    RETURN QUERY SELECT false, v_invite.event_id, 'expired'::text;
    RETURN;
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT false, v_invite.event_id, 'max_uses_reached'::text;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_id = v_invite.event_id AND user_id = v_uid
  ) THEN
    RETURN QUERY SELECT true, v_invite.event_id, 'already_participant'::text;
    RETURN;
  END IF;

  INSERT INTO event_participants (event_id, user_id, role, invited_via, confirmed_at)
  VALUES (v_invite.event_id, v_uid, 'guest', 'link', NOW());

  UPDATE invite_codes
    SET use_count = use_count + 1
    WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_invite.event_id, NULL::text;
END;
$function$;

-- Acceptance requires an authenticated caller; anon has no business executing it.
REVOKE ALL ON FUNCTION public.accept_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;

-- The permissive self-insert policy is obsolete now that acceptance is the only
-- way in. Already absent in production; kept here idempotently for fresh databases.
DROP POLICY IF EXISTS "Users can join events as participant"
  ON public.event_participants;
