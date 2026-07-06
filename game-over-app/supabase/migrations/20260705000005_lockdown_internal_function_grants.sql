-- =============================================================================
-- Lock down EXECUTE on internal SECURITY DEFINER functions
-- =============================================================================
-- Postgres grants EXECUTE to PUBLIC by default on function creation. That left
-- internal helpers callable by anon/authenticated over PostgREST. Most dangerous:
-- claim_stripe_event — a user could pre-claim a Stripe event id so the webhook
-- treats a real payment as "already processed" and never confirms the booking.
--
-- These functions must only run as triggers or via the service role. The
-- guest-facing RPCs (get_invite_status, accept_invite) are intentionally left
-- executable by anon/authenticated and are NOT revoked here.
-- =============================================================================

-- Trigger functions: fire as table owner regardless of grants, so no role needs
-- EXECUTE. Remove the implicit PUBLIC grant entirely.
REVOKE ALL ON FUNCTION public.enforce_booking_financial_integrity()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_event_status_integrity()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_notification_safety()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_profile_email_immutable()       FROM PUBLIC, anon, authenticated;

-- Service-role-only helpers: keep the explicit service_role grant, drop PUBLIC.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_stripe_event(text, text)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_rate_limit_hits(integer)                 FROM PUBLIC, anon, authenticated;
