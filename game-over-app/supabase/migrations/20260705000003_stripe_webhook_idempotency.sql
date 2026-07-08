-- =============================================================================
-- Stripe webhook idempotency ledger
-- =============================================================================
-- Addresses (perf/correctness finding L5/P4): the webhook derived idempotency
-- from the booking audit_log via read-modify-write, which can double-process
-- under concurrent Stripe retries. A dedicated ledger keyed by the immutable
-- Stripe event id gives exactly-once processing via a unique-insert guard.
-- =============================================================================

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id     text PRIMARY KEY,
  event_type   text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Only the service role (webhook) touches this table.
ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- Atomic claim: inserts the event id and returns true if this caller won the
-- race (first delivery), false if it was already processed. Runs as definer so
-- the webhook's service-role client can call it directly.
CREATE OR REPLACE FUNCTION public.claim_stripe_event(p_event_id text, p_event_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO processed_stripe_events (event_id, event_type)
  VALUES (p_event_id, p_event_type);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_stripe_event(text, text) TO service_role;
