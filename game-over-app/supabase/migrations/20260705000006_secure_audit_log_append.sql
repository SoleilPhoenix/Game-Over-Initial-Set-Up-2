-- =============================================================================
-- Secure append_booking_audit_log (ownership check + client lockdown)
-- =============================================================================
-- Pre-existing finding: append_booking_audit_log(booking_id, entry) was granted
-- to `authenticated` with NO ownership check, so any signed-in user could append
-- arbitrary JSON to ANY booking's audit_log (log pollution / forged entries).
--
-- Fix: (1) add an ownership guard inside the function (belt), and (2) revoke
-- EXECUTE from client roles so only the service role (webhooks) can call it,
-- since audit logging is a server-side concern (suspenders). The client no
-- longer calls this RPC.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.append_booking_audit_log(booking_id uuid, entry jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Non-service-role callers may only touch a booking on an event they own.
  IF auth.role() <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM bookings b
      JOIN events e ON e.id = b.event_id
      WHERE b.id = booking_id
        AND e.created_by = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Not authorized to modify this booking audit log';
    END IF;
  END IF;

  UPDATE bookings
  SET audit_log = COALESCE(audit_log, '[]'::jsonb) || jsonb_build_array(entry)
  WHERE id = booking_id;
END;
$$;

-- Audit logging is server-only now; drop the implicit/explicit client grants.
REVOKE EXECUTE ON FUNCTION public.append_booking_audit_log(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.append_booking_audit_log(uuid, jsonb) TO service_role;
