-- Enable pg_net so the scheduled cron jobs can actually issue HTTP calls.
--
-- Root cause:
-- Cron job 'send-final-briefing-daily' (09:00 UTC) and 'process-payment-reminders'
-- (09:15 UTC) both call net.http_post(...), but pg_net was never installed on this
-- project. cron.schedule() stores its command as plain text and never parses it, so
-- scheduling succeeded while every single execution failed at runtime with:
--   ERROR: schema "net" does not exist
-- Net effect: the 24h-before event briefing and the overdue-deposit payment reminders
-- have never fired since the day they were scheduled.
--
-- Why no change to the cron command bodies is needed:
-- pg_net is not relocatable (pg_net.control: relocatable = false) and its install
-- script hardcodes its own namespace - sql/pg_net.sql line 1 is
-- `create schema if not exists net;`, and every function is defined as net.http_get /
-- net.http_post / net.http_delete. There is no 'extensions.http_post'. Installing the
-- extension WITH SCHEMA extensions would only record a misleading extension schema
-- while the functions still land in `net`, so it is deliberately omitted here.
-- The `net.http_post` references already written by 20260321000002 and 20260323000001
-- are therefore correct as-is, and installing the extension is the entire fix.
--
-- Related: cron job 'notify-due-refunds' (09:30 UTC) is pure SQL and calls
-- public.notify_due_refunds() directly, so it was never affected by this bug.

create extension if not exists pg_net;

-- Both cron commands read their URL and bearer token from Vault at execution time.
-- pg_net being present is necessary but not sufficient: a missing Vault secret makes
-- net.http_post fire at a NULL url, which fails just as silently. Report that here so
-- a half-fixed state is visible at apply time rather than at 09:00 UTC tomorrow.
do $$
declare
  missing text[];
begin
  select array_agg(expected.name order by expected.name)
    into missing
    from (values ('SUPABASE_URL'), ('CRON_SECRET')) as expected(name)
   where not exists (
     select 1
       from vault.decrypted_secrets secrets
      where secrets.name = expected.name
   );

  if missing is not null then
    raise warning
      'pg_net installed, but cron jobs will still fail: missing Vault secret(s): %. Add them via Dashboard -> Project Settings -> Vault.',
      array_to_string(missing, ', ');
  else
    raise notice 'Vault secrets SUPABASE_URL and CRON_SECRET are both present.';
  end if;
end $$;
