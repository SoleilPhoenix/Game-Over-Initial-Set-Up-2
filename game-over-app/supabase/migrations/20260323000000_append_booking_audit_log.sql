-- Atomic audit log append to prevent race conditions on concurrent Stripe webhook retries.
-- Using array_append semantics via jsonb concatenation ensures each entry is added
-- exactly once even if two requests read the same stale value simultaneously.

create or replace function append_booking_audit_log(
  booking_id uuid,
  entry jsonb
) returns void language sql security definer as $$
  update bookings
  set audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(entry)
  where id = booking_id;
$$;
