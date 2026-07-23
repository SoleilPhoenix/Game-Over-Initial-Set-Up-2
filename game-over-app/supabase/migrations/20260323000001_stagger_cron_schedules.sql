-- Stagger pg_cron job schedules to prevent simultaneous DB load.
--
-- Previously both jobs ran at '0 9 * * *' (09:00 UTC) simultaneously.
-- send-final-briefing keeps 09:00 UTC.
-- process-payment-reminders moves to 09:15 UTC.

SELECT cron.unschedule('process-payment-reminders');
SELECT cron.schedule(
  'process-payment-reminders',
  '15 9 * * *', -- 09:15 UTC daily (staggered 15 min after send-final-briefing)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL')
           || '/functions/v1/process-payment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
