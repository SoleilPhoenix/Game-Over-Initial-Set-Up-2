-- Migration: SECURITY DEFINER RPC for invite preview
-- Anonymous users cannot SELECT from events (RLS requires auth.uid() = created_by).
-- This function bypasses RLS safely and returns only the data needed for the invite preview.

CREATE OR REPLACE FUNCTION get_invite_preview(p_code TEXT)
RETURNS TABLE (
  event_id        UUID,
  event_title     TEXT,
  honoree_name    TEXT,
  city_name       TEXT,
  city_id         UUID,
  start_date      TEXT,
  organizer_name  TEXT,
  accepted_count  BIGINT,
  expires_at      TIMESTAMPTZ,
  max_uses        INTEGER,
  use_count       INTEGER,
  guest_first_name TEXT,
  guest_last_name  TEXT,
  guest_email      TEXT,
  guest_phone      TEXT
)
LANGUAGE SQL
SECURITY DEFINER   -- runs as DB owner, bypasses RLS on all joined tables
SET search_path = public
AS $$
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
    ic.guest_phone
  FROM  invite_codes ic
  JOIN  events   e ON e.id  = ic.event_id
  LEFT  JOIN cities   c ON c.id  = e.city_id
  LEFT  JOIN profiles p ON p.id  = e.created_by
  WHERE ic.code      = upper(p_code)
    AND ic.is_active = true
    AND (ic.expires_at IS NULL OR ic.expires_at > NOW())
    AND (ic.max_uses  IS NULL OR ic.use_count < ic.max_uses)
  LIMIT 1;
$$;

-- Allow both anonymous and authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_invite_preview(TEXT) TO anon, authenticated;
