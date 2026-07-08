-- =============================================================================
-- Edge-function rate limiting (M6)
-- =============================================================================
-- Fixed-window counter keyed by (bucket, identifier, window_start). Cost-bearing
-- endpoints (Stripe intent creation, Twilio/SendGrid invitations) call
-- check_rate_limit() to throttle abuse and cost-amplification.
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  bucket       text        NOT NULL,
  identifier   text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, identifier, window_start)
);

-- Only the service role (edge functions) touches this table.
ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

-- Atomically increment the current window's counter and report whether the
-- caller is still within budget. Returns true when allowed, false when over.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket         text,
  p_identifier     text,
  p_max            integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
BEGIN
  INSERT INTO rate_limit_hits (bucket, identifier, window_start, count)
  VALUES (p_bucket, p_identifier, v_window_start, 1)
  ON CONFLICT (bucket, identifier, window_start)
  DO UPDATE SET count = rate_limit_hits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- Housekeeping: prune stale windows. Call from an existing cron function or
-- schedule separately; not required for correctness.
CREATE OR REPLACE FUNCTION public.prune_rate_limit_hits(p_older_than_seconds integer DEFAULT 3600)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM rate_limit_hits
  WHERE window_start < now() - make_interval(secs => p_older_than_seconds);
$$;

GRANT EXECUTE ON FUNCTION public.prune_rate_limit_hits(integer) TO service_role;
