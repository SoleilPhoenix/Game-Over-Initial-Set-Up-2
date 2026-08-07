-- Fix: accept_invite threw "column reference \"event_id\" is ambiguous".
-- The RETURNS TABLE(... event_id uuid ...) column is an OUT variable in scope
-- inside the body. The EXISTS check used a bare `event_id`, which matched both
-- the event_participants column and the OUT variable (variable_conflict = error).
-- Aliasing the table and qualifying the column (ep.event_id) removes the ambiguity.
-- This bug broke every guest join: the RPC errored before inserting the
-- event_participants row, so guests never landed on the event and organizers
-- never saw the invite flip to "accepted".

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
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = v_invite.event_id AND ep.user_id = v_uid
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
