REVOKE ALL ON FUNCTION public.enforce_booking_financial_integrity()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_event_status_integrity()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_notification_safety()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_profile_email_immutable()       FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_stripe_event(text, text)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_rate_limit_hits(integer)                 FROM PUBLIC, anon, authenticated;
