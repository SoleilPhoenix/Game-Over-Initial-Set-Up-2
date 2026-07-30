# Handoff - Game Over App

Kurzer Übergabestand, damit eine neue Session (z. B. von der iPhone-Claude-Code-App) nahtlos anknüpfen kann.
Letzte Aktualisierung: 2026-07-30.

**Diese Datei ist die Statusdatei des Projekts.** Ein `Status.md` gibt es bewusst nicht.
Sie wird laut globaler `~/.claude/CLAUDE.md` nach jedem abgeschlossenen Fortschritt fortgeschrieben,
und zwar im selben Commit wie die Änderung, die sie beschreibt.

## Aktueller Stand (2026-07-30) - Zahlungserinnerungen zweisprachig, Editorial-Palette, Claim

Die Zahlungserinnerungen sind jetzt auf demselben Stand wie das Briefing. Vorher: neun Meldungstexte
nur auf Englisch, und `getPaymentReminderEmailHtml` lief noch über `baseLayout` mit `#5A7EB0`,
`#15181D` und `#23272F` - alle drei laut CLAUDE.md **verbotene** Altfarben.

- **Neu `supabase/functions/_shared/payment-reminder.ts`**: alle neun Stufen (`notice_18`,
  `request_16`, `followup_14`, `followup_12`, `urgent_10`, `urgent_9`, `urgent_8`, `final_7`,
  `cancelled_6`) in DE und EN, plus `reminderCopy()` und `reminderSubject()`. Liegt in `_shared`
  wie `briefing.ts`, damit ein Vorschau-Skript die echten Strings rendern kann, ohne den Server
  der Funktion zu starten.
- **`getPaymentReminderEmailHtml` neu geschrieben**: Editorial-Palette (Navy/Champagne), Claim
  wörtlich aus `src/i18n`, Buchungsreferenz, Betragskachel, Warnband nur auf der letzten Frist.
  Dringlichkeit bleibt in der Palette - Gold für die ruhigen Stufen, Amber ab Tag 10, Rot nur am
  Tag 7. Neue Felder (`language`, `partyLabel`, `guestFirstName`, `bookingReference`) sind
  **optional**, damit der zweite Aufrufer `send-email` unverändert weiterläuft.
- **Sprache** kommt aus `profiles.language` des Organisators. Das Profil wird jetzt **einmal** früh
  im Loop geladen statt zweimal (vorher nochmal im E-Mail-Block), weil In-App-Benachrichtigung und
  Push die Sprache ebenfalls brauchen - die waren vorher fest englisch.
- Betreff über `reminderSubject()`, inklusive Genitiv-Helfer: "Natalias Bachelorette Party (JGA)".

Gegengeprüft am gerenderten HTML: **0 Treffer** für alle fünf verbotenen Altfarben, Claim in beiden
Sprachen vorhanden, Genitiv korrekt. `deno check` für `process-payment-reminders`, `send-email` und
`send-final-briefing` grün, typecheck/lint/102 Tests grün. Beide Funktionen deployed mit
`--no-verify-jwt`, danach über `net.http_post` ausgelöst: **200 OK**, alle neun Stufen, 0 Fehler.

### Testfenster (Stand 30.07.)

| Event | Datum | Entfernung | Trifft Stufe? |
|---|---|---|---|
| Soleil's Bachelor | 02.08. | 3 Tage | nein - aber **Briefing feuert am 01.08.** |
| Dana's Bachelor | 08.08. | **9 Tage** | **ja** (`urgent_9`) - Buchung `GO-0614B6` da |
| Natalia's Bachelorette | 16.08. | 17 Tage | nein - **16 Tage am 31.07.** |

Beide Buchungen haben `deposit_paid_at = NULL`, deshalb greift die Abfrage nicht. Sobald eine
Anzahlung über den echten Stripe-Testfluss gezahlt ist, feuert die Stufe. Alle Organisatoren stehen
jetzt auf `language = 'de'`, die Mails kommen also deutsch.

## Aufgeklärt (2026-07-29, Abend) - die App hat ihre Sprachwahl nie in die DB geschrieben

Widerspruch, der lange verwirrte: die App lief auf Deutsch, aber alle 7 Profile hatten
`profiles.language = 'en'`, weshalb Briefing und Erinnerungen englisch rausgingen.

Ursache: `languageStore` persistiert nach **AsyncStorage**, also geräte-lokal. Die Spalte
`profiles.language` hat DB-Default `'en'` und wurde von **keiner Stelle der App** je geschrieben
(es gibt kein `src/repositories/profiles.ts`, und kein Update irgendwo setzt sie). Die Sprachwahl
erreichte den Server also nie. Wer die App auf Deutsch stellte, bekam trotzdem englische Mails.

Fix: neuer Hook `src/hooks/useSyncProfileLanguage.ts`, gemountet in `app/_layout.tsx` neben
`useSyncProfileEmail`. Er spiegelt die lokale Sprachwahl nach `profiles.language`, überspringt den
Write wenn die Spalte schon passt, und ist best-effort (ein Fehlschlag blockiert die App nicht und
wird beim nächsten Mount erneut versucht). RLS erlaubt es: Policy
"Users can update their own profile" mit `auth.uid() = id`.

Alle 7 Profile am 29.07. auf `'de'` gesetzt.

### Nebenbefund: die Geldspalten sind wirklich dicht

Der Versuch, für einen Erinnerungstest eine bezahlte Anzahlung direkt per SQL einzusetzen, wurde vom
Trigger `enforce_booking_financial_integrity` abgeräumt - **wie vorgesehen**. Auf INSERT rechnet er
den Preis unabhängig vom Client aus dem Paket neu (`price_per_person × Teilnehmer + base`) und
erzwingt `payment_status = 'pending'` mit `deposit_paid_at`, `fully_paid_at`,
`deposit_amount_cents` und `remaining_amount_cents` auf NULL. Auf UPDATE dürfen Geldspalten nur von
`auth.role() = 'service_role'` bewegt werden. Eine Anzahlung lässt sich also nicht faken -
Zahlungen müssen durch den echten Stripe-Testfluss. Nicht umgehen.

**Nebeneffekt, der hilft:** `app/(tabs)/budget/index.tsx` Zeile 700 nimmt den AsyncStorage-Cache
nur, wenn **keine** DB-Buchung existiert (`if (!booking)`). Sobald eine echte Buchung da ist, zeigt
der Screen die Wahrheit aus der DB statt der gecachten Demo-Zahlen. Genau das hat den Testfluss für
Natalia entsperrt (Buchung `GO-376D44`, EUR 916, unbezahlt).

## Aktueller Stand (2026-07-29, Abend) - erster echter Buchungssatz, Client-Statuswrite entfernt

Der erste echte Testkauf lief in einen Fehler: *"Booking created but event status update failed:
Event can only be marked booked by the payment service"*.

Ursache: `bookingsRepository.create()` schrieb nach dem Insert clientseitig
`update events set status = 'booked'`. Der Trigger `enforce_event_status_integrity` sperrt diese
Transition auf die Service-Rolle - der Update wurde also **immer** abgewiesen. Der anschliessende
`throw` brach die Zahlung ab, **nachdem** die Buchungszeile bereits geschrieben war. Ergebnis:
ein verwaister Buchungssatz auf einem `draft`-Event, Stripe nie erreicht.

Der Code war seit immer falsch, fiel aber nie auf, weil die App bis zum Paket-Seed durchgehend im
Demo-Modus lief und der echte Pfad nie ausgefuehrt wurde. Der Seed hat den Fehler nicht erzeugt,
sondern freigelegt.

Fix: der Client setzt den Status nicht mehr. `stripe-webhook` (~Zeile 218) macht es serverseitig
nach erfolgreicher Zahlung, `confirm-demo-booking` fuer den simulierten Pfad. Eine Buchung anlegen
und eine Buchung bezahlen sind zwei verschiedene Ereignisse.

Der frueher vorhandene Test hat das falsche Verhalten festgeschrieben ("throws if event status
update fails"). Er ist ersetzt durch zwei Tests, die jetzt die richtige Invariante schuetzen:
`create()` fasst die `events`-Tabelle gar nicht an, und ein fehlgeschlagener Insert wird
durchgereicht. 102 Tests gruen.

**Offen: verwaiste Buchung `GO-0614B6`** (Dana's Bachelor, EUR 895, `payment_status = 'pending'`,
Event auf `draft`). Harmlos - `process-payment-reminders` ignoriert sie, weil `deposit_paid_at`
NULL ist - aber sie sollte aufgeraeumt werden.

### Widerlegt: der "event_participants/profiles"-Fehler ist NICHT mehr offen

Eine andere Session hat notiert, ein taeglicher Cron-Job schlage weiterhin mit
`Could not find a relationship between 'event_participants' and 'profiles' in the schema cache`
fehl. Das ist **veraltet**. Nachgeprueft:
- Der Join ist aus `send-final-briefing` entfernt (ersetzt durch `events.created_by`).
- Es existiert genau **eine** `ops_cron_health`-Benachrichtigung, erzeugt am 29.07. um 10:04 beim
  manuellen Watchdog-Test. Sie bezieht sich auf den 09:00-Lauf mit dem **alten** deployten Code,
  also auf einen zu diesem Zeitpunkt bereits behobenen Fehler.
- Seither keine neue Meldung; ein manueller Aufruf liefert 200.

**Lehre fuer den Watchdog:** die Meldung nennt den Zeitpunkt des zugrundeliegenden Fehlschlags
nicht, deshalb liest ein alter Alarm wie ein aktueller. Ein Zeitstempel im `body` wuerde das
verhindern - noch offen.

## WICHTIG (2026-07-29) - CI hat die Cron-Funktionen zweimal stillgelegt

`deploy-edge-functions.yml` deployte `send-final-briefing` und `process-payment-reminders`
**ohne `--no-verify-jwt`**. Da `config.toml` keine `[functions.*]`-Sektionen hatte, griff der
CLI-Default `verify_jwt = true`. Folge: die Plattform weist den pg_cron-Aufruf mit
**401 `UNAUTHORIZED_INVALID_JWT_FORMAT`** ab, *bevor* die Funktion läuft - der
CRON_SECRET-Check im Code kommt nie zum Zug.

Live nachgewiesen: derselbe Aufruf lieferte nach dem CI-Deploy `401`, nach einem Redeploy mit
`--no-verify-jwt` wieder `200`. Das Briefing war dazwischen 15 Minuten lang kaputt, obwohl es
kurz zuvor verifiziert funktioniert hatte.

**Dauerhaft abgesichert an zwei Stellen:**
- `supabase/config.toml` deklariert jetzt `[functions.send-final-briefing]` und
  `[functions.process-payment-reminders]` mit `verify_jwt = false`. Damit ist die Einstellung
  Teil des Repos und gilt unabhängig davon, wer deployt.
- Der Workflow setzt zusätzlich `--no-verify-jwt` bei beiden, falls eine ältere CLI in CI die
  Per-Function-Sektion ignoriert.

**Merke: jede neue cron-getriggerte Funktion braucht beides.** Ein Deploy ohne das Flag sieht
erfolgreich aus und legt den Job trotzdem still.

## Aktueller Stand (2026-07-29, zuletzt) - Neue Staffel für Zahlungserinnerungen

Branch `claude/zahlungserinnerungen-neue-staffel`. `deno check`, `npm run typecheck`,
`npm run lint`, `npx vitest run` (101 Tests) alle grün. Deployed und live verifiziert.

Die alte Staffel war 21/18/16/14 mit Storno am **14.** Tag. Neu, von Soheil festgelegt:

| Tage vor Event | Was passiert |
|---|---|
| 18 | Erste Info-Meldung |
| 16 | Ausdrückliche Zahlungsaufforderung |
| 14, 12 | Alle zwei Tage erinnern |
| 10, 9, 8 | Täglich erinnern |
| **7** | Finale Warnung - **das ist die Zahlungsfrist** |
| **6** | **Stornierung**, 25 % Anzahlung wird einbehalten |

**Warum Storno auf Tag 6 und nicht auf Tag 7:** der Job läuft einmal täglich um 09:15 UTC.
Warnung und Stornierung im selben Lauf hiessen, dem Kunden eine Handlungsaufforderung für
etwas zu schicken, das bereits vollzogen ist - und die Anzahlung wäre weg. Eine Fristsetzung
ohne tatsächliche Frist ist im deutschen Verbraucherrecht zudem angreifbar. Konstanten dafür:
`PAYMENT_DEADLINE_DAYS = 7`, `CANCEL_AT_DAYS = 6`.

Umsetzungsdetails:
- Der Storno-Durchlauf läuft als letzte Stufe in derselben `MILESTONES`-Liste, damit er die
  Buchungsabfrage und den idempotenten `payment_reminders`-Insert mitbenutzt
  (`UNIQUE(booking_id, days_before_event)` verhindert Doppelstornos). Die Schleife
  verzweigt über `isCancellationPass`.
- Auf dem Storno-Durchlauf wird **keine** Zahlungserinnerungs-Mail verschickt: die Vorlage
  `getPaymentReminderEmailHtml` sagt "zahle heute, sonst wird storniert", was am Storno-Tag
  falsch wäre. In-App-Benachrichtigung und Push tragen die Storno-Nachricht.
  **Offen: eine eigene Storno-E-Mail-Vorlage gibt es noch nicht.**
- Die frühere doppelte Storno-Benachrichtigung ist entfernt - Schritt 1 der Schleife schreibt
  auf diesem Durchlauf bereits eine mit Typ `event_cancelled_nonpayment`.
- `daysRemaining` im Mail-Template zählt jetzt bis zur **Zahlungsfrist** (Tag 7), nicht bis zum
  Event: `Math.max(0, daysBefore - PAYMENT_DEADLINE_DAYS)`.
- `payment_reminders.reminder_type` hat keine CHECK-Constraint, die neuen Typwerte
  (`notice_18`, `request_16`, `followup_14`, `followup_12`, `urgent_10`, `urgent_9`,
  `urgent_8`, `final_7`, `cancelled_6`) sind daher unproblematisch.

Verifiziert über `net.http_post` mit den echten Vault-Secrets: **200 OK**, Antwort listet alle
neun Stufen mit `processed: 0, errors: 0` (es gibt noch keine Buchungen).

## Aktueller Stand (2026-07-29, später) - Echte Buchungen, Stripe-Testmodus

Branch `claude/echte-buchungen-stripe-test`.

### Die `packages`-Tabelle war leer, und das erklärte fast alles

Kein Buchungs-Bug, sondern fehlende Stammdaten. Die Kette:

1. `packages` hatte 0 Zeilen (`cities` hatte 3).
2. Die App fiel deshalb auf ihre hartcodierte Paketliste zurück, deren Ids Slugs sind (`hamburg-classic`), keine UUIDs.
3. `app/booking/[eventId]/payment.tsx` leitet daraus ab:
   `isFallbackPackage = !UUID_REGEX.test(activePkg.id)` und
   `useSimulatedPayment = isDraft || IS_E2E || !STRIPE_KEY || isFallbackPackage`.
   `isFallbackPackage` war damit **immer** wahr - unabhängig vom gesetzten Stripe-Key.
4. Der Demo-Zweig ruft `confirm-demo-booking`, und die macht ausschließlich
   `update events set status = 'booked'`. Sie fasst `bookings` nie an.
5. Folge: **nie ein `bookings`-Datensatz.** Daher keine `reference_number` (Briefing zeigte den
   Platzhalter `GO-XXXXXX`), kein `package_id` (Briefing zeigte immer `Classic (M)`), und
   `process-payment-reminders` konnte gegen die leere Tabelle **strukturell nie etwas finden**.
   Ihr `200 OK` am 29.07. war ehrlich, aber hohl.

Migration `20260729102334_seed_packages_for_real_bookings.sql` legt 9 Pakete an (3 Städte x 3 Stufen),
feste UUIDs (`...4402xx`, Städte sind `...4401xx`), idempotent per `on conflict do update`.
Preise gespiegelt aus `src/constants/packageTiers.ts`: 129 / 179 / 229 EUR pro Person, all-in,
kein separates Service-Fee, daher `base_price_cents = 0`.
Anzeigename kommt in der UI aus `tier` + Sprache (`getTierName(pkg.tier, language) || pkg.name`),
die deutschen Namen in der DB sind nur Rückfall.

**Damit greift ab sofort der echte Stripe-Pfad.** Das Projekt läuft auf `pk_test_`, also
Stripe-**Testmodus**: echter Zahlungsdialog, Testkarten, kein Geld, keine Gebühren.
Vor dem Livegang `pk_live_`/`sk_live_` setzen - das ist ein bewusster eigener Schritt.
`STRIPE_SECRET_KEY` muss im selben Modus sein wie der Publishable Key, sonst schlägt jede Zahlung
mit einem Mismatch fehl.

### `accept_invite` hielt nicht fest, wer einen Code eingelöst hat

Der Organisator tippt eine Adresse in `invite_codes.guest_email`, der Gast registriert sich aber
womöglich mit einer anderen. Ohne Verknüpfung erreicht das Briefing nur die getippte Adresse.
Über E-Mail zu matchen ist zirkulär: es gelingt genau dann, wenn es nichts zu korrigieren gibt.

Migration `20260729102634_link_invite_to_claiming_user.sql`: Spalte `invite_codes.claimed_by`
(FK auf `profiles`, partieller Index), `accept_invite()` setzt sie beim Einlösen -
**Autorisierungslogik unverändert**, nur eine Spalte mehr im vorhandenen UPDATE. Rechte geprüft:
`authenticated` darf ausführen, `anon` nicht. Backfill über Email-Gleichheit; wer sich unter einer
anderen Adresse angemeldet hat, bleibt NULL (raten wäre schlimmer als offen lassen).

`send-final-briefing` bevorzugt jetzt die Profil-Adresse und den Profil-Vornamen, sobald
`claimed_by` gesetzt ist, und fällt sonst auf die Einladungsdaten zurück.

### Wer bekommt ein Briefing

Aktuell: alle Codes mit `is_active` und ohne `declined_at` - auch Eingeladene, die nie beigetreten sind.
Bewusste Entscheidung: sie kommen möglicherweise trotzdem. Absagen sind sauber ausgeschlossen.

### Verifiziert

`deno check` grün. `send-final-briefing` deployed mit `--no-verify-jwt` (wichtig: `config.toml` hat
keine Funktions-Sektion, der CLI-Default würde `verify_jwt = true` setzen und der Cron-Aufruf würde
von der Plattform abgewiesen, bevor er den Code erreicht).
Danach über `net.http_post` mit den echten Vault-Secrets ausgelöst: **200 OK, `{"results":[]}`**.

### Offen

- Ein echter Testkauf über den Stripe-Testdialog steht noch aus. Erst der erzeugt den ersten
  `bookings`-Datensatz und damit die erste echte `reference_number`.
- Erst danach lässt sich `process-payment-reminders` wirklich prüfen. **Vorsicht:** sie storniert
  beim 14-Tage-Meilenstein automatisch (`status = 'cancelled'`, Anzahlung einbehalten).
- Alle 7 Profile stehen weiterhin auf `language = 'en'`; der deutsche Briefing-Text ist fertig,
  wird aber nirgends ausgelöst.

## Aktueller Stand (2026-07-29) - Cron-Jobs liefen seit Monaten ins Leere

Branch `claude/mystifying-mcclintock-5bc8b4`.
`deno check` grün für `send-final-briefing`, `process-payment-reminders`, `send-guest-invitations`.

### 1. `pg_net` war nie installiert - beide HTTP-Cron-Jobs schlugen bei jedem Lauf fehl

Job 4 (`send-final-briefing-daily`, 09:00 UTC) und Job 5 (`process-payment-reminders`, 09:15 UTC) rufen beide `net.http_post(...)`.
Die Extension war auf dem Projekt nie angelegt, jeder Lauf endete mit `ERROR: schema "net" does not exist`.
Gemerkt hat es niemand, weil `cron.schedule()` sein Kommando als **reinen Text** speichert und erst zur Laufzeit parst:
Ein prinzipiell nicht ausführbarer Job lässt sich anstandslos anlegen und sieht in `cron.job` gesund aus.
Konsequenz: 24h-Briefing und Zahlungserinnerungen sind **nie** verschickt worden.

Migration `20260728071825_enable_pg_net_for_cron_http.sql`, live per `supabase db push`.

**Gegen eine naheliegende Fehlannahme:** die Cron-Kommandos mussten *nicht* auf `extensions.http_post` umgeschrieben werden.
`pg_net` ist `relocatable = false` und legt in `sql/pg_net.sql` Zeile 1 sein eigenes Schema an (`create schema if not exists net;`);
alle Funktionen heißen fest `net.http_post` usw. Ein `WITH SCHEMA extensions` trüge nur ein irreführendes Extension-Schema ein,
während die Funktionen weiter in `net` liegen. Das bestehende `net.http_post` war immer korrekt.

### 2. Vault-Secrets fehlten zusätzlich

Beide Cron-Kommandos lesen `SUPABASE_URL` und `CRON_SECRET` zur Laufzeit aus `vault.decrypted_secrets`. Beide fehlten,
`net.http_post` wäre gegen eine NULL-URL gelaufen. Von Soheil am 2026-07-28 gesetzt (Vault **und** Function-Secret).
Verifiziert ohne Klartext: SHA256 des Vault-Werts == Digest des Function-Secrets.

### 3. Watchdog gegen genau diese Fehlerklasse

Migration `20260728120859_cron_health_watchdog.sql`, Job 7 `check-cron-health`, 09:45 UTC, reines SQL (Vorbild `notify-due-refunds`).
Prüft `pg_net`, die Vault-Secrets, den letzten `cron.job_run_details`-Status **und** die HTTP-Antworten in `net._http_response`.
Der letzte Punkt ist der entscheidende: `net.http_post` ist fire-and-forget, ein Job gilt als `succeeded`, sobald der Request
in der Queue liegt - ein 401/500 der Edge Function wäre über den Job-Status allein unsichtbar.
Empfänger in `public.ops_alert_recipients` (service-role-only).

### 4. Migrations-Historie war beidseitig auseinandergelaufen

Remote hatte `20260727102035` und `20260728070228`, lokal lagen dieselben Migrationen unter geratenen Zeitstempeln
(`20260727101940` Avatar-RLS, `20260728090000` event_refunds).
Nachgewiesen über **Wirkung** statt Vermutung: `public.event_refunds` existiert live, und die anonyme Rolle darf den
Avatar-Bucket listen (also ist `avatars_public_read` aktiv). Danach nur die zwei Dateien umbenannt -
**kein einziger Schreibzugriff auf die DB**. `supabase db push` läuft seitdem sauber.

### 5. `send-final-briefing` hatte sechs Fehler, nicht einen

- Zielte auf **3 Tage** statt 24 Stunden, obwohl überall 24h dokumentiert ist. Jetzt nächster Kalendertag.
- Fragte `recipient_phone` / `recipient_name` / `recipient_first_name` auf `guest_invitations` ab - **keine dieser Spalten existiert**.
- Der Fehler wurde nicht geprüft. Das Ergebnis las sich als "keine Gäste", erfüllte damit `sent > 0 || invitations.length === 0`
  und setzte `planning_checklist.final_briefing = true`: die Funktion hakte sich **selbst als erledigt ab, ohne je zu senden**,
  und zwar dauerhaft. Jetzt bricht ein fehlgeschlagener Lookup ab, der Haken fällt nur bei `sent > 0`.
- Schrieb die Organisator-Benachrichtigung in Spalte `data` - die Tabelle hat `metadata`. Fehler per `.catch()` verschluckt.
- Suchte den Organisator über `p.role`, obwohl das Select `role` nie geladen hat. Jetzt über `events.created_by`.
- Der Join `event_participants(profile:profiles(...))` existiert im Schema-Cache nicht und warf live 500. Join ist entfallen.

**Quelle der Gästeliste ist jetzt `invite_codes`, nicht `guest_invitations`.**
`guest_invitations` ist ein Versand-**Protokoll**: zweimal "Einladungen senden" erzeugt zwei Zeilen pro Gast.
Beim Testevent standen 3 Gäste als 6 Zeilen drin (10:42 und 10:44 Uhr) - über das Protokoll zu iterieren hätte jeden doppelt angeschrieben.
`invite_codes` hat eine Zeile pro Gast inkl. `guest_first_name`, `guest_email`, `guest_phone`, `declined_at`.
Der Kanal kommt weiter aus dem Protokoll (jüngste Zeile gewinnt).

### 6. Briefing-Texte: zweisprachig, personalisiert, mit Claim

Copy in `supabase/functions/_shared/briefing.ts` (WhatsApp + Betreff) und `_shared/email-templates.ts` (`getFinalBriefingEmailHtml`).
Bewusst in `_shared`, damit ein Vorschau-Skript die echten Funktionen rendern kann, ohne `serve()` zu starten -
eine handgebaute Vorschau wäre wertlos, weil sie driften kann.
Sprache aus `profiles.language` des Organisators (Konvention wie bei der Einladungs-Mail).
Titel/Betreff nutzen den **Vornamen** (`Soleils Bachelor Party (JGA)`), der Fließtext den vollen Namen.
`(JGA)` nur im Deutschen.
Der Claim ist wörtlich aus `src/i18n/{de,en}.ts` (`claim1-3` + `claimSub`) - **bei Änderung beide Stellen anfassen**.
Genitiv über `possessive()`: Deutsch lässt das s nach s/ß/x/z weg (`Phoenix'`), Englisch nur nach s (`Phoenix's`, aber `Hans'`).
Der Organisator bekommt dieselbe Mail als Erinnerung, mit eigenem Einleitungssatz und getrennter Fehlerzählung.

### 7. Erster echter Lauf am 2026-07-29

| Job | Cron-Status | Tatsächliche HTTP-Antwort |
|---|---|---|
| `process-payment-reminders` | succeeded | **200** - alle 4 Meilensteine geprüft, nichts fällig |
| `send-final-briefing` | succeeded | **500** - alter deployter Code, `profiles`-Join |

Beide gelten als "succeeded". Genau dafür existiert die HTTP-Prüfung im Watchdog.
`process-payment-reminders` funktioniert damit **end-to-end** - erstmals.

**Achtung bei Testläufen von `process-payment-reminders`:** die Funktion **storniert Events automatisch**
(14-Tage-Meilenstein, `status = 'cancelled'`, Anzahlung wird einbehalten). Vor einem manuellen Aufruf immer prüfen,
ob eine Buchung auf 21/18/16/14 Tagen steht.

### Offen

- **`ops_alert_recipients` befüllen**, sonst ist der Watchdog stumm. Er hat den 500er am 29.07. gesehen und nichts gemeldet, weil kein Empfänger eingetragen war.
- Testevent "Soleil's Bachelor" (02.08.) hat **keine Buchung mit `reference_number`** - das Briefing verschickt den Platzhalter
  `GO-XXXXXX` und `Classic (M)` als Paket-Default. Bewusst so belassen, vor echtem Kundenbetrieb klären.
- Alle drei Gäste des Testevents teilen sich dieselbe Test-Mailadresse.
- Alle 7 Profile stehen auf `en`; der deutsche Text ist fertig, würde aktuell aber nirgends ausgelöst.
- Die Briefing-Mail hängt nicht am i18n-System, sondern trägt ihre Texte selbst (wie `getGuestInviteEmailHtml`).

## Aktueller Stand (2026-07-28) - UI-Korrekturen aus dem Gerätetest, Runde 5

Branch `claude/gastprofil-zahlungen-ui-c863e7`.
`npm run typecheck`, `npm run lint`, `npx vitest run` (101 Tests) grün.

### Nachtrag: sechs Commits standen nie hier drin

Zwischen `bcfc85b94` (letzter Eintrag) und `dd5170bfc` sind sechs Commits gelandet, die in dieser
Datei fehlten. Der Vollständigkeit halber, weil sonst der nächsten Session der halbe Kontext fehlt:

- `8cb16cfed` Uhr-Icon für "Bestätigung ausstehend" im Budget.
- `221b50330` Avatare: fremdes Foto beim Organisator, veraltetes Foto überall sonst.
- `4bdeaf9ed` Gast darf Name und Telefon selbst ändern, Zahlstatus anderer Gäste ist privat.
- `d451bb9c2` Erfolgsmeldungen als dezente Toasts unten statt als Dialog (`ToastHost`).
- `ae6ece881` Benachrichtigungen auf zwei Farben reduziert (orange = handeln, grün = Information),
  `action_url` an den Einfügestellen gesetzt, `guest_profile_updated` mit `guest_data_changed`
  zusammengeführt. Restbetrag-Karte orange umrandet.
- `dd5170bfc` Rückerstattungen in der DB (`event_refunds`) statt AsyncStorage, tägliche Erinnerung
  per `pg_cron`, eigener Screen zum Ändern der E-Mail-Adresse.

### Der eigentliche Fund dieser Runde: der Code war richtig, die Daten waren es nicht

"Gastprofil aktualisiert" wurde weiter orange mit Standard-Glocke gezeichnet, obwohl `ae6ece881`
die Farben längst korrigiert hatte. Grund war nicht der Code, sondern der Bestand:

Die Zeilen in der Datenbank tragen `type = 'guest_profile_updated'`. Genau diesen Typ hat
`ae6ece881` entfernt, er steht in `NOTIFICATION_CONFIG` also nicht mehr drin, und alles Unbekannte
fällt auf `default` zurück - orange Glocke, was "du musst handeln" bedeutet.

Zweiter Fund derselben Abfrage: **alle neun** Zeilen hatten `action_url = NULL`. `NotificationItem`
routet seit jeher auf diese Spalte, gesetzt wurde sie aber erst ab `ae6ece881`. Jede historische
Zeile war eine Sackgasse.

**Merke: bei "der Fix wirkt nicht" zuerst die Live-Daten abfragen, nicht den Code noch einmal lesen.**
Ein Typ, der aus dem Code verschwindet, verschwindet nicht aus der Tabelle.

Behoben doppelt, absichtlich:
- Migration `20260728180000_backfill_legacy_notifications.sql` trägt `action_url` nach und rettet den
  Gastnamen aus dem fest verdrahteten englischen Satz nach `metadata`.
- `NotificationItem` führt `guest_profile_updated` als Alias weiter, damit eine übersehene Zeile
  nie wieder als orange Glocke auflaufen kann.

### Weitere Korrekturen dieser Runde

- **`guest_joined` war fest auf Englisch.** `app/invite/[code].tsx` schrieb "Guest Joined" als Text
  in die DB. Jetzt derselbe Mechanismus wie bei `guest_data_changed`: Gastname in `metadata`,
  Übersetzung erst beim Anzeigen in der Sprache des Lesers.
- **"Zahlung ausstehend"** ist jetzt eine Karte mit derselben Geometrie wie die Zeilen darunter,
  vorher ein randloser Streifen mit Trennlinie.
- **Rückerstattungs-Maske:** `minimumDate` gesetzt (eine Frist in der Vergangenheit ist beim
  Speichern schon überfällig und löst sofort die Erinnerung aus), Lücke zwischen Feld und Kalender
  weg, unterer Freiraum von 120 auf 96, und der ScrollView scrollt beim Öffnen des Kalenders ans
  Ende, damit der Bestätigen-Knopf auf kleinen Geräten erreichbar bleibt.
- **Restbetrag-Karte:** rechte Spalte unten ausgerichtet, damit "Restbetrag bezahlen" und "Noch X
  Tage" auf einer Grundlinie sitzen, beide 12pt; Chevron von 20 auf 30 in einem 52er Kreis.
- **E-Mail ändern:** die eigene Adresse lief ohne Prüfung durch `updateUser`, Supabase meldete
  Erfolg, und der Nutzer bekam "Prüfe deinen Posteingang" für eine Änderung, die es nicht gab.
  Jetzt eine Zod-Prüfung gegen `user.email`.
- **Toast** hielt 104pt über der Tab-Leiste frei und verdeckte damit den Chevron der Zeile darüber,
  jetzt 76.
- **Budget-Hervorhebung:** `payment_claimed` hängt `?claimedBy=<user id>` an die `action_url`, das
  Budget umrandet die Zeile dieses Gastes für 4 Sekunden orange. Bewusst flüchtig, sonst staut sich
  die Liste zu, wenn mehrere Gäste am selben Abend melden.

### Offen aus dieser Runde

- **Der Bestätigen-Knopf auf "E-Mail ändern" ist NICHT am Gerät verifiziert.**
  Auf dem Screenshot des Users ist der goldene Knopf etwa halb so hoch wie vorgesehen und ohne
  Beschriftung. Das passt zu keiner naheliegenden Erklärung: `textOnPrimary` ist `#0D1B2A` auf Gold,
  `minHeight` steht auf 52, und `t.changeEmail.submit` existiert in beiden Sprachen mit echtem Text.
  Der Knopf sitzt jetzt in einer fixierten Fußzeile außerhalb der ScrollView, was das gemeldete
  Verstecken unter der Tastatur strukturell ausschließt - die halbe Höhe erklärt es aber nicht.
  **Wenn das Symptom bleibt, hier weitersuchen, nicht am Layout.**
- Reproduzieren ging nicht: `xcode-select` zeigt nicht auf Xcode, der Simulator ist blockiert.
  Fix braucht das Passwort des Users:
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

## Aktueller Stand (2026-07-27) - Zwei hartnäckige Bugs endlich an der Wurzel

Branch `claude/device-test-errors-c90ee5`, Worktree `.claude/worktrees/macbook-pro-ai-startup-5b439e`.
`npm run typecheck`, `npm run lint`, `npx vitest run` (97 Tests) grün.
UI-Batch über Codex (`gpt-5.6-sol`), Diagnose und DB von Claude.

### 1. Foto-Upload: die RLS-Meldung log seit Monaten falsch

`StorageApiError: new row violates row-level security policy` kam **nicht** von der INSERT-Policy.
Supabase Storage schreibt die Objektzeile mit `INSERT ... RETURNING`, und RETURNING braucht Lesezugriff auf die neue Zeile.
Auf `storage.objects` gab es überhaupt keine SELECT-Policy, also scheiterte jeder Upload, obwohl der INSERT-Check sauber durchlief.
Öffentliche Reads funktionierten weiter, weil ein Public Bucket über den CDN-Pfad ausgeliefert wird, der RLS nie auswertet.
Genau deshalb sah es wie ein Schreibrechte-Problem aus, und deshalb half auch eine testweise immer-wahre INSERT-Policy nicht.

Nachgewiesen live gegen das Projekt: als Rolle `authenticated` lief ein blankes INSERT durch, dasselbe `INSERT ... RETURNING` scheiterte mit exakt der App-Fehlermeldung.
Danach ein echter End-to-End-Upload mit frischem User-JWT: vorher `FAIL`, nach der Migration `OK`.

Migration `20260727101940_fix_avatar_storage_rls.sql` (per MCP angewendet **und** als Datei abgelegt):
SELECT-Policy `avatars_public_read` ergänzt, Schreibrechte auf Ordner pro Nutzer verengt (`<user id>/<timestamp>.jpg`).
Die zwei Client-Stellen bauen den Pfad jetzt so: `src/components/profile/AvatarUpload.tsx` und `app/invite/[code].tsx`.
`AvatarUpload` konvertiert zusätzlich nach JPEG (wie der Gast-Screen schon), sonst kippt der Bucket jedes iPhone-HEIC wegen `allowed_mime_types`.

Merke: `storage.objects` hat einen `protect_objects_delete`-Trigger, direktes `DELETE` per SQL ist gesperrt, Objekte über die Storage-API entfernen.

### 2. Intro: `withDelay` braucht sein eigenes `ReduceMotion.Never`

Der Logo-Aufbau lief nie sichtbar, weil `withDelay` eine **eigene** reduceMotion-Einstellung trägt (Default `ReduceMotion.System`).
Bei aktivem iOS "Bewegung reduzieren" wirft Reanimated die Verzögerung komplett weg
(`now - startTime >= delayMs || animation.reduceMotion` in `animation/delay.js`).
`ReduceMotion.Never` nur am inneren `withTiming` reicht deshalb nicht:
die Timings laufen zwar, aber alle sieben Phasen starten gleichzeitig bei t=0, die Choreografie schrumpft auf ihre längste Einzelphase, und das Logo wirkt, als wäre es immer schon fertig gewesen.

Das erklärt beide gescheiterten Vorgänger-Fixes (erst `ReduceMotion.Never` an den Timings, dann das Sichtbarkeits-Gating) - keiner hat `withDelay` angefasst.
Alle verzögerten Phasen laufen jetzt über den Helfer `revealDelay()` in `AnimatedLogo.tsx`, damit eine später ergänzte Phase den Bug nicht still wieder einbaut.

**Testen nur per Kaltstart** (App ganz beenden oder `r` in Metro), das Intro läuft einmal pro JS-Session.

### 3. UI-Korrekturen aus dem Gerätetest (Codex)

- Events-Karte: das doppelte "Gast"-Badge entfernt, der Organisator/Gast-Umschalter darüber sagt es schon.
- Einladungs-Screen: der Ehrengast-Slot heißt jetzt BACHELOR bzw. BACHELORETTE je nach `party_type`, EN und DE, `honoree` bleibt Fallback.
- Budget-Gruppenbeiträge: "Ich habe bezahlt" und "Bestätigen" sind jetzt vollbreite, goldgefüllte Fußzeilen in der Karte statt kleiner rechtsbündiger Pillen, die mit dem Status kollidierten.
- Budget-Farben auf zwei Zustände reduziert: grün = bezahlt, ein einziges Orange `#F97316` = noch offen (vorher drei Orangetöne).
- Die schief laufende Karte war kein Zufall: eingeladene, noch nicht beigetretene Gäste rendert eine **zweite** Schleife, der die `contributionMainRow` fehlte, also stapelten sich Avatar, Name und Betrag untereinander. Struktur angeglichen.

### Offen / als Nächstes

- **Gerätetest der beiden Wurzelfixes** steht noch aus (Intro nur per Kaltstart, Foto-Upload in Profil **und** Gast-Beitritt).
- `assets/splash.png` ist veraltet und markenfremd: altes Kreis-mit-Pfeil-Logo plus Tagline, dazu `backgroundColor: '#15181D'`, das laut `CLAUDE.md` deprecated ist. Erste Sekunde jedes Kaltstarts zeigt damit ein Logo, das sonst nirgends vorkommt.
- Empty-States-Copy feilen (siehe unten, unverändert offen).
- DB-Drift/CI: die 3 GitHub-Secrets fehlen weiter, `migrate.yml` migriert nichts.

## Aktueller Stand (2026-07-23) - Guest-Flow rund, Empty-States neu, Test-DB geleert

Alles auf `main` gemergt und gepusht, Kopf bei `c9b0b6ff8`. Arbeitsweise: Bau überwiegend via Codex
(`gpt-5.6-sol`), Review/Architektur/DB von Claude. Jede Gruppe mit `npm run typecheck`, `npm run lint`,
`npx vitest run` (96 Tests) grün. Am Gerät getestet wird vom User laufend; die neuesten Sachen sind
teils noch ungesehen (siehe "Zum Gerätetest offen").

### Was in dieser Sitzung fertig + live wurde

1. **Auth-Journey neu.** Welcome + Continue zu **einem** Screen zusammengelegt (Social-Icons oben,
   „Party planen" als schlanker E-Mail-Weg, Login, Gastcode). Deutsch ist Standardsprache
   (`languageStore` default `de` + Migration). Social-Buttons sind echte Vektor-Logos. Launch-Intro
   mit 4s-Logo-Aufbau (Video-Slot via `INTRO_VIDEO_SOURCE` = null, mp4 später einhängen).
2. **Intro-Aufbau sichtbar gemacht.** Reveal startet erst wenn der Screen sichtbar ist
   (`InteractionManager` + Fallback in `app/(auth)/intro.tsx`) - vorher verstrich der Anfang beim
   Kaltstart unsichtbar. Davor schon: `ReduceMotion.Never` gegen iOS „Bewegung reduzieren".
3. **Gast-Beitritt zusammengelegt (C).** `app/invite/[code].tsx`: Vorschau + Registrierung + Profil
   auf **einem** Screen, Party-Typ-Badge oben (`get_invite_preview` liefert jetzt `party_type`),
   Auth-Verzweigung (eingeloggt = nur Annehmen), Foto-Upload konvertiert nach JPEG.
4. **Batch-1-Fixes.** HEIC-Foto-Upload (Konvertierung), deutsche Gast-Fehlermeldungen (i18n),
   E-Mail/WhatsApp-Texte „Bachelor/Bachelorette Party (JGA)" + Stadt. `send-guest-invitations` neu
   deployt.
5. **Gästeliste-Status (D) + Zustell-Prüfung (B).** Mehrstufiges Badge aus `guest_invitations`
   (Abgelehnt/Angenommen/Zustellung fehlgeschlagen/Eingeladen/Nicht eingeladen), „Ablehnen" schreibt
   `decline_invite`. Async-E-Mail-Bounce via neuer Edge-Function `check-invite-delivery` (Resend-Poll).
   Beide Edge-Functions **deployt**. Details: Memory `guest-flow-backlog` + `guest-accept-and-db-drift`.
6. **Empty-States neu (6 Screens).** `src/components/ui/EmptyState.tsx` (wiederverwendbar): Hook +
   Nutzen + gedimmte **Ergebnis-Vorschau** (statt Icon) + Gold-CTA, jeder Screen trichtert zu
   „Party planen"/Code. Angewandt auf Events (Org/Gast), Chat (Themen/Abstimmung), Budget (Paket/Kosten).
   Copy liegt als `emptyStates`-Baum in i18n - **bewusst v1**.
7. **Test-DB komplett geleert.** Auf User-Wunsch: die 9 Test-Konten (+ ihre 4 Events) und danach
   **alle** 165 Events von `leonardino@web.de` gelöscht. Jetzt: 1 Konto (`leonardino@web.de`),
   0 Events/Teilnehmer/Codes/Buchungen. Sauberer Ausgangspunkt zum Neu-Testen.

### HIER weitermachen (offen, priorisiert)

- **Empty-States-Copy feilen.** Der User will die Hooks/Texte der 6 Empty-States final schärfen
  ("treffen den Nerv noch nicht zu 100 %"). Alles in `src/i18n/{en,de}.ts` unter `emptyStates` -
  reine Einzeiler-Edits, Parität wahren. Am lebenden Screen abstimmen.
- **Async-Bounce-Vorbehalt prüfen.** `check-invite-delivery` funktioniert nur, wenn `RESEND_API_KEY`
  Lesezugriff auf `GET /emails/{id}` hat. Testadresse: `bounce@resend.dev`. Wenn der Gast danach nicht
  auf „Zustellung fehlgeschlagen" springt, liegt's am Key-Scope.
- **mp4 fürs Intro einhängen.** Datei nach `assets/brand/intro.mp4`, dann in
  `src/components/brand/introVideo.ts` das `null` durch das `require` im Kommentar ersetzen (1 Zeile).
- **DB-Drift/CI abschließen.** Drift ist versöhnt und gemergt (`ad47dd9ad`); offen: die 3 GitHub-Secrets
  (`SUPABASE_ACCESS_TOKEN/DB_PASSWORD/PROJECT_ID`) setzen, damit `migrate.yml` wieder migriert - ERST
  danach, sonst wird der grüne Skip-Job rot. Siehe Memory `guest-accept-and-db-drift`.

### Zum Gerätetest offen (am Gerät noch ungesehen)

Empty-States (alle 6), der zusammengelegte Gast-Screen mit echtem Code, das Status-Badge im
Live-Verlauf (Eingeladen→Angenommen/Abgelehnt), der Intro-Kaltstart nach dem Sichtbarkeits-Fix,
und OAuth (Apple nur mit echtem Konto prüfbar).

### DB / Deploy / Umgebung (wichtig)

- **Supabase-MCP schreibt in dieser Session noch** (die read-only-`.mcp.json` der Drift-Session greift
  erst nach Neustart). DB-Änderungen dieser Sitzung wurden per MCP `apply_migration` angewendet und die
  lokale Migrationsdatei mit der **real aufgezeichneten** Version benannt (nicht geraten):
  `20260722140438` accept_invite, `20260723041729` party_type-in-preview, `20260723045107`
  decline_invite, `20260723050510` provider_message_id.
- **Vor jeder neuen Migration die echte DB per MCP prüfen** (`execute_sql` gegen `pg_proc`/`pg_policies`/
  `schema_migrations`), den Dateien nicht blind trauen. Live-DB driftet historisch.
- **Edge-Functions deployen** per CLI aus dem Worktree: `npx supabase functions deploy <name>
  --project-ref stdbvehmjpmqbjyiodqg` (CLI ist eingeloggt/verlinkt). Diese Sitzung deployt:
  `send-guest-invitations`, `check-invite-delivery`.
- **Neues npm-Paket = im Hauptordner `npm install`**, sonst startet der User die App nicht
  (`expo-video`, `expo-image-manipulator` bissen hier schon). Immer nach `npm install` im
  Haupt-Worktree den `package-lock.json`-Rausch prüfen.

---

## Aktueller Stand (2026-07-22 spät) - Intro-Fix, Logo-Größen, Gast-Flow gehärtet

Alles auf `main` (`eff1db86c`). Über Codex (gpt-5.6-sol) umgesetzt, von Claude geprüft.

**Intro-Animation gefixt.** Auf dem Gerät erschien das Logo fertig statt sich aufzubauen.
Ursache: reanimated 4 richtet sich nach iOS "Bewegung reduzieren"; ist das an, springt jede
Animation sofort auf den Endwert. Fix: `ReduceMotion.Never` an allen Reveal-Timings. Intro-Logo
200→260, Welcome-Logo 150→172.

**Gast-Flow gehärtet - mit einer wichtigen Drift-Entdeckung.**
Codex traced den Gast-Flow, fand drei Schwachstellen. Beim kontrollierten Deploy per Supabase-MCP
stellte sich heraus: die Live-DB hatte die sichere `accept_invite`-RPC **schon** (out-of-band
angelegt, nie als Migration committet), die offene INSERT-Policy war schon weg. Der eigentliche Bug
war, dass der **Client die RPC nie aufrief** - der alte Direkt-Insert scheiterte an der RLS, der
Gast-Beitritt war live vermutlich kaputt. Jetzt ruft `invitesRepository.accept` die RPC auf
(Rückgabe `success/event_id/reason`), EXECUTE auf `authenticated` verengt, Migration per MCP
angewendet und verifiziert. Punkt 2: `getPreview` wirft jetzt Transportfehler (Retry + eigener
Fehler-Screen), damit ein gültiger Code bei einem Aussetzer nicht als ungültig erscheint.
Details in der Memory `guest-accept-and-db-drift`.

## HIER weitermachen

**1. Gast-Flow jetzt LIVE testen.** Die Migration ist auf der Produktiv-DB angewendet, der Client
passt dazu. Mit echtem Einladungscode durchspielen: Code eingeben → Vorschau → Registrieren →
landet auf dem Event als Gast. Das war der Punkt, den der User hauptsächlich prüfen wollte.

**2. Rückmeldung zum zusammengelegten Auth-Screen + Intro abwarten** (siehe "Ungetestet").

**3. Die mp4 einhängen, sobald sie da ist.**
`assets/brand/intro.mp4` ablegen, dann in `src/components/brand/introVideo.ts` das `null` durch das
`require` im Kommentar ersetzen. Eine Zeile.

**Wichtig fürs Intro-Testen:** Läuft nur einmal pro JS-Session. Zum erneuten Auslösen in Metro `r`
(voller Reload) oder App schließen/neu öffnen.

## Offene separate Baustelle: DB-Drift + migrate.yml

`migrate.yml` scheitert bei **jedem** Push, seit Monaten - die GitHub-Secrets (`SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`) sind leer, der Job stirbt bei `supabase link` vor
`db push`. Migrationen werden also **nur** von Hand (MCP/Dashboard) angewendet, nie von der CI.
Folge: die Migrationsdateien und die Live-DB driften auseinander. Fünf lokale Dateien sind nicht in
`schema_migrations` registriert (Stand 2026-07-22): `20260417000000_rename_package_tiers` (NICHT
idempotent), `20260418000000`, `20260601000000`, `20260613000000`, `2026-07-18_notifications_metadata`.
Solange die CI ohne Secrets nichts anwendet, ist das ungefährlich, aber es ist eine Falle: **vor jeder
neuen Migration die echte DB per MCP prüfen**, nicht den Dateien vertrauen. Aufräumen wäre ein eigenes
Thema (Secrets setzen ODER die Historie mit dem Ist-Zustand versöhnen).

## Fertig in dieser Sitzung (2026-07-22) - Auth-Screens zusammengelegt

Commit `8fc336bc5`.

**Welcome und Continue zu einem Screen.**
Der Continue-Screen (`app/(auth)/continue.tsx`) ist gelöscht, aus dem `(auth)/_layout` entfernt.
Die Auth-Methoden liegen jetzt direkt auf dem Welcome. Ein Tap weniger bis zur Anmeldung.

Genau dieser eine Screen war früher überladen und wurde deshalb getrennt (927pt auf 852pt).
Diesmal passt es, weil die drei Social-Logins eine **kompakte Icon-Reihe** sind statt drei gestapelter Balken.
`SocialButton` hat dafür eine `compact`-Variante (nur Marke, drei nebeneinander, flex:1).

Reihenfolge nach Conversion, mit dem User so entschieden:
Social-Icons oben (schnellster Weg), darunter "Party planen" als schlanker Outline-Button (E-Mail → signup),
dann Login-Zeile, dann als leiseste Zeile der Gastcode.

**Damit ist der Code-Feld-Bug erledigt:** Er trat auf dem Continue-Screen auf, dem die Tastatur-Behandlung fehlte,
sodass das Feld hinter dem Terms-Balken verschwand. Der Welcome hat `KeyboardAvoidingView` +
`automaticallyAdjustKeyboardInsets`, jetzt liegt der Code dort - der Bug ist mit dem Merge weg.

Claim mittig zentriert, Logo + Claim nach oben gerückt, Logo einheitlich 150.
Hook-Zeile knackiger: "Planen, feiern, abrechnen. Alles in einer App."

**Intro-Fix:** Die 4s-Animation wird jetzt von einem festen Timer (`LOGO_REVEAL_DURATION`) gesteuert
statt vom Completion-Callback des Logos - so ist die volle Laufzeit garantiert sichtbar.
`expo-video` wird nur noch **lazy** geladen (`require` in der `IntroVideo`-Komponente, die nur bei vorhandenem
Video mountet). Das native Modul hängt damit nicht mehr am logo-only-Pfad, was in Expo Go ein Risiko war.

`continueTitle`, `continueSubtitle`, `continueWithEmail` aus i18n entfernt (tot nach dem Merge).

## Fertig in dieser Sitzung (2026-07-21)

Commit `d296a2886`.

### Punkt 8 Schritt 3 - Launch-Intro

Neu: `app/(auth)/intro.tsx`, `src/components/brand/introVideo.ts`, `src/lib/introSession.ts`.
`expo-video` installiert und in `app.config.ts` als Plugin eingetragen.

Zwei Phasen: die 4s-Logo-Animation, danach das Video, dann `router.replace` auf den Welcome.

**Warum die Videoquelle eine eigene Konstante ist:**
Metro löst `require()` auf Assets **statisch** auf.
Ein fehlendes Asset ist damit ein Bundler-Fehler, kein Laufzeitfehler, und lässt sich weder
per try/catch abfangen noch hinter ein `if` stellen.
Deshalb liegt die Quelle als einzelne exportierte Konstante in `introVideo.ts` und steht auf `null`.
Ist sie `null`, fällt Phase 2 aus und das Intro ist nur der Logo-Aufbau.

**Die offene Frage aus dem letzten Handoff ist beantwortet:**
Die Animation gehört ins Intro, der Welcome zeigt danach das statische Logo.
`AnimatedLogo` erledigt das von selbst, es läuft nur einmal pro Session.

**Fallstrick, der fast durchgerutscht wäre:**
`app/_layout.tsx` leitet beim Kaltstart um, **bevor** `app/index.tsx` überhaupt rendert.
Stünde die Intro-Entscheidung nur in `index.tsx`, würde das Intro bei jedem Start still übersprungen.
Beide Stellen fragen jetzt `shouldPlayIntro()`.

Das Intro läuft einmal pro App-Session, absichtlich nur im Speicher und nicht persistiert.
Persistiert würde es genau einmal überhaupt laufen; asynchron aus dem Storage gelesen
läge ein leerer Frame vor genau dem Moment, den das Intro besonders machen soll.

Angemeldete Nutzer sehen das Intro nicht, die gehen direkt auf ihre Events.

**Nicht bestellt, trotzdem eingebaut:** ein dezenter "Überspringen"-Link, der nach 1,8 s auftaucht.
15 Sekunden ohne Ausweg sind bei jedem zweiten Start eine Zumutung und fallen im App-Store-Review auf.
User ist informiert, kann raus wenn er will.

### Deutsch als Standardsprache

`src/stores/languageStore.ts`: Default von `'en'` auf `'de'`.

Ein neuer Default allein erreicht **niemanden mit installierter App**.
Dort liegt `'en'` bereits auf der Platte und gewinnt gegen jeden Default.
Der Versionssprung auf `version: 1` mit `migrate` schreibt diesen Wert genau einmal um.
Was der User danach selbst wählt, bleibt unangetastet.

### Social-Logos waren keine Logos

`src/components/ui/SocialButton.tsx`.

Das waren getippte Zeichen: ein Apple-Glyph aus der Systemschrift, ein blaues "G", ein kleines "f".
Sie rendern in dem Gewicht und auf der Grundlinie, die die Plattformschrift gerade vorgibt,
deshalb fluchteten die drei Knöpfe nie miteinander.

Jetzt echte Vektormarken über `react-native-svg`.
Googles Vierfarb-"G" ist von deren Markenrichtlinien vorgeschrieben, ein blauer Buchstabe
ist ein Review-Risiko und kein Schönheitsfehler.

Die Marke hängt links **absolut positioniert** statt in einer Reihe zu liegen.
In einer Reihe verschiebt jede der drei unterschiedlich breiten Marken ihr Label anders weit,
und die Beschriftungen fluchten nicht mehr.

Die Labels kommen jetzt aus i18n, vorher waren sie hart englisch verdrahtet.

> **Hinweis:** Die folgenden zwei Unterpunkte betreffen den Continue-Screen und sind durch den
> Merge auf einen Screen am 2026-07-22 überholt. `InviteCodeEntry` lebt weiter, liegt jetzt aber
> nur noch auf dem Welcome (testIDs `invite-code-*`). Der Continue-Screen und seine
> `continue-invite-code-*` testIDs existieren nicht mehr.

### Einladungscode auf beiden Screens

Neu: `src/components/auth/InviteCodeEntry.tsx`, herausgezogen statt dupliziert.

### Layout und Text nach dem Gerätetest des Users

- Logo auf dem Welcome **zentriert**.
  `AnimatedLogo` ist eine Box fester Größe; ohne zentrierendes Elternelement klebte sie am linken Rand.
- "Bereits ein Konto? Anmelden" und die Code-Zeile von 14 auf 16 pt.

## Fertig in der Sitzung davor (2026-07-20)

### Punkt 8 Schritt 2 - Logo-Reveal-Animation

Commits `c21c3b4f7`, `6d71941e2`, `c00e43ce1`, `9768d03dc`.
Dateien: `src/components/brand/AnimatedLogo.tsx`, `src/components/brand/logoGeometry.ts`.

Ablauf in 4 s: ein durchgehender Strich zeichnet alle drei Ringe (innen im Uhrzeigersinn, mitte gegen den Uhrzeigersinn, außen wieder im Uhrzeigersinn, dazwischen radiale Verbinder an der Spaltkante), dann Übergabe ans echte Asset, Stiel fällt, Wortmarke steigt mit Lichtstreifen auf, Diamant setzt sich zuletzt.

Wichtig für spätere Änderungen:

- `logo.svg` ist ein **getractes** Logo.
  Die Goldpfade sind gefüllte Umrisse dünner Linien, ein `strokeDashoffset` darauf zeichnet die Kontur der Kontur.
  Deshalb sind nur die Ringe als echte Stroke-Geometrie nachgebaut, und nur während sie gezeichnet werden.
- Die Geometrie ist per Hit-Testing am gerenderten SVG vermessen: Mittelpunkt (512.1, 498.4), Radien 202.4 / 181.5 / 162.5, Strichstärke 4.5, Spalt ±11° oben.
  Mittlere Abweichung zum Original 0.12-0.21 Einheiten.
- Diamant, Wortmarke und Ringe sind rechteckige Schnitte durch das echte Asset (`GEM_BAND`, `RINGS_BAND`, `WORD_BAND`), die die Grafik lückenlos kacheln.
  Der Ruhezustand ist damit exakt das Marken-Asset.
- Der Stiel wird nicht nachgebaut, sondern von einer Navy-Blende freigelegt, die sich nach unten zurückzieht (`STEM_STRIP`).
- Läuft **einmal pro Session**.
  `willPlayLogoReveal()` und `LOGO_REVEAL_DURATION` sind exportiert, damit Screens ihre eigene Einblendung dagegen takten können.

Vergleichs-Demo als Artifact, mit live anpassbaren Phasenzeiten:
<https://claude.ai/code/artifact/3cfaeda3-85b1-4456-917b-74266e3b7c1d>

### App-Bundle von 31,4 MB auf 13,7 MB halbiert

Commits `ee45b7fea`, `55bba3f7e`.
Gemessen mit `npx expo export --platform ios`, nicht geschätzt.

- `Eisbären_Berlin.png` war ein 3285x3423-PNG mit 8,8 MB, also 27 % der ganzen App.
  Ohne Transparenz, also ein Foto: auf 960 px verkleinert und als JPEG gespeichert, jetzt 100 KB.
- `useEditorialFonts` lud vier Inter-Schnitte, der Import aus dem Paketindex zog aber alle 18 samt Kursiven ins Bundle.
  Jetzt Tiefenimporte pro Gewicht, z. B. `@expo-google-fonts/inter/400Regular`.
- Die App benutzt nur Ionicons, `import { Ionicons } from '@expo/vector-icons'` bundelte aber alle 13 Icon-Sets.
  In 53 Dateien auf `import Ionicons from '@expo/vector-icons/Ionicons'` umgestellt.
- `assets/icon.png` diente doppelt: als App-Icon (muss für den Store 1024x1024 bleiben) und als Ladebildschirm-Logo bei 150pt.
  Der Ladebildschirm nutzt jetzt `<Logo size={150} />`, das Icon ist damit aus dem Bundle raus.

**Fallstrick macOS:** `sips` schreibt Umlaute in Dateinamen zerlegt (NFD), der Quelltext nutzt die vorkomponierte Form (NFC).
Metro vergleicht Bytes exakt und findet die Datei dann nicht.
Nach `sips` also immer NFC-normalisieren.

### Fehlender Stripe-Patch

Commit `9633bd5fb`.
`patches/@stripe+stripe-react-native+0.50.3.patch` lag nur lokal, obwohl `package.json` ein `postinstall: patch-package` ausführt.
Auf jedem frischen Clone und in jedem CI-Lauf fehlte der Fix stillschweigend, ohne dass etwas fehlschlug.
Dazu im selben Commit: CI-Guard in `migrate.yml` wenn Supabase-Secrets fehlen, und die Projekt-Skills unter `.claude/skills/`.

### Repo aufgeräumt

Commit `ecbba633d`.
`.agents/`, `.superpowers/`, `.playwright-mcp/` gelöscht und ignoriert.
Vier duplizierte Asset-Ordner entfernt, sie waren byte-identisch zu bereits getrackten PNGs.
`UI_and_UX/` aus dem Repo heraus verschoben, Templates nach `game-over-app/docs/data-templates/`.

**Nichts davon war je im App-Bundle.**
Gemessen: 0 von 104 `UI_and_UX`-Dateien landeten im Binary.
Repo-Größe und App-Downloadgröße haben nichts miteinander zu tun.

### Welcome repariert und auf einen CTA reduziert

Commits `65cf7cdb2`, `ac4aaf3b6`.

Zwei Fehler, die erst auf dem Gerät sichtbar wurden:

- Der Claim wurde zerquetscht.
  Logo, Claim und Aktionsbereich waren Geschwister fester Höhe, und nur `claimBlock` hatte `flex: 1`.
  Bedarf ~927pt bei ~852pt Viewport, also lief der Text über das Logo und hinter die Karte.
  Jetzt scrollt alles gemeinsam, ein nachgiebiger Abstandhalter gleicht aus.
- Das Logo zeichnete sich als dunkles Rechteck ab, weil `logo.svg` eine eigene Navy-Fläche (#0D1B2A) mitbringt und der Verlauf dahinter oben heller begann.
  Der Verlauf läuft jetzt andersherum: obere 45 % exakt #0D1B2A, Tiefe nach unten.
  **Diese Regel gilt überall, wo das Logo auf einem Verlauf sitzt.**

Struktur danach:

- `welcome.tsx`, 279 statt 597 Zeilen: Logo 150, Claim, ein goldener CTA "Party planen", "Schon dabei? Anmelden", dezente Zeile "Einladung erhalten?" die sich zum Eingabefeld aufklappt.
- `app/(auth)/continue.tsx`, neu: Auswahl-Screen mit Apple/Google/Facebook, "Mit E-Mail fortfahren" führt zu `signup.tsx`.
- `src/hooks/useSocialAuth.ts`, neu: die drei OAuth-Flows liegen jetzt an einer Stelle statt inline im Screen.

## Ungetestet

**Die App wurde auch in dieser Sitzung nie laufend gesehen.**
Grün sind: `npm run typecheck`, `npm run lint`, 96 Unit-Tests inklusive i18n-Parität,
und ein vollständiger `npx expo export --platform ios`.
Alle Aussagen zur Optik sind aus dem Code abgeleitet.

Offen für den Gerätetest, nach Risiko sortiert:

- **Ob der zusammengelegte Screen auf kleinen iPhones ohne Überlauf passt.**
  Das war der Grund der ursprünglichen Trennung.
  Die kompakte Social-Reihe soll genug Höhe sparen, gemessen ist es noch nicht.
- Ob die 4s-Logo-Animation jetzt sichtbar ist.
  Sie wird von einem festen Timer gesteuert; zum erneuten Auslösen voller Reload nötig (siehe oben).
- Ob OAuth durchläuft. Bleibt das größte Risiko, Apple nur mit echtem Konto prüfbar.
  Die Social-Buttons wurden neu gebaut, die `onPress`-Verdrahtung (`useSocialAuth`) blieb unverändert.
- Ob `expo-video` in Expo Go läuft, sobald ein Video drin ist.
  Solange `INTRO_VIDEO_SOURCE` auf `null` steht, wird das Modul gar nicht geladen (lazy require).
- Ob Logo-Größe 150 neben dem Claim stimmig wirkt.

### Tote i18n-Schlüssel entfernt

Commit `5380ad67f`.

`welcomeHeadline`, `welcomeBody`, `enterInviteCode` und `orContinueWith` aus dem
`auth`-Abschnitt von `en.ts` und `de.ts` geworfen.
Überbleibsel des alten Welcome-Screens, der Claim, drei Anbieterknöpfe und das
Einladungsfeld noch gemeinsam trug.

Geprüft wurde mit dem nackten Schlüsselnamen statt mit `auth.<key>`, damit auch ein
dynamischer Zugriff wie `t.auth['welcomeHeadline']` aufgefallen wäre.
Null Treffer in `app`, `src`, `__tests__` und `e2e`.

**Fallstrick beim Bearbeiten dieser Dateien:**
`de.ts` enthielt in einem Wert die **literale** Escape-Sequenz `—`, nicht das Zeichen.
Suchen-und-Ersetzen über den gerenderten Text findet solche Zeilen nicht.
Das deckt sich mit der bereits bekannten Regel, dass JSX `\uXXXX` nicht auflöst:
in diesen Dateien gehören echte UTF-8-Zeichen hin, keine Escapes.

## Offene Punkte aus dem alten Backlog

- **Punkt 10:** invite_codes-PII 30 Tage nach Event anonymisieren, Konten bleiben bis Selbst-Löschung.
  Migration und pg_cron-Job sind vorbereitet, aber **noch nicht angewendet**, wartet auf User-OK.
- **Punkt 9:** User hat Supabase "Confirm email" ausgeschaltet, beim nächsten Signup prüfen ob `email_confirmed_at` sofort gesetzt ist.
- Veraltete Phantom-E2E-Tests in `game-over-app/e2e/invites/inviteSystem.test.ts` neu schreiben oder entfernen.

## Aufgaben beim User

- **Zwei Stashes enthalten einen Twilio-Recovery-Code:** `stash@{0}` "all local pre-merge state", `stash@{1}` "pre-tier1-merge local changes".
  Der Code ist nie in einen Commit gelangt und war nie auf GitHub.
  Wenn die Stashes nicht mehr gebraucht werden: zweimal `git stash drop`.
- Die Datei liegt unter `~/GameOver_Secrets_NICHT_IM_REPO/` und gehört in den Passwortmanager.

## Arbeitsweise (wichtig)

Direkt auf `main` arbeiten und committen/pushen, in dieser Phase bewusst **kein** separater Worktree oder Branch.
Vor jedem Merge oder Rebase zuerst `git -C <repo> status` prüfen.
Nach jeder abgeschlossenen Gruppe aus `game-over-app/`: `npx tsc --noEmit --skipLibCheck` und `npx eslint`, beide müssen sauber sein.

**Bei allem, was die App-Größe betrifft, messen statt schätzen:**

```bash
cd game-over-app && npx expo export --platform ios --output-dir /tmp/dist
du -sh /tmp/dist /tmp/dist/_expo /tmp/dist/assets
```

**Typecheck allein reicht nicht.**
`require()` auf Assets wird nicht typgeprüft, ein umbenanntes Bild fällt erst beim echten Build auf.

## Test-Loop: Änderungen live aufs iPhone

Auf dem Mac, in einem eigenen Terminal:

```bash
cd "/Users/soleilphoenix/Desktop/GameOver/game-over-app" && npm start -- --tunnel
```

`--clear` nur wenn Metro veraltete Module ausliefert, es kostet rund 90 Sekunden.
Auf dem iPhone Expo Go öffnen und den QR scannen.

**Free-ngrok erlaubt nur EINEN Tunnel.**
Niemals einen zweiten Metro im Hintergrund starten, während der User selbst einen laufen hat, sonst scheitert seiner mit `ERR_NGROK_334`.
Aufräumen bei Bedarf: `pkill -f "expo start"; pkill -f "ngrok start"`.

Mac und iPhone hängen am selben Hotspot (172.20.10.x), `--lan` funktioniert also auch ohne ngrok.

## Bekannte Umgebungs-Hinweise

Supabase-Projekt `stdbvehmjpmqbjyiodqg` pausiert automatisch auf INACTIVE.
Vor Edge-Function-Deploy oder Test erst `restore_project` (MCP) oder im Dashboard reaktivieren.

Das lokale Auto-Memory unter `~/.claude/projects/.../memory/` reist **nicht** über git mit.
Nur committete Dateien wie diese sind auf anderen Geräten sichtbar.
