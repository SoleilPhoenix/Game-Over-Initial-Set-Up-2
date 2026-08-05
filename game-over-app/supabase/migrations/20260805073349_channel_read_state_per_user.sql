-- Lesestand pro Nutzer statt eines gemeinsamen Zaehlers.
-- chat_channels.unread_count war eine einzelne Spalte auf einer geteilten Zeile: wer den Kanal
-- oeffnete, setzte den Zaehler fuer alle Teilnehmer zurueck. Das ist nie aufgefallen, weil die
-- Tabelle bis heute leer war; mit echter Persistenz waere es sofort sichtbar geworden.

-- 1. Lesestand je (Kanal, Nutzer).
create table if not exists public.channel_read_state (
  channel_id   uuid        not null references public.chat_channels(id) on delete cascade,
  user_id      uuid        not null references auth.users(id)          on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

comment on table public.channel_read_state is
  'Wann ein Nutzer einen Kanal zuletzt gelesen hat. Ersetzt chat_channels.unread_count, das als '
  'gemeinsame Spalte den Zaehler fuer alle Teilnehmer zugleich zurueckgesetzt hat.';

alter table public.channel_read_state enable row level security;

-- Jeder sieht und schreibt ausschliesslich seinen eigenen Lesestand, und nur in Kanaelen
-- von Events, an denen er teilnimmt.
create policy "Own read state is visible"
  on public.channel_read_state for select
  using (user_id = auth.uid());

create policy "Own read state can be created"
  on public.channel_read_state for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.chat_channels c
       where c.id = channel_id and public.is_event_participant(c.event_id)
    )
  );

create policy "Own read state can be updated"
  on public.channel_read_state for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists channel_read_state_user_idx
  on public.channel_read_state (user_id);

-- 2. Die geteilte Spalte faellt weg. Verlustfrei: chat_channels hat null Zeilen.
alter table public.chat_channels drop column if exists unread_count;

-- 3. Ungelesenes pro Nutzer als Sicht. security_invoker laesst die RLS der zugrunde liegenden
--    Tabellen greifen, statt sie mit den Rechten des Sicht-Eigentuemers zu umgehen.
create or replace view public.chat_channels_with_unread
  with (security_invoker = true) as
select
  c.*,
  (
    select count(*)
      from public.messages m
     where m.channel_id = c.id
       and m.user_id is distinct from auth.uid()
       and m.created_at > coalesce(
             (select r.last_read_at
                from public.channel_read_state r
               where r.channel_id = c.id and r.user_id = auth.uid()),
             '-infinity'::timestamptz)
  )::int as unread_count
from public.chat_channels c;

comment on view public.chat_channels_with_unread is
  'chat_channels plus unread_count des aufrufenden Nutzers. Eigene Nachrichten zaehlen nie mit.';
