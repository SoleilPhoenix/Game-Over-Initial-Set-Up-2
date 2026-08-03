-- Expose only the calling user's membership, never the protected recipient list.
CREATE OR REPLACE FUNCTION public.is_ops_alert_recipient()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.ops_alert_recipients
       WHERE user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_ops_alert_recipient() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ops_alert_recipient() TO authenticated;

COMMENT ON FUNCTION public.is_ops_alert_recipient() IS
  'Returns whether the authenticated caller may see ops_cron_health notifications.';
