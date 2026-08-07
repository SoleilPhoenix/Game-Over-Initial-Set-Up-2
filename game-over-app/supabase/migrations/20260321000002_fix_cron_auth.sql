-- Fix cron job authentication
--
-- Both edge functions (process-payment-reminders, send-final-briefing) were updated to
-- require a CRON_SECRET bearer token instead of the service role key, as a defence-in-depth
-- measure (service role key should never travel over HTTP headers unnecessarily).
--
-- This migration replaces both cron jobs to send CRON_SECRET from Vault.
--
-- PREREQUISITE: Before applying this migration, store CRON_SECRET in Supabase Vault:
--   Supabase Dashboard → Vault → New Secret → name: "CRON_SECRET", value: <random secret>
-- And set the same value as a function secret:
--   npx supabase secrets set CRON_SECRET=<same value> --project-ref stdbvehmjpmqbjyiodqg

-- Replace process-payment-reminders cron job
SELECT cron.unschedule('process-payment-reminders');
SELECT cron.schedule(
  'process-payment-reminders',
  '0 9 * * *', -- 9:00 AM UTC daily
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

-- Replace send-final-briefing cron job
SELECT cron.unschedule('send-final-briefing-daily');
SELECT cron.schedule(
  'send-final-briefing-daily',
  '0 9 * * *', -- 9:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL')
           || '/functions/v1/send-final-briefing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET')
    ),
    body := '{}'::jsonb
  );
  $$
);
