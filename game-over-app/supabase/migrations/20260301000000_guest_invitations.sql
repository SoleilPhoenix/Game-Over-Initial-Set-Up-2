-- Guest Invitations table
-- Records every platform-sent invitation (email/SMS/WhatsApp) per guest slot.
-- Used to show the organizer per-guest delivery status in Manage Invitations.

create table if not exists guest_invitations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  slot_index   int  not null,
  channel      text not null check (channel in ('email', 'sms', 'whatsapp')),
  recipient    text not null,
  status       text not null default 'pending'
                 check (status in ('pending', 'sent', 'failed', 'invalid')),
  error        text,
  invite_code  text,
  sent_at      timestamptz default now(),
  created_at   timestamptz default now()
);

-- Index for fast lookups by event
create index if not exists guest_invitations_event_id_idx
  on guest_invitations(event_id);

-- RLS
alter table guest_invitations enable row level security;

-- Organizer can read invitations for their own events
create policy "organizer reads own invitations"
  on guest_invitations for select
  using (
    event_id in (
      select id from events where created_by = auth.uid()
    )
  );

-- Only edge functions (service role) can insert/update — no client-side writes
-- (service role bypasses RLS by default)
