-- =============================================================================
-- Invite code lookup + atomic accept (replaces the dropped public SELECT policy)
-- =============================================================================
-- Addresses:
--   C2  invite_codes no longer publicly enumerable — status lookup requires the
--       caller to present a specific code, and returns only validity info.
--   H3  accept() was validate -> insert -> increment across 3 non-atomic calls,
--       so two guests could both redeem the last slot. accept_invite() now takes
--       a row lock and does the check + participant insert + increment in one txn.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Status lookup: returns exactly one row for a known code, zero rows otherwise.
-- Exposes only what the invite screen needs to render a validity message — no
-- guest PII, and no way to enumerate other codes.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_invite_status(p_code text)
RETURNS TABLE (
  invite_id uuid,
  event_id  uuid,
  is_valid  boolean,
  reason    text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    ic.id,
    ic.event_id,
    (ic.is_active
      AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
      AND (ic.max_uses  IS NULL OR ic.use_count < ic.max_uses)) AS is_valid,
    CASE
      WHEN NOT ic.is_active THEN 'inactive'
      WHEN ic.expires_at IS NOT NULL AND ic.expires_at <= NOW() THEN 'expired'
      WHEN ic.max_uses   IS NOT NULL AND ic.use_count >= ic.max_uses THEN 'max_uses_reached'
      ELSE NULL
    END AS reason
  FROM invite_codes ic
  WHERE ic.code = upper(p_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_status(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Atomic accept. Uses auth.uid() internally (never trusts a client-passed id),
-- serialises concurrent redemptions with FOR UPDATE, and enforces max_uses in
-- the same transaction as the participant insert.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invite(p_code text)
RETURNS TABLE (
  success  boolean,
  event_id uuid,
  reason   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_invite invite_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'unauthenticated'::text;
    RETURN;
  END IF;

  -- Lock the invite row so two concurrent accepts of the last slot serialise.
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

  -- Idempotent: already a participant -> success without double-counting.
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
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
