CREATE OR REPLACE FUNCTION public.append_booking_audit_log(booking_id uuid, entry jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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

REVOKE EXECUTE ON FUNCTION public.append_booking_audit_log(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.append_booking_audit_log(uuid, jsonb) TO service_role;
