-- Add party_type to the anonymous invite-preview RPC so the guest accept screen
-- can label the event "Bachelor Party (JGA)" / "Bachelorette Party (JGA)".
--
-- Adding a column changes the function's return type, so this DROPs and
-- recreates rather than CREATE OR REPLACE. Applied to production via Supabase
-- MCP and recorded as version 20260723041729; this file mirrors it so repo and
-- database stay in sync (a later `db push` sees it as already applied).

DROP FUNCTION IF EXISTS public.get_invite_preview(text);

CREATE OR REPLACE FUNCTION public.get_invite_preview(p_code text)
 RETURNS TABLE(event_id uuid, event_title text, honoree_name text, city_name text, city_id uuid, start_date text, organizer_name text, accepted_count bigint, expires_at timestamp with time zone, max_uses integer, use_count integer, guest_first_name text, guest_last_name text, guest_email text, guest_phone text, party_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id                                                          AS event_id,
    COALESCE(e.title, e.honoree_name || '''s Party')              AS event_title,
    e.honoree_name,
    c.name                                                        AS city_name,
    e.city_id,
    e.start_date::TEXT                                            AS start_date,
    COALESCE(p.full_name, 'The organizer')                        AS organizer_name,
    (
      SELECT COUNT(*)::BIGINT
      FROM   event_participants ep
      WHERE  ep.event_id = e.id
        AND  ep.role = 'guest'
        AND  ep.confirmed_at IS NOT NULL
    )                                                             AS accepted_count,
    ic.expires_at,
    ic.max_uses,
    ic.use_count,
    ic.guest_first_name,
    ic.guest_last_name,
    ic.guest_email,
    ic.guest_phone,
    e.party_type::TEXT                                            AS party_type
  FROM  invite_codes ic
  JOIN  events   e ON e.id  = ic.event_id
  LEFT  JOIN cities   c ON c.id  = e.city_id
  LEFT  JOIN profiles p ON p.id  = e.created_by
  WHERE ic.code      = upper(p_code)
    AND ic.is_active = true
    AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
    AND (ic.max_uses  IS NULL OR ic.use_count < ic.max_uses)
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon, authenticated;
