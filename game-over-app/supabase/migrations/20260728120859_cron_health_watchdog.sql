-- Cron health watchdog.
--
-- Context: jobs 'send-final-briefing-daily' and 'process-payment-reminders' failed on every
-- single run for months without anyone noticing, because cron.schedule() stores its command as
-- plain text and only parses it at execution time, inside a background worker whose errors go to
-- the Postgres log and nowhere else. This watchdog closes that gap.
--
-- It checks the whole delivery chain, not just the last job result. That distinction matters:
-- net.http_post is fire-and-forget - it queues a request and returns immediately - so once the
-- config is correct, cron.job_run_details reports 'succeeded' even when the edge function answers
-- 503 or 401. Watching job results alone would be blind to exactly that case.
--
-- Written in pure SQL on purpose, following the notify-due-refunds precedent, so the watchdog
-- cannot be taken down by the same class of bug it exists to catch.

-- ── Recipients ────────────────────────────────────────────────────────────────
-- Deliberately a separate table rather than a profiles.is_admin flag: users can already update
-- their own profiles row, so a privilege column there would need a column-level guard to stop
-- self-promotion. Nothing outside the service role can see or change this list.

create table if not exists public.ops_alert_recipients (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ops_alert_recipients enable row level security;
-- RLS on with no policies = deny for anon/authenticated; the service role bypasses RLS.
revoke all on table public.ops_alert_recipients from anon, authenticated;

comment on table public.ops_alert_recipients is
  'Operators who receive ops_cron_health notifications. Service-role writable only.';

-- ── Watchdog ──────────────────────────────────────────────────────────────────

create or replace function public.check_cron_health()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  inserted integer := 0;
  recipients integer;
begin
  select count(*) into recipients from public.ops_alert_recipients;
  if recipients = 0 then
    -- Not fatal, but it means every alert below would be discarded silently.
    raise warning 'check_cron_health: no rows in ops_alert_recipients, alerts have nowhere to go';
    return 0;
  end if;

  with problems as (
    -- Preflight 1: the extension the HTTP jobs depend on.
    select 'config:pg_net'::text as check_key,
           'Cron HTTP disabled'::text as title,
           'pg_net is not installed, so scheduled jobs cannot call edge functions.'::text as body
     where not exists (select 1 from pg_extension e where e.extname = 'pg_net')

    union all

    -- Preflight 2: the Vault secrets both cron commands read at execution time.
    -- Without these the jobs post to a NULL url, which fails just as quietly.
    select 'config:vault:' || expected.name,
           'Cron secret missing',
           'Vault secret "' || expected.name || '" is missing, so scheduled jobs cannot build a valid request.'
      from (values ('SUPABASE_URL'), ('CRON_SECRET')) as expected(name)
     where not exists (
       select 1 from vault.decrypted_secrets secrets where secrets.name = expected.name
     )

    union all

    -- Job level: most recent run of any active job errored.
    select 'job:' || j.jobname,
           'Scheduled job failing',
           'Cron job "' || j.jobname || '" failed on its last run: ' ||
             left(coalesce(latest.return_message, 'unknown error'), 300)
      from cron.job j
      join lateral (
        select d.status, d.return_message
          from cron.job_run_details d
         where d.jobid = j.jobid
         order by d.start_time desc
         limit 1
      ) latest on true
     where j.active
       and latest.status = 'failed'

    union all

    -- HTTP level: the job succeeded in queueing, but the edge function refused the call.
    -- One row per distinct status code so a repeated failure does not fan out into many alerts.
    select 'http:' || coalesce(worst.status_code::text, 'no_response'),
           'Edge function rejected cron call',
           'A scheduled HTTP call returned ' || coalesce(worst.status_code::text, 'no response') ||
             ': ' || left(coalesce(worst.content, worst.error_msg, ''), 200)
      from (
        select distinct on (r.status_code)
               r.status_code, r.content, r.error_msg
          from net._http_response r
         where r.created > now() - interval '24 hours'
           and (r.status_code is null or r.status_code < 200 or r.status_code >= 300)
         order by r.status_code, r.created desc
      ) worst
  ),
  fanned as (
    insert into public.notifications (user_id, type, title, body, metadata)
    select rcpt.user_id,
           'ops_cron_health',
           p.title,
           p.body,
           jsonb_build_object('checkKey', p.check_key, 'detectedAt', now())
      from problems p
      cross join public.ops_alert_recipients rcpt
     -- Re-alert policy: stay quiet while an identical alert is still unread, so a config
     -- problem that persists for a week produces one notification, not seven. Marking it read
     -- re-arms it. Swap this predicate for a time-based cooldown if you would rather be nagged.
     where not exists (
       select 1
         from public.notifications n
        where n.user_id = rcpt.user_id
          and n.type = 'ops_cron_health'
          and n.is_read = false
          and n.metadata->>'checkKey' = p.check_key
     )
    returning 1
  )
  select count(*) into inserted from fanned;

  return inserted;
end $$;

revoke all on function public.check_cron_health() from public, anon, authenticated;

comment on function public.check_cron_health() is
  'Checks pg_net, Vault secrets, last cron run status and recent pg_net HTTP responses; '
  'notifies ops_alert_recipients. Returns the number of notifications inserted.';

-- ── Schedule ──────────────────────────────────────────────────────────────────
-- 09:45 UTC: after send-final-briefing (09:00), process-payment-reminders (09:15) and
-- notify-due-refunds (09:30), and well inside pg_net's response retention window.

select cron.unschedule('check-cron-health')
 where exists (select 1 from cron.job where jobname = 'check-cron-health');

select cron.schedule('check-cron-health', '45 9 * * *', $$select public.check_cron_health();$$);
