-- Refunds (hotel deposits, venue deposits, prepaid activities) were kept in
-- AsyncStorage under `gameover:refunds:<event id>`, so they lived on one device,
-- were lost on reinstall, and could not be reminded about. Tracking whether money
-- actually came back is exactly the kind of thing that needs to outlive a phone.

create table if not exists public.event_refunds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  -- Matches REFUND_TEMPLATES in the budget screen; null for a custom entry.
  template_key text,
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'received')),
  -- Optional deadline: by when the money should be back.
  expected_by date,
  received_at timestamptz,
  -- Throttles the reminder so an overdue refund nags weekly, not daily.
  last_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_refunds_event_id_idx on public.event_refunds (event_id);
-- Supports the reminder sweep without scanning settled rows.
create index if not exists event_refunds_due_idx
  on public.event_refunds (expected_by)
  where status = 'pending';

alter table public.event_refunds enable row level security;

-- Refund tracking is the organizer's ledger, not group-visible information.
-- `is_event_creator` is the existing SECURITY DEFINER helper; querying events
-- directly here would reintroduce the RLS recursion documented in CLAUDE.md.
drop policy if exists event_refunds_creator_select on public.event_refunds;
create policy event_refunds_creator_select on public.event_refunds
  for select to authenticated
  using (public.is_event_creator(event_id));

drop policy if exists event_refunds_creator_insert on public.event_refunds;
create policy event_refunds_creator_insert on public.event_refunds
  for insert to authenticated
  with check (public.is_event_creator(event_id) and created_by = (select auth.uid()));

drop policy if exists event_refunds_creator_update on public.event_refunds;
create policy event_refunds_creator_update on public.event_refunds
  for update to authenticated
  using (public.is_event_creator(event_id))
  with check (public.is_event_creator(event_id));

drop policy if exists event_refunds_creator_delete on public.event_refunds;
create policy event_refunds_creator_delete on public.event_refunds
  for delete to authenticated
  using (public.is_event_creator(event_id));

create or replace function public.touch_event_refunds_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists event_refunds_set_updated_at on public.event_refunds;
create trigger event_refunds_set_updated_at
  before update on public.event_refunds
  for each row execute function public.touch_event_refunds_updated_at();

-- Reminder sweep.
--
-- Deliberately plain SQL rather than an edge function: `pg_net` is not installed
-- on this project, so the two existing cron jobs that call net.http_post fail
-- every night with `schema "net" does not exist`. An in-app notification needs no
-- HTTP at all, so this one cannot break the same way.
create or replace function public.notify_due_refunds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  with due as (
    select r.id, r.event_id, r.created_by, r.description, r.amount_cents, r.expected_by
    from public.event_refunds r
    where r.status = 'pending'
      and r.expected_by is not null
      and r.expected_by <= current_date
      and (r.last_reminder_at is null or r.last_reminder_at < now() - interval '7 days')
  ), sent as (
    insert into public.notifications (user_id, event_id, type, title, body, action_url, metadata)
    select
      d.created_by,
      d.event_id,
      'refund_due',
      'Refund outstanding',
      d.description || ' has not been refunded yet.',
      '/event/' || d.event_id || '/budget',
      jsonb_build_object(
        'refundId', d.id,
        'description', d.description,
        'amountCents', d.amount_cents,
        'expectedBy', d.expected_by
      )
    from due d
    returning 1
  )
  update public.event_refunds r
     set last_reminder_at = now()
    from due d
   where r.id = d.id;

  get diagnostics inserted = row_count;
  return inserted;
end $$;

revoke all on function public.notify_due_refunds() from public, anon, authenticated;

select cron.unschedule('notify-due-refunds')
where exists (select 1 from cron.job where jobname = 'notify-due-refunds');

select cron.schedule('notify-due-refunds', '30 9 * * *', $$select public.notify_due_refunds();$$);
