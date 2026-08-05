-- Kanal-Persistenz scharf schalten.
-- Bis hierher hatte chat_channels nur eine SELECT-Policy: jeder INSERT scheiterte mit 42501,
-- der Client fing das ab und legte den Kanal lokal in AsyncStorage an. Die Tabelle war deshalb
-- leer und der gesamte DB-Zweig im Client unerreichbar, obwohl er vollstaendig verdrahtet ist.

-- 1. Urheber festhalten. Ohne diese Spalte kann keine DELETE-Policy zwischen "mein Kanal" und
--    "fremder Kanal" unterscheiden, und das Kanal-Info-Sheet zeigt bei DB-Kanaelen "—".
alter table public.chat_channels
  add column if not exists created_by uuid references auth.users(id) on delete set null;

comment on column public.chat_channels.created_by is
  'Wer den Kanal angelegt hat. Traegt die DELETE-Policy und die "Erstellt von"-Zeile im Info-Sheet.';

-- 2. SELECT auf die SECURITY-DEFINER-Hilfsfunktion umstellen. Die bisherige Policy fragte
--    event_participants direkt ab - genau das Muster, das die 42P17-Rekursion ausgeloest hat.
--    Nie aufgefallen, weil die Tabelle leer war und die Policy nie eine Zeile pruefen musste.
drop policy if exists "Event participants can view channels" on public.chat_channels;
create policy "Event participants can view channels"
  on public.chat_channels for select
  using (public.is_event_participant(event_id));

-- 3. Anlegen: jeder Teilnehmer des Events, und nur auf eigenen Namen.
create policy "Event participants can create channels"
  on public.chat_channels for insert
  with check (public.is_event_participant(event_id) and created_by = auth.uid());

-- 4. Aendern: jeder Teilnehmer. Noetig, weil last_message_at beim Senden jeder Nachricht
--    fortgeschrieben wird; ohne UPDATE-Policy betrifft das still 0 Zeilen und die
--    Kanalsortierung friert ein.
create policy "Event participants can update channels"
  on public.chat_channels for update
  using (public.is_event_participant(event_id))
  with check (public.is_event_participant(event_id));

-- 5. Loeschen: der Urheber oder der Organisator des Events.
--    messages haengen per ON DELETE CASCADE daran, polls per SET NULL.
create policy "Creator or organizer can delete channels"
  on public.chat_channels for delete
  using (
    public.is_event_participant(event_id)
    and (created_by = auth.uid() or public.is_event_creator(event_id))
  );
