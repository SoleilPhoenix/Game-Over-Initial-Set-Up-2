-- Weitere Kosten in die Datenbank.
--
-- Bis hierher lagen sie ausschliesslich im AsyncStorage des jeweiligen Geraets
-- (gameover:custom_cats:<eventId>). Wer einen Betrag eintrug, sah ihn nur selbst - womit der
-- Zweck der Funktion verfehlt war.
--
-- Owner-Entscheidung vom 06.08., die den ganzen Entwurf traegt: weitere Kosten stehen NEBEN
-- der Paketrechnung, nicht darin. Diese Migration fasst 'bookings' deshalb nicht an, erzeugt
-- keine Gesamtsumme ueber beide und aendert nichts an Anzahlung oder Restbetrag. Zwei
-- getrennte Kassenbuecher, zwei getrennte Wahrheiten - das Vermischen war der Fehler vom 05.08.

-- ---------------------------------------------------------------------------
-- 1. Hilfsfunktion: Teilnehmer, der Geld sehen darf
-- ---------------------------------------------------------------------------
-- is_event_participant() kennt die Rolle nicht. Der Ehrengast ist Teilnehmer, darf aber seit
-- 20260806073606 keine Betraege sehen. Ohne eine eigene Pruefung waeren die weiteren Kosten
-- genau das Schlupfloch, das diese Migration gerade geschlossen hat.
--
-- SECURITY DEFINER und die Abfrage NUR auf event_participants: kein Rueckgriff auf events,
-- keine Policy, die eine Policy triggert. Das Muster hat am 42P17-Vorfall unendliche Rekursion
-- ausgeloest und wird hier bewusst vermieden.
create or replace function public.can_see_event_money(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
    from public.event_participants ep
    where ep.event_id = p_event_id
      and ep.user_id = auth.uid()
      and ep.role <> 'honoree'::participant_role
  );
$function$;

revoke all on function public.can_see_event_money(uuid) from public;
revoke all on function public.can_see_event_money(uuid) from anon;
grant execute on function public.can_see_event_money(uuid) to authenticated;

comment on function public.can_see_event_money(uuid) is
  'Teilnehmer des Events, der KEIN Ehrengast ist. Traegt jede Policy auf event_expenses und
   event_expense_shares. Spiegelt die bookings-SELECT-Policy aus 20260806073606.';

-- ---------------------------------------------------------------------------
-- 2. Die Posten
-- ---------------------------------------------------------------------------
create table if not exists public.event_expenses (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  created_by     uuid references auth.users(id) on delete set null,
  paid_by        uuid references auth.users(id) on delete set null,
  title          text not null check (char_length(btrim(title)) between 1 and 120),
  category_key   text,
  amount_cents   integer not null check (amount_cents > 0),
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.event_expenses is
  'Weitere Kosten neben der Paketrechnung. Fliesst NICHT in bookings, nicht in Anzahlung,
   Restbetrag oder splitPerPerson ein - eigenes Kassenbuch (Owner-Entscheidung 06.08.).';
comment on column public.event_expenses.paid_by is
  'Wer ausgelegt hat. Die Gegenrichtung - wer sich beteiligen soll - steht in
   event_expense_shares und ist absichtlich eine eigene Tabelle, weil es mehrere sein koennen.';
comment on column public.event_expenses.category_key is
  'Schluessel der Kategorie. Zeigt entweder auf eine fest eingebaute Kategorie oder auf
   event_expense_categories.key. Bewusst kein Fremdschluessel und kein Enum: die eingebauten
   Kategorien stehen im Code, nicht in der Tabelle, und ein Enum wuerde die uebernommenen
   Altbestaende beim Hochschieben verwerfen.';

create index if not exists event_expenses_event_id_idx
  on public.event_expenses (event_id, occurred_at desc);

create trigger update_event_expenses_updated_at
  before update on public.event_expenses
  for each row execute function public.update_updated_at_column();

alter table public.event_expenses enable row level security;

-- SELECT: jeder zahlende Teilnehmer. Ehrengast ausgeschlossen.
create policy "Paying participants can view expenses"
  on public.event_expenses for select
  using (public.can_see_event_money(event_id));

-- INSERT: jeder zahlende Teilnehmer, und nur auf eigenen Namen.
create policy "Paying participants can create expenses"
  on public.event_expenses for insert
  with check (public.can_see_event_money(event_id) and created_by = auth.uid());

-- UPDATE/DELETE: Ersteller oder Organisator. Alle anderen sehen den Eintrag nur; wer ihn fuer
-- falsch haelt, meldet ihn (event_expense_reports) statt ihn zu aendern.
create policy "Creator or organizer can update expenses"
  on public.event_expenses for update
  using (
    public.can_see_event_money(event_id)
    and (created_by = auth.uid() or public.is_event_creator(event_id))
  )
  with check (
    public.can_see_event_money(event_id)
    and (created_by = auth.uid() or public.is_event_creator(event_id))
  );

create policy "Creator or organizer can delete expenses"
  on public.event_expenses for delete
  using (
    public.can_see_event_money(event_id)
    and (created_by = auth.uid() or public.is_event_creator(event_id))
  );

-- ---------------------------------------------------------------------------
-- 3. Die Anteile - wer sich beteiligen soll
-- ---------------------------------------------------------------------------
-- Owner-Antwort vom 06.08.: man markiert Personen, die sich beteiligen. Daran haengen beide
-- neuen Anforderungen - der Adressat der Push-Nachricht und der offene Betrag in der
-- Zahlungserinnerung. Ohne diese Tabelle gibt es weder das eine noch das andere.
create table if not exists public.event_expense_shares (
  id             uuid primary key default gen_random_uuid(),
  expense_id     uuid not null references public.event_expenses(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  amount_cents   integer not null check (amount_cents > 0),
  settled_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (expense_id, user_id)
);

comment on table public.event_expense_shares is
  'Wer sich an einem Posten beteiligen soll. settled_at is null = offen.
   Die Summe der Anteile MUSS den vollen Betrag des Postens ergeben - der ausgelegte Betrag
   wird immer restlos auf die Markierten verteilt (Owner-Entscheidung aus dem Review 06.08.).
   Wer markiert ist, entscheidet der Auslegende; ob er selbst dazugehoert, auch. Die Aufteilung
   muss nicht gleichmaessig sein - er kann je Person einen eigenen Betrag setzen.
   Erzwungen von trg_expense_shares_cover_amount, siehe unten.';

create index if not exists event_expense_shares_user_open_idx
  on public.event_expense_shares (user_id) where settled_at is null;
create index if not exists event_expense_shares_expense_idx
  on public.event_expense_shares (expense_id);

-- Hilfsfunktion, damit die Policies auf shares nicht selbst wieder ueber event_expenses
-- laufen und dessen RLS mit ausloesen. Liest nur die Zuordnung, keine Betraege.
create or replace function public.expense_event_id(p_expense_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select e.event_id from public.event_expenses e where e.id = p_expense_id;
$function$;

revoke all on function public.expense_event_id(uuid) from public;
revoke all on function public.expense_event_id(uuid) from anon;
grant execute on function public.expense_event_id(uuid) to authenticated;

alter table public.event_expense_shares enable row level security;

create policy "Paying participants can view shares"
  on public.event_expense_shares for select
  using (public.can_see_event_money(public.expense_event_id(expense_id)));

-- Anteile setzt, wer den Posten anlegt oder aendern darf: Ersteller oder Organisator.
create policy "Expense owner or organizer can add shares"
  on public.event_expense_shares for insert
  with check (
    public.can_see_event_money(public.expense_event_id(expense_id))
    and exists (
      select 1 from public.event_expenses e
      where e.id = expense_id
        and (e.created_by = auth.uid() or public.is_event_creator(e.event_id))
    )
  );

create policy "Expense owner or organizer can remove shares"
  on public.event_expense_shares for delete
  using (
    public.can_see_event_money(public.expense_event_id(expense_id))
    and exists (
      select 1 from public.event_expenses e
      where e.id = expense_id
        and (e.created_by = auth.uid() or public.is_event_creator(e.event_id))
    )
  );

-- UPDATE zusaetzlich fuer den Betroffenen selbst: er haken seinen eigenen Anteil als beglichen
-- ab. Den Betrag darf er dabei nicht anfassen - das erzwingt der Trigger unter Punkt 4.
create policy "Owner, organizer or the person themselves can update shares"
  on public.event_expense_shares for update
  using (
    public.can_see_event_money(public.expense_event_id(expense_id))
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.event_expenses e
        where e.id = expense_id
          and (e.created_by = auth.uid() or public.is_event_creator(e.event_id))
      )
    )
  )
  with check (
    public.can_see_event_money(public.expense_event_id(expense_id))
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.event_expenses e
        where e.id = expense_id
          and (e.created_by = auth.uid() or public.is_event_creator(e.event_id))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Betragsschutz: der Betroffene darf abhaken, nicht kuerzen
-- ---------------------------------------------------------------------------
-- Ohne diesen Trigger koennte jeder Markierte seinen eigenen Anteil auf 1 Cent setzen und die
-- UPDATE-Policy wuerde es durchlassen. Gleiche Logik wie der Integritaets-Trigger auf bookings.
create or replace function public.enforce_expense_share_integrity()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_may_edit boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT (e.created_by = auth.uid() or public.is_event_creator(e.event_id))
    INTO v_may_edit
    FROM public.event_expenses e
   WHERE e.id = NEW.expense_id;

  IF COALESCE(v_may_edit, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.expense_id IS DISTINCT FROM OLD.expense_id THEN
    RAISE EXCEPTION 'only the expense creator or the organizer may change a share amount';
  END IF;

  RETURN NEW;
END;
$function$;

create trigger trg_expense_share_integrity
  before update on public.event_expense_shares
  for each row execute function public.enforce_expense_share_integrity();

-- ---------------------------------------------------------------------------
-- 4b. Der ausgelegte Betrag wird restlos verteilt
-- ---------------------------------------------------------------------------
-- Owner-Entscheidung aus dem Review vom 06.08.: wer 200 Euro auslegt, teilt 200 Euro auf.
-- Nicht 199, nicht 201. Wer markiert ist und wie die Aufteilung aussieht, entscheidet der
-- Auslegende - die Summe steht fest.
--
-- Als CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED, weil die Anteile Zeile fuer Zeile
-- geschrieben werden: nach der ersten von drei Zeilen stimmt die Summe naturgemaess nicht.
-- Geprueft wird deshalb erst beim Commit, wenn alle Zeilen der Transaktion stehen.
--
-- Kein Anteil ueberhaupt = niemand markiert. Das ist der Zustand direkt nach dem Anlegen und
-- bleibt erlaubt; erst wer jemanden markiert, muss vollstaendig aufteilen.
create or replace function public.check_expense_shares_cover_amount()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_expense_id uuid;
  v_amount     integer;
  v_sum        bigint;
  v_count      integer;
BEGIN
  IF TG_TABLE_NAME = 'event_expenses' THEN
    v_expense_id := NEW.id;
  ELSE
    v_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);
  END IF;

  SELECT e.amount_cents INTO v_amount
    FROM public.event_expenses e WHERE e.id = v_expense_id;

  -- Posten geloescht, die Anteile sind per Cascade mitgegangen. Nichts zu pruefen.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*), COALESCE(sum(s.amount_cents), 0)
    INTO v_count, v_sum
    FROM public.event_expense_shares s
   WHERE s.expense_id = v_expense_id;

  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  IF v_sum <> v_amount THEN
    RAISE EXCEPTION
      'shares for expense % add up to % cents but the expense is % cents - the full amount must be distributed',
      v_expense_id, v_sum, v_amount
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$function$;

create constraint trigger trg_expense_shares_cover_amount
  after insert or update or delete on public.event_expense_shares
  deferrable initially deferred
  for each row execute function public.check_expense_shares_cover_amount();

-- Auch der umgekehrte Weg: wer den Betrag des Postens aendert, muss die Anteile mitziehen.
create constraint trigger trg_expense_amount_matches_shares
  after update of amount_cents on public.event_expenses
  deferrable initially deferred
  for each row execute function public.check_expense_shares_cover_amount();

-- ---------------------------------------------------------------------------
-- 5. Push an die Markierten
-- ---------------------------------------------------------------------------
-- Owner-Antwort vom 06.08.: wer markiert wird, wird darauf hingewiesen.
--
-- Warum als Trigger und nicht aus dem Client: die INSERT-Policies auf notifications erlauben
-- nur Teilnehmer -> Organisator und Organisator -> Gast. Ein Gast, der einen Posten anlegt und
-- andere Gaeste markiert, koennte sie auf keinem erlaubten Weg benachrichtigen. Der Trigger
-- laeuft als SECURITY DEFINER und trifft genau die Markierten - niemanden sonst.
--
-- Nicht an sich selbst. Nie an den Ehrengast: can_see_event_money haelt ihn aus den shares
-- heraus, hier steht die Pruefung trotzdem, weil ein spaeterer Service-Role-Schreiber die
-- Policy nicht durchlaeuft.
create or replace function public.notify_expense_share_assigned()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_expense public.event_expenses%ROWTYPE;
  v_role    participant_role;
BEGIN
  SELECT * INTO v_expense FROM public.event_expenses WHERE id = NEW.expense_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = v_expense.created_by THEN
    RETURN NEW;
  END IF;

  SELECT ep.role INTO v_role
    FROM public.event_participants ep
   WHERE ep.event_id = v_expense.event_id AND ep.user_id = NEW.user_id;

  IF NOT FOUND OR v_role = 'honoree'::participant_role THEN
    RETURN NEW;
  END IF;

  -- Nur beim ERSTEN Mal. set_expense_shares ersetzt die Anteile eines Postens komplett
  -- (loeschen, neu schreiben), also feuert dieser Trigger bei jeder Bearbeitung erneut fuer
  -- alle Beteiligten. Ohne diese Sperre bekaeme jemand, der seit dem ersten Tag markiert ist,
  -- bei jeder Korrektur am Betrag eine weitere Push-Nachricht.
  -- Owner-Vorgabe vom 06.08.: bei nachtraeglicher Erweiterung nur die neu Hinzugekommenen.
  IF EXISTS (
    SELECT 1 FROM public.notifications n
     WHERE n.user_id = NEW.user_id
       AND n.type = 'expense_share_assigned'
       AND n.metadata->>'expense_id' = v_expense.id::text
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, event_id, type, title, body, action_url, metadata)
  VALUES (
    NEW.user_id,
    v_expense.event_id,
    'expense_share_assigned',
    'Weitere Kosten',
    'Du sollst dich an "' || left(v_expense.title, 60) || '" beteiligen.',
    '/event/' || v_expense.event_id::text || '/budget',
    jsonb_build_object(
      'expense_id', v_expense.id,
      'share_id', NEW.id,
      'amount_cents', NEW.amount_cents
    )
  );

  RETURN NEW;
END;
$function$;

create trigger trg_notify_expense_share_assigned
  after insert on public.event_expense_shares
  for each row execute function public.notify_expense_share_assigned();

-- ---------------------------------------------------------------------------
-- 6. Beanstandungen
-- ---------------------------------------------------------------------------
-- Owner-Antwort vom 06.08.: Einspruch gegen eine Zahl, nicht Missbrauchsmeldung. Der Eintrag
-- bleibt bestehen und wird nur gekennzeichnet; der Organisator entscheidet.
--
-- Eigene Tabelle statt Spalten auf event_expenses, weil mehrere Leute denselben Posten
-- beanstanden koennen und der zweite Melder sonst den ersten ueberschreibt.
create table if not exists public.event_expense_reports (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.event_expenses(id) on delete cascade,
  reported_by  uuid not null references auth.users(id) on delete cascade,
  reason       text check (reason is null or char_length(reason) <= 500),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users(id) on delete set null,
  unique (expense_id, reported_by)
);

comment on table public.event_expense_reports is
  'Einspruch gegen einen Posten. resolved_at is null = offen, der Organisator entscheidet.
   Aendert den Posten nicht und loescht ihn nicht.';

create index if not exists event_expense_reports_open_idx
  on public.event_expense_reports (expense_id) where resolved_at is null;

alter table public.event_expense_reports enable row level security;

create policy "Paying participants can view reports"
  on public.event_expense_reports for select
  using (public.can_see_event_money(public.expense_event_id(expense_id)));

-- Melden darf jeder zahlende Teilnehmer, auf eigenen Namen, aber nicht den eigenen Posten.
create policy "Paying participants can report a foreign expense"
  on public.event_expense_reports for insert
  with check (
    public.can_see_event_money(public.expense_event_id(expense_id))
    and reported_by = auth.uid()
    and not exists (
      select 1 from public.event_expenses e
      where e.id = expense_id and e.created_by = auth.uid()
    )
  );

-- Erledigen darf der Organisator ODER der Ersteller des beanstandeten Postens
-- (Owner-Entscheidung aus dem Review vom 06.08.): in aller Regel korrigiert der Ersteller den
-- Betrag selbst und hakt die Meldung damit ab, ohne den Organisator zu bemuehen.
-- Zuruecknehmen darf der Melder seine eigene Meldung.
create policy "Organizer or expense creator can resolve reports"
  on public.event_expense_reports for update
  using (
    public.is_event_creator(public.expense_event_id(expense_id))
    or exists (
      select 1 from public.event_expenses e
      where e.id = expense_id and e.created_by = auth.uid()
    )
  )
  with check (
    public.is_event_creator(public.expense_event_id(expense_id))
    or exists (
      select 1 from public.event_expenses e
      where e.id = expense_id and e.created_by = auth.uid()
    )
  );

create policy "Reporter can withdraw their own report"
  on public.event_expense_reports for delete
  using (reported_by = auth.uid());

-- Der Organisator erfaehrt von der Beanstandung. Direkter Weg waere per Policy erlaubt
-- (Teilnehmer -> Organisator), laeuft hier aber ueber denselben Trigger-Weg wie oben, damit
-- der Client keine Benachrichtigungstexte selbst schreibt.
create or replace function public.notify_expense_reported()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_expense   public.event_expenses%ROWTYPE;
  v_organizer uuid;
BEGIN
  SELECT * INTO v_expense FROM public.event_expenses WHERE id = NEW.expense_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT e.created_by INTO v_organizer FROM public.events e WHERE e.id = v_expense.event_id;
  IF v_organizer IS NULL OR v_organizer = NEW.reported_by THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, event_id, type, title, body, action_url, metadata)
  VALUES (
    v_organizer,
    v_expense.event_id,
    'expense_reported',
    'Kostenpunkt beanstandet',
    'Ein Teilnehmer hat "' || left(v_expense.title, 60) || '" beanstandet.',
    '/event/' || v_expense.event_id::text || '/budget',
    jsonb_build_object('expense_id', v_expense.id, 'report_id', NEW.id)
  );

  RETURN NEW;
END;
$function$;

create trigger trg_notify_expense_reported
  after insert on public.event_expense_reports
  for each row execute function public.notify_expense_reported();

-- ---------------------------------------------------------------------------
-- 7. Eigene Kategorien - geteilt statt geraetelokal
-- ---------------------------------------------------------------------------
-- Owner-Entscheidung aus dem Review vom 06.08.: eigene Kategorien gehoeren in die Datenbank.
-- Eine Kategorie, die nur auf einem Geraet existiert, kann niemand sonst benutzen - dann legen
-- drei Leute dieselbe Kategorie dreimal an und die Zusammenstellung zerfaellt. Es ist derselbe
-- Fehler wie bei den Betraegen selbst, nur eine Ebene hoeher.
create table if not exists public.event_expense_categories (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  key         text not null check (char_length(btrim(key)) between 1 and 60),
  label       text not null check (char_length(btrim(label)) between 1 and 60),
  icon        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (event_id, key)
);

comment on table public.event_expense_categories is
  'Eigene Kostenkategorien eines Events, fuer alle zahlenden Teilnehmer sichtbar und nutzbar.
   Die fest eingebauten Kategorien stehen weiterhin im Code und nicht hier drin.';

create index if not exists event_expense_categories_event_idx
  on public.event_expense_categories (event_id);

alter table public.event_expense_categories enable row level security;

create policy "Paying participants can view categories"
  on public.event_expense_categories for select
  using (public.can_see_event_money(event_id));

create policy "Paying participants can create categories"
  on public.event_expense_categories for insert
  with check (public.can_see_event_money(event_id) and created_by = auth.uid());

-- Umbenennen und Loeschen nur fuer Ersteller oder Organisator - eine Kategorie, die andere
-- schon benutzen, soll nicht jeder unter ihnen wegziehen koennen.
create policy "Creator or organizer can update categories"
  on public.event_expense_categories for update
  using (
    public.can_see_event_money(event_id)
    and (created_by = auth.uid() or public.is_event_creator(event_id))
  )
  with check (
    public.can_see_event_money(event_id)
    and (created_by = auth.uid() or public.is_event_creator(event_id))
  );

create policy "Creator or organizer can delete categories"
  on public.event_expense_categories for delete
  using (
    public.can_see_event_money(event_id)
    and (created_by = auth.uid() or public.is_event_creator(event_id))
  );

-- ---------------------------------------------------------------------------
-- 8. Betrag und Aufteilung in einem Zug setzen
-- ---------------------------------------------------------------------------
-- Ohne diese Funktion waere die Summenregel aus 4b praktisch nicht bedienbar: PostgREST fuehrt
-- jede Anfrage in einer eigenen Transaktion aus. Wer den Betrag von 200 auf 250 Euro aendert und
-- danach die Anteile nachzieht, laeuft beim ersten Schritt in die Pruefung - die alten Anteile
-- decken den neuen Betrag ja nicht. Hier passiert beides in derselben Transaktion, und der
-- aufgeschobene Trigger prueft einmal am Ende.
--
-- p_shares ist ein Array aus {"user_id": "...", "amount_cents": 123}. Die Aufteilung selbst
-- rechnet der Client (gleichmaessig oder je Person von Hand) - hier wird sie nur festgeschrieben
-- und geprueft.
create or replace function public.set_expense_shares(
  p_expense_id   uuid,
  p_amount_cents integer,
  p_shares       jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_expense  public.event_expenses%ROWTYPE;
  v_may_edit boolean;
  v_settled  jsonb;
BEGIN
  SELECT * INTO v_expense FROM public.event_expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'expense not found' USING ERRCODE = 'no_data_found';
  END IF;

  v_may_edit := (v_expense.created_by = auth.uid())
                or public.is_event_creator(v_expense.event_id);
  IF NOT v_may_edit THEN
    RAISE EXCEPTION 'only the expense creator or the organizer may set shares'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Der Ehrengast wird nie beteiligt, egal was der Client schickt.
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_shares) s
      JOIN public.event_participants ep
        ON ep.event_id = v_expense.event_id
       AND ep.user_id = (s->>'user_id')::uuid
     WHERE ep.role = 'honoree'::participant_role
  ) THEN
    RAISE EXCEPTION 'the honoree cannot be assigned a share'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_amount_cents IS NOT NULL AND p_amount_cents <> v_expense.amount_cents THEN
    UPDATE public.event_expenses
       SET amount_cents = p_amount_cents
     WHERE id = p_expense_id;
  END IF;

  -- Bestehende Anteile ersetzen. settled_at der weiterhin Beteiligten bleibt erhalten, damit
  -- eine Korrektur am Betrag nicht stillschweigend jede schon geleistete Zahlung zuruecksetzt.
  -- Bewusst keine Temp-Tabelle: zwei Aufrufe in derselben Transaktion wuerden kollidieren.
  SELECT COALESCE(jsonb_object_agg(user_id::text, settled_at), '{}'::jsonb)
    INTO v_settled
    FROM public.event_expense_shares
   WHERE expense_id = p_expense_id AND settled_at IS NOT NULL;

  DELETE FROM public.event_expense_shares WHERE expense_id = p_expense_id;

  INSERT INTO public.event_expense_shares (expense_id, user_id, amount_cents, settled_at)
  SELECT
    p_expense_id,
    (s->>'user_id')::uuid,
    (s->>'amount_cents')::integer,
    (v_settled->>(s->>'user_id'))::timestamptz
  FROM jsonb_array_elements(p_shares) s;
END;
$function$;

revoke all on function public.set_expense_shares(uuid, integer, jsonb) from public;
revoke all on function public.set_expense_shares(uuid, integer, jsonb) from anon;
grant execute on function public.set_expense_shares(uuid, integer, jsonb) to authenticated;

comment on function public.set_expense_shares(uuid, integer, jsonb) is
  'Setzt Betrag und Aufteilung eines Postens in EINER Transaktion. Einziger erlaubter Weg,
   Anteile zu schreiben - direkte Schreibzugriffe aus dem Client scheitern sonst an der
   aufgeschobenen Summenpruefung, sobald sich der Betrag mit aendert.';

-- ---------------------------------------------------------------------------
-- 9. Rechte
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.event_expenses           to authenticated;
grant select, insert, update, delete on public.event_expense_shares     to authenticated;
grant select, insert, update, delete on public.event_expense_reports    to authenticated;
grant select, insert, update, delete on public.event_expense_categories to authenticated;
