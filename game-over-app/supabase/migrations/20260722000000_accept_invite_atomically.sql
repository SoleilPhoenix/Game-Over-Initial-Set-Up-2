-- Accept invite codes through one server-authoritative, atomic operation.
-- Direct guest inserts are no longer allowed after this migration.

CREATE OR REPLACE FUNCTION public.accept_invite(p_code TEXT)
RETURNS TABLE (event_id UUID, joined BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite public.invite_codes%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_inserted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to accept an invite.'
      USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.invite_codes
  WHERE code = UPPER(TRIM(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite code was not found.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT COALESCE(v_invite.is_active, false) THEN
    RAISE EXCEPTION 'Invite code is inactive.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Invite code has expired.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.max_uses IS NOT NULL
     AND COALESCE(v_invite.use_count, 0) >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Invite code has reached its maximum number of uses.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.event_participants (
    event_id,
    user_id,
    role,
    invited_via,
    confirmed_at
  )
  VALUES (
    v_invite.event_id,
    v_user_id,
    'guest',
    'link',
    NOW()
  )
  ON CONFLICT (event_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- An existing participant is an idempotent success and must not consume the
  -- same invite again.
  IF v_inserted_count > 0 THEN
    UPDATE public.invite_codes
    SET use_count = COALESCE(use_count, 0) + 1
    WHERE id = v_invite.id;
  END IF;

  RETURN QUERY
  SELECT v_invite.event_id, v_inserted_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Users can join events as participant"
  ON public.event_participants;
