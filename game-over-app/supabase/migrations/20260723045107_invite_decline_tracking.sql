-- Track guest declines so the organizer's guest list can show "Abgelehnt".
-- Applied to production via Supabase MCP and recorded as version 20260723045107;
-- this file mirrors it so repo and database stay in sync.

ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS declined_at timestamptz;

-- A guest declining from the invite screen may not be authenticated, so this is
-- callable by anon and keyed only by the code (each guest has their own code).
-- Idempotent: re-declining is a no-op; accepting later is unaffected.
CREATE OR REPLACE FUNCTION public.decline_invite(p_code text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_found boolean;
BEGIN
  UPDATE public.invite_codes
     SET declined_at = COALESCE(declined_at, NOW())
   WHERE code = upper(p_code)
   RETURNING true INTO v_found;
  RETURN COALESCE(v_found, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.decline_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_invite(text) TO anon, authenticated;
