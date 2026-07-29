# Handoff - Game Over App

Kurzer Übergabestand, damit eine neue Session (z. B. von der iPhone-Claude-Code-App) nahtlos anknüpfen kann.
Letzte Aktualisierung: 2026-07-29.

**Diese Datei ist die Statusdatei des Projekts.** Ein `Status.md` gibt es bewusst nicht.
Sie wird laut globaler `~/.claude/CLAUDE.md` nach jedem abgeschlossenen Fortschritt fortgeschrieben,
und zwar im selben Commit wie die Änderung, die sie beschreibt.

## Aktueller Stand (2026-07-29, spaeter) - Feedback-Schicht statt nativer Dialoge, Cron endlich gruen

Branch `claude/budget-refunds-layout-errors-0302ea`.
`npm run typecheck`, `npm run lint`, `npx vitest run` (102 Tests) gruen, von Claude selbst nachgefahren.
UI-Batch via Codex (`gpt-5.6-sol`, Reasoning high), Diagnose/DB/Deploy von Claude.

### 1. Ein Deploy hat den Cron-Job kaputt gemacht, und das war der nuetzlichste Fund des Tages

`supabase functions deploy send-final-briefing` schaltet die JWT-Pruefung des Gateways **wieder ein**,
weil `supabase/config.toml` bis heute **keinen `[functions]`-Abschnitt** hatte.
Die Einstellung lebte nur als Zustand im Dashboard und ueberlebte keinen einzigen CLI-Deploy.

Der Cron-Job schickt `Authorization: Bearer <CRON_SECRET>`, und das ist absichtlich kein JWT.
Mit aktiver Pruefung wirft das Gateway die Anfrage mit `UNAUTHORIZED_INVALID_JWT_FORMAT` raus,
**bevor** die Funktion laeuft, und ihre eigene `CRON_SECRET`-Pruefung kommt nie zum Zug.

Betroffen waren drei Funktionen, die sich selbst autorisieren:
`send-final-briefing`, `process-payment-reminders` und - der gefaehrlichste Fall - `stripe-webhook`,
das die Stripe-Signatur selbst prueft. Ein beilaeufiges CLI-Deploy dort haette Zahlungen still gestoert.
Alle drei stehen jetzt mit `verify_jwt = false` in `config.toml`, damit die Einstellung an jedem Deploy haengt.

**Merke: nach jedem `functions deploy` einer selbst-autorisierenden Funktion einmal aufrufen und
`net._http_response` lesen. Ein Deploy meldet Erfolg, auch wenn er die Funktion unerreichbar macht.**

### 2. `send-final-briefing` laeuft erstmals end-to-end

Vorher live: der alte deployte Code mit dem `profiles`-Join, HTTP 500.
Der Fix lag seit der letzten Sitzung nur lokal, deployt war die kaputte Version.
Jetzt deployt und verifiziert - nicht ueber den Deploy-Exit-Code, sondern ueber einen echten Aufruf
mit dem Original-Cron-Kommando (`execute` des `cron.job.command`, damit das Secret die DB nie verlaesst):
**HTTP 200, `{"results":[]}`**.

Der Testaufruf war nebenwirkungsfrei, weil die Funktion nur den **Folgetag** trifft und das einzige
Event am 02.08. liegt. Vor einem erneuten Testaufruf denselben Abstand pruefen.

### 3. `ops_alert_recipients` war bereits befuellt, der HANDOFF war nur veraltet

Die Zeile existiert seit 10:04 UTC. Der Watchdog hat **11 Sekunden spaeter** seinen ersten echten Alarm
geschrieben und dabei genau den 500er von `send-final-briefing` gemeldet.
Er ist damit nicht nur eingerichtet, sondern nachweislich wirksam - der Punkt aus dem vorigen Abschnitt ist erledigt.

### 4. Keine nativen Dialoge mehr, app-eigenes Feedback ueberall

Alle 78 `Alert.alert` in 27 Dateien sind weg, Endstand null Aufrufstellen.
An ihrer Stelle:

- `feedback.*` in `src/stores/uiStore.ts` - ein API fuer React und fuer imperative Helfer
  (`src/utils/calendar.ts`, `src/hooks/usePaymentSheet.ts`, `src/i18n/index.ts` rufen aus Nicht-React-Kontext).
- `src/components/ui/ConfirmSheet.tsx` - Sheet fuer Rueckfragen, montiert in `app/_layout.tsx`.
  Deckt `confirm` (ja/nein, destruktiv rot) **und** `choose` fuer die Dialoge mit drei Knoepfen ab.
- Der tote `activeModal`/`alert`-Pfad im `uiStore` ist geloescht statt liegengelassen.

Toasts sitzen jetzt bewusst **ueber** der Tab-Leiste inklusive des goldenen Plus (vorher 76pt Abstand)
und sind groesser (Mindesthoehe 52 auf 88, Titel 14 auf 16).
Dauern in `TOAST_DURATIONS`: Fehler 6s, Erfolg 4s, Warnung/Info 2s.
Die Staffelung ist eine Nutzerentscheidung: Fehler muss man ggf. zweimal lesen, ein
"Profil aktualisiert" soll aus dem Weg sein. Jeder Toast ist antippbar, die Werte sind Obergrenzen.

### 5. UI-Korrekturen aus dem Geraetetest, Runde 6

- **Rueckerstattungs-Maske:** die 96pt Bodenabstand raeumten eine Tab-Leiste frei, die bei offenem
  Sheet gar nicht sichtbar ist (`setTabBarHidden(true)` bei `eventIdParam`). Jetzt 16pt in diesem Fall,
  96 nur noch wenn die Leiste wirklich steht. Gilt fuer alle drei Sheets im Budget.
- **"Restbetrag bezahlen"** ohne `textTransform: 'uppercase'`, damit es zu "Noch 5 Tage" auf derselben
  Grundlinie passt. Die Augenbrauen-Labels ("RESTBETRAG (75%)") bleiben bewusst versal.
- **E-Mail aendern:** GoTrue-Fehlercodes werden uebersetzt statt roh durchgereicht
  (`email_exists`, `email_address_invalid`, `over_email_send_rate_limit`), mit Fallback ueber
  `error.code` statt Textvergleich. Das Passwortfeld scrollt bei Fokus in den sichtbaren Bereich.
- **"Vom Gast angepasst":** zwei Zeilen statt Fliesstext, nur noch die **alten** Werte
  (`formatPreviousGuestValues`), Name und Telefon mit "&" verbunden. Die neuen stehen schon in der Karte.

### 6. Der offene Punkt "Bestaetigen-Knopf auf E-Mail aendern" ist erledigt

Im vorigen Abschnitt stand er als ungeklaert (halbe Hoehe, ohne Beschriftung, "hier weitersuchen,
nicht am Layout"). Die Geraete-Screenshots vom 29.07. zeigen ihn in voller Hoehe mit Text.
Die Verlegung in die fixierte Fusszeile hat es geloest. Kein weiterer Handlungsbedarf.

### Offen

- **Nichts davon ist am Geraet gesehen.** Der ganze Batch ist statisch verifiziert
  (typecheck/lint/102 Tests), aber Toast-Position, ConfirmSheet und die Budget-Maske brauchen einen
  echten Durchlauf. `xcode-select` zeigt weiterhin nicht auf Xcode, der Simulator ist blockiert:
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` (braucht das Passwort des Users).
- **Ursache von `email_address_invalid` ist nicht behoben, nur uebersetzt.** Die Auth-Logs zeigen den
  400er reproduzierbar fuer `leonardino@web.de`, waehrend im selben Sekundenfenster ein `mail.send`
  an dieselbe Adresse **erfolgreich** ist. Das ist eine Supabase-seitige Einstellung
  (Auth -> Email), kein App-Fehler. Braucht einen Blick ins Dashboard.
- Testevent "Soleil's Bachelor" (02.08.) hat weiter **keine Buchung mit `reference_number`**,
  das Briefing wuerde `GO-XXXXXX` und `Classic (M)` verschicken.
- Alle Profile stehen auf `en`, der deutsche Briefing-Text wird aktuell nirgends ausgeloest.

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
