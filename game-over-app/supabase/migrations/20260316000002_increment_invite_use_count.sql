-- Atomically increment the use_count on an invite code after acceptance.
-- Called via RPC from the client so we can catch missing-function errors gracefully.

CREATE OR REPLACE FUNCTION public.increment_invite_use_count(invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invite_codes
  SET use_count = COALESCE(use_count, 0) + 1
  WHERE id = invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_invite_use_count(UUID) TO authenticated;
