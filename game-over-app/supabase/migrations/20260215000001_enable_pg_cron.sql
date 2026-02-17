-- Enable pg_cron for scheduled payment reminder processing
-- Runs daily at 9:00 AM UTC

-- Enable the pg_cron extension (requires superuser / Supabase dashboard activation)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily payment reminder check at 9:00 AM UTC
-- Calls the process-payment-reminders edge function via pg_net
SELECT cron.schedule(
  'process-payment-reminders',
  '0 9 * * *', -- 9:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-payment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
