-- Enable pg_cron extension (requires Supabase Pro or pg_cron enabled in Dashboard)
-- Navigate to: Database → Extensions → enable "pg_cron"

-- Schedule: run daily at 09:00 UTC to check for events 3 days away
select cron.schedule(
  'send-final-briefing-daily',   -- job name (unique)
  '0 9 * * *',                   -- every day at 09:00 UTC
  $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/send-final-briefing',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := '{}'::jsonb
      )
  $$
);
