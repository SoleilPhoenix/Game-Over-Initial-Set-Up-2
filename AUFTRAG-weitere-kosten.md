# Auftrag: Weitere Kosten in die Datenbank

Angelegt am 06.08. aus der Session zum Ehrengast-Paket heraus.
Branch `claude/weitere-kosten-datenbank`, abgezweigt von `main` bei `d72b7b469`.

## Warum das ein Fehler ist, kein fehlendes Feature

„Weitere Kosten" liegen heute **ausschliesslich im AsyncStorage des jeweiligen Geraets**:

```
gameover:custom_cats:<eventId>      // eigene Kategorien
```

Es gibt **keine** `expenses`-Tabelle, keinen Repository-Zugriff, keinen Hook. Wer einen Betrag
eintraegt, sieht ihn nur selbst. Alle anderen erfahren nichts davon.

Damit ist der Zweck der Funktion verfehlt: geteilte Kosten sollen geteilt **sichtbar** sein,
damit jeder seinen Beitrag leisten kann. Owner-Befund vom 06.08.

## Owner-Entscheidungen (06.08.)

**1. Bestehende Geraeteeintraege werden einmalig hochgeschoben.**
Nicht verwerfen. Beim ersten Start nach dem Update wandert der lokale Bestand in die Datenbank,
danach ist die lokale Ablage nur noch Cache. Der Vorgang muss **idempotent** sein - zweimal
ausgefuehrt darf er keine Dubletten erzeugen.

**2. Weitere Kosten stehen NEBEN der Paketrechnung, nicht darin.**
Sie fliessen **nicht** in `bookings`, nicht in den Gesamtpreis, nicht in Anzahlung oder
Restbetrag und nicht in die Aufteilung aus `splitPerPerson`. Es ist ein **eigenes,
geschlossenes Kassenbuch** unter den Teilnehmern - Organisator, Gaeste und, sofern beteiligt,
der Ehrengast - die sich Betraege gegenseitig aufteilen und verrechnen.

Das ist die wichtigste Vorgabe des Pakets. Wer die beiden Kassenbuecher vermischt, baut genau
den Fehler nach, der am 05.08. das Budget kaputt hatte: **zwei Wahrheiten fuer dieselbe Zahl.**

## Umfang

### A. Datenbank (Migration, **Owner-Freigabe noetig**)

Neue Tabelle, Arbeitstitel `event_expenses`:
- `id`, `event_id` (FK auf `events`), `created_by` (FK auf `profiles`/`auth.users`)
- `title`, `category_key`, `amount_cents`, `paid_by` (wer ausgelegt hat), `occurred_at`
- `created_at`, `updated_at` mit dem ueblichen Trigger

Zweite Tabelle `event_expense_shares` - **erst durch die Owner-Antwort vom 06.08. noetig**:
- `expense_id` (FK, `on delete cascade`), `participant_id` (FK auf `event_participants`)
- `amount_cents` (Anteil dieser Person), `settled_at` (null = offen)
- Eindeutigkeit auf `(expense_id, participant_id)`

Warum sie sein muss: `paid_by` sagt nur, wer ausgelegt hat. Die Owner-Antwort verlangt, dass
man **Personen markiert, die sich beteiligen sollen** - das ist die Gegenrichtung und eine
n:m-Beziehung. An dieser Tabelle haengen beide neuen Anforderungen: die Push-Nachricht braucht
einen Adressaten, die Zahlungserinnerung einen offenen Betrag. Ohne sie gibt es beides nicht.

Die Summe der Anteile muss nicht zwingend `amount_cents` des Postens ergeben (jemand legt aus
und beteiligt nur einen Teil der Runde). Keine Datenbankpruefung darauf erzwingen, sondern in
der Oberflaeche sichtbar machen, wenn etwas offen bleibt.

RLS nach dem Muster der Chat-Kanaele vom 05.08.
(`20260805072931_chat_channels_enable_persistence.sql` als Vorbild lesen):
- **SELECT:** alle Teilnehmer des Events
- **INSERT:** alle Teilnehmer
- **UPDATE/DELETE:** nur der Ersteller **oder** der Organisator

**Ehrengast:** derselbe Ausschluss wie bei `bookings`. Die Policy muss
`role <> 'honoree'` enthalten, sonst sieht er ueber diesen Weg Geldbetraege - genau das, was
die Migration `20260806073606_honoree_participant_role.sql` gerade verhindert hat.
**Nicht vergessen**, sonst ist die Sperre von hinten wieder offen.

Zwingend beachten: **keine Cross-Table-Abfrage auf `events` oder `event_participants` aus einer
Policy auf diesen Tabellen heraus** - das hat schon einmal `42P17` (unendliche Rekursion)
ausgeloest. Die Helfer `is_event_creator()` / `is_event_participant()` benutzen.

### B. Datenschicht

- Repository `src/repositories/expenses.ts`
- Query-Hooks `src/hooks/queries/useExpenses.ts` mit `expenseKeys`-Factory nach dem Muster der
  uebrigen Hooks
- Zugriff nur ueber Komponente -> Hook -> Repository. Komponenten rufen `supabase` nie direkt
  auf (siehe `.claude/security-patterns.yaml`)

### C. Einmalige Uebernahme

Beim ersten Start nach dem Update: lokalen Bestand aus AsyncStorage lesen, in die Tabelle
schreiben, Erfolg lokal vermerken. Idempotent halten. Was schiefgeht, darf nicht zu
Datenverlust fuehren - im Zweifel lokalen Bestand behalten und erneut versuchen.

### D. Oberflaeche

- `app/(tabs)/budget/index.tsx`, Reiter „Weitere Kosten" liest aus dem Hook statt aus
  AsyncStorage
- Betraege als **ganze Euro** ueber `src/utils/money.ts` - kein neues Waehrungsformat
- Bearbeiten und Loeschen nur fuer Ersteller und Organisator; alle anderen sehen den Eintrag
- Fuer den Ehrengast ist der Reiter gesperrt (`canViewExtraCosts` aus dem Rechtemodell, das
  in der Session vom 06.08. entsteht - `src/utils/permissions.ts`)
- Beim Anlegen und Bearbeiten eines Postens **Personen markieren**, die sich beteiligen sollen
  (Mehrfachauswahl aus den Teilnehmern, Ehrengast nicht in der Liste). Daraus entstehen die
  Zeilen in `event_expense_shares` - siehe E2
- Eigener offener Anteil sichtbar, und wer schon beglichen hat
- Melden eines fremden Postens (E1) - der eigene Posten laesst sich nicht melden. Rueckmeldung
  ueber `feedback.*` aus dem `uiStore`, keine eigene Popup-Komponente

### E. Owner-Entscheidungen vom 06.08. (die drei offenen Punkte sind beantwortet)

**E1. Melde-Funktion: ja, nach dem Muster der Paketkosten.**
Gemeint ist der **Einspruch gegen eine Zahl**, nicht eine Missbrauchsmeldung: ein Teilnehmer
haelt einen fremden Posten fuer falsch (Betrag daneben, doppelt erfasst, gehoert nicht zum
Event) und meldet ihn, statt ihn selbst zu aendern - aendern darf er ihn ja nicht. Die Meldung
geht an den Organisator, der entscheidet. Der Eintrag bleibt bis dahin bestehen und wird als
beanstandet gekennzeichnet; er verschwindet nicht und wird nicht automatisch korrigiert.

**E2. Push-Nachricht an markierte Personen: ja, neu hinzugekommen.**
Wer bei einem Posten als beteiligt markiert wird, bekommt eine Push-Nachricht in der Art
„Bei <Event> sind weitere Kosten angefallen, an denen du dich beteiligen sollst."
Sie geht an die Personen aus `event_expense_shares`, nicht an alle Teilnehmer, und nicht an
den Ersteller selbst. Der Ehrengast bekommt sie nie - er sieht die weiteren Kosten gar nicht.
Wird ein Posten nachtraeglich um Personen erweitert, geht sie nur an die neu Hinzugekommenen.

**E3. Weitere Kosten fliessen in die Zahlungserinnerungen ein: ja.**
Wichtig und leicht zu verwechseln: das aendert **nichts** an Owner-Entscheidung 2 weiter oben.
Die Erinnerung **listet** beide Kassenbuecher, sie **summiert** sie nicht. Zwei getrennte
Abschnitte, zwei getrennte Betraege - die Buchung aus `bookings`, die weiteren Kosten aus den
offenen Zeilen in `event_expense_shares` (`settled_at is null`). Es entsteht keine gemeinsame
Gesamtsumme und kein gemeinsamer Restbetrag. Wer hier eine Summe bildet, baut den Fehler vom
05.08. nach.

Wer eine Erinnerung schickt: `supabase/functions/send-payment-reminders` (Plural) und
`process-payment-reminders` bestehen lassen und um den zweiten Abschnitt erweitern, keine
zweite Funktion daneben stellen. Push laeuft ueber `send-push-notification`.

Vorwarnung fuer die Verifikation: die beiden HTTP-Cronjobs liefern laut Stand vom 28.07. noch
nicht aus (fehlende Vault-Secrets, siehe HANDOFF). Ein ausbleibender Versand beweist also
nicht, dass diese Aenderung kaputt ist - die Funktion direkt aufrufen und `net._http_response`
lesen, nicht auf den Cron warten.

## Reihenfolge

1. Migration schreiben, **vorlegen**, erst nach Freigabe mergen. Ein Merge nach `main` loest
   `migrate.yml` aus und wendet sie direkt auf der Produktivdatenbank an.
2. Repository und Hooks
3. Einmalige Uebernahme
4. Oberflaeche

Grund fuer diese Reihenfolge: die Policy muss stehen, bevor die ersten Zeilen entstehen -
dieselbe Logik wie beim Ehrengast-Paket.

## Gates

`npm run typecheck`, `npm run lint`, `npx vitest run` - alle gruen.
Neue Nutzertexte **zuerst** nach `src/i18n/en.ts`, dann `de.ts`; ein Paritaetstest erzwingt das.

## Vorsicht: parallele Sessions

Am 06.08. liefen mehrere Worktrees gleichzeitig, unter anderem `tasks-c-d-b-f-e-g` und
`anbieter-matrix`. Vor dem Abzweigen und vor jedem Merge `main` pruefen und lange Branches
nachziehen. Am 31.07. hat eine versaeumte Nachfuehrung ein Vielfaches der eigentlichen
Aenderung an Konfliktaufloesung gekostet.
