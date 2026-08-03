# Handoff - Game Over App

Statusdatei des Projekts. Ein `Status.md` gibt es bewusst nicht.
Wird laut globaler `~/.claude/CLAUDE.md` im selben Commit fortgeschrieben wie die Änderung, die sie beschreibt.

**Diese Datei ist absichtlich kurz.** Sie beschreibt den *aktuellen* Stand und offene Punkte,
nicht die Sitzungshistorie. Dauerhafte Lehren gehören ins Projektgedächtnis
(`~/.claude/projects/-Users-soleilphoenix-Desktop-GameOver/memory/`), nicht hierher.
Erledigtes wird gelöscht, nicht archiviert - `git log` ist das Archiv.

Letzte Aktualisierung: 2026-07-31.

---

## Umgebung

- Supabase-Projekt `stdbvehmjpmqbjyiodqg`. **Pausiert automatisch** - vor Deploy oder Test per MCP
  `restore_project` oder im Dashboard aufwecken, sonst scheitert der Deploy mit 404 `INACTIVE`.
- Edge Function deployen: `npx supabase functions deploy <name> --project-ref stdbvehmjpmqbjyiodqg`
- Typen nach einer Migration: **erst migrieren, dann** `npx supabase gen types typescript
  --project-id stdbvehmjpmqbjyiodqg > src/lib/supabase/types.ts`. Der Generator wirft die
  `eslint-disable`-Kopfzeile weg, sie muss danach wieder rein.
- Die App läuft aus `/Users/soleilphoenix/Desktop/GameOver/game-over-app` (Branch `main`).
  Worktrees unter `.claude/worktrees/` haben **kein** `node_modules` - von dort startet Expo nicht.
- `SUPABASE_ACCESS_TOKEN` steht in `~/.zshrc`. Claudes Bash-Shell ist **nicht interaktiv** und liest
  `.zshrc` deshalb nicht; `zsh -lc` auch nicht (Login != interaktiv). Wer die Variable braucht,
  ruft über **`zsh -ic '<befehl>'`** auf. **Achtung:** ein `zsh -ic 'echo $SUPABASE_ACCESS_TOKEN'`
  wird vom Sicherheitsklassifikator als Zugriff auf einen Zugangsdatenspeicher blockiert (03.08.).
  Die Variable *benutzen* geht, sie *auslesen* nicht - Befehle also nicht mit einem Token-Echo
  zum Debuggen bauen.
- **Projekt aufwecken ist dauerhaft freigegeben** (Owner, 03.08., gilt jede Session):
  `restore_project` aus INACTIVE darf ohne Rückfrage. Migration und Edge-Function-**Deploy**
  bleiben davon unberührt und brauchen weiterhin jedes Mal Freigabe.
- `deno check supabase/functions/create-payment-intent/index.ts` scheitert lokal mit
  `Could not find a matching package for 'npm:@types/node'`. Am 03.08. nachgewiesen
  **vorbestehend** (gleicher Fehler ohne jede Änderung, per `git stash` geprüft); es ist eine
  Werkzeuglücke aus dem Stripe-Import, kein Codefehler. Andere Funktionen wie `send-email`
  laufen sauber durch. Nicht nochmal untersuchen, ohne vorher `deno install` zu versuchen.

## Nicht anfassen, ohne den Grund zu kennen

**`config.toml` braucht `verify_jwt = false` für selbst-autorisierende Funktionen.**
`send-final-briefing`, `process-payment-reminders` und `stripe-webhook` prüfen ihre Autorisierung
selbst (CRON_SECRET bzw. Stripe-Signatur). Ohne den Eintrag schaltet **jeder** CLI-Deploy die
JWT-Prüfung wieder ein, das Gateway wirft den Aufruf mit `401 UNAUTHORIZED_INVALID_JWT_FORMAT` raus,
*bevor* die Funktion läuft - und der Deploy meldet Erfolg. Das ist am 29./30.07. zweimal passiert,
in zwei verschiedenen Sessions. **Nach jedem Deploy einer dieser Funktionen einmal aufrufen und
`net._http_response` lesen.**

**`supabase config push` ist gesperrt.** Es lädt die komplette Auth-Konfiguration hoch, inklusive
`site_url = "exp://localhost:8081"`. Danach zeigt jeder Bestätigungslink in jeder Kundenmail auf die
Entwicklungs-URL. Erst nutzbar, wenn Dev- und Prod-Werte in `config.toml` getrennt sind.

**Geldspalten schreibt nur der Server.** `enforce_booking_financial_integrity` nullt sie bei jedem
Client-INSERT und wirft `P0001` bei jedem Client-UPDATE; `enforce_event_status_integrity` sperrt
`events.status = 'booked'`. Zuständig sind `stripe-webhook` (echt) und `confirm-demo-booking` (Demo).
Client-seitige Zahlungsschreibpfade wurden entfernt - nicht wieder einbauen.

**Zahlungsstaffel und ihre Begründung.** In `_shared/payment-reminder-milestones.ts`:
18, 16, 14, 12, 10, 9, 8, **7 = Zahlungsfrist**, **6 = Stornierung**. Die Stornierung sitzt bewusst
einen Tag *nach* der Frist - Warnung und Vollstreckung im selben Lauf wären eine Frist ohne
Handlungszeit. Jeder Meilenstein trägt `alwaysSend`; der Nutzerschalter greift nur bei
18, 16, 12, 10. Owner-Entscheidung, ein Test hält sie fest.

**Schreibweise der Marke.** Owner-Entscheidung vom 03.08., gilt ueberall:
**„Game Over"** mit Leerzeichen, ohne Bindestrich, ohne `.app` - in Betreffzeilen, Fliesstext und
als Absendername. **`game-over.app`** nur im Logo-Lockup (Splash, Boot, Mail-Kopf), im Footer und
in Links. Begruendung: Marken werden im Satz genannt, Domains nicht; „Du bist zu game-over.app
eingeladen" liest sich wie Spam. Der Bindestrich existiert nur, weil Domains keine Leerzeichen
koennen, und gehoert deshalb nicht in die Wortmarke.

---

## Offen

### Muss noch gemacht werden

1. ~~Preis-Fallback~~ **behoben am 31.07.** `useBookingFlow.ts` bepreist nur noch aus
   ausdruecklichen Quellen: URL-Parameter, dann die bereits aufgezeichnete Kopfzahl der Buchung
   (`paying_participants + exclude_honoree`), dann der gecachte Wunschwert - sonst **kein Preis**.
   `participants.length` und `|| 1` sind raus; ein unbekannter Wert blockiert die Zahlung mit
   Meldung statt still zu raten. Tests decken alle vier Faelle ab.
   Natalias Buchung wurde auf 5 Personen korrigiert (114500).
2. ~~Auth-Vorlagen~~ **erledigt am 31.07.** Alle sechs sind per
   `zsh -ic 'node scripts/push-auth-email-templates.mjs --apply'` live und gegen den Server
   verifiziert. Nach jeder Änderung an `supabase/templates/auth/*.html` erneut ausführen, sonst
   driftet der Server von der Datei weg, ohne dass es jemand sieht.
3. ~~Favicon bei 16x16~~ **behoben am 03.08.** Die Sorge war berechtigt und der Schaden groesser
   als erwartet: bei echten 16px verschmolz nicht nur der doppelte Ring, der Diamant wurde zum
   Klumpen und das Gold zu mattem Oliv. Ursache ist Arithmetik, kein Rendering-Fehler - die
   nachgezeichneten Pfade tragen `stroke-width="0.5"` auf einer 1024er viewBox, eine Linie ist
   bei 16px also 0,008 Pixel breit und wird anteilig ins Navy gemischt.
   Neu: `assets/web/favicon-small.svg`, von Hand auf einer 16-Einheiten-viewBox gezeichnet
   (eine Einheit = ein Pixel), ein Ring, kein Diamant. `app.config.ts` zeigt jetzt dorthin.
   `generate.py` erzeugt diese Datei **nicht** und darf sie nicht ueberschreiben.
   Nachpruefen mit `qlmanage -t -s 16 -o /tmp/fav assets/web/favicon-small.svg`.

### Geraetetest 03.08. - 17 Befunde, gebuendelt zu acht Paketen

Reihenfolge nach Schadenshoehe. A ist zuerst dran (Owner-Entscheidung 03.08.).

**A. Geldwahrheit.** Diagnose am 03.08. abgeschlossen. Die Vermutung „die Demo-Buchung schreibt
nicht" war **falsch** - die DB ist in jedem geprueften Fall korrekt. Es sind zwei Ursachen:

**A1 - Anzeige. Behoben am 03.08.** Der Budget-Bildschirm fuehrt zwei Kassenbuecher zusammen,
die getrennt gehoeren: was der Organisator an Game Over zahlt (`bookings`) und was die Gaeste an
den Organisator zahlen (`event_participants`). Die beiden oberen Karten sind als Ersteres
beschriftet, wurden aber aus Letzterem summiert. Belege (Live-DB gegen Screenshots):

| Event | App zeigte | DB-Buchung | Gaestebeitraege |
|---|---|---|---|
| Van's | 0 € / 2290 € | 572,50 € / 1717,50 € | 0 bezahlt |
| Sven's | 0 € / 1145 € | voll bezahlt, Rest 0 € | 0 bezahlt |
| Natalia | 687 € / 458 € | 286,25 € / 858,75 € | 687 € von 1145 € |

Die angezeigten Werte waren exakt die Gaestespalte. Neu: `src/utils/budgetStats.ts` mit
`computeBookedBudgetStats`, 7 Tests auf genau diesen Live-Zahlen. `collected` und `pending`
kommen jetzt aus der Buchung, `paidCount`/`pendingCount`/`perPerson` weiter aus den Gaesten.
Zwei Nebenbefunde gleich miterledigt: die Kopfzahl wurde per `total / per_person`
zurueckgerechnet statt aus der vorhandenen Spalte `paying_participants` gelesen, und die
Betraege wurden auf ganze Euro gerundet (`286 €` statt `286,25 €`).

**Vorsicht bei einer vollstaendig bezahlten Buchung:** `deposit_amount_cents` bleibt dabei auf
der urspruenglichen Anzahlung stehen, der Rest wird separat verbucht. Wer `collected` allein aus
`deposit_amount_cents` liest, meldet Sven's Buchung mit 286,25 € statt 1145 €. Deshalb
`fully_paid_at ? total : deposit`.

**A2 - Mail. Behoben am 03.08.** Der Befund war groesser als die Meldung: es fehlte nicht die
Demo-Anbindung, sondern jede Anbindung. `send-email` wurde **von niemandem** in der Codebasis
aufgerufen, und weder `confirm-demo-booking` noch `stripe-webhook` verschickten irgendetwas -
auf keinem Zahlungsweg ging jemals eine Buchungsbestaetigung raus, auch bei echter
Stripe-Zahlung nicht. Vorlage und Renderer waren fertig und ungenutzt.

Neu: `supabase/functions/_shared/booking-confirmation.ts` als einzige Versandstelle, aufgerufen
von beiden Wegen. Sie **wirft nie** - eine erfolgreiche Zahlung darf nicht an einem Mailfehler
scheitern; Fehler werden protokolliert und als Ergebnis zurueckgegeben. Bei `stripe-webhook`
sitzt der Aufruf hinter dem bestehenden Idempotenzschutz (`audit_log`), ein wiederholt
zugestellter Webhook loest die Mail also nicht erneut aus. Der Profilschalter
`email_notifications_enabled` wird bewusst nicht geprueft (Bestaetigungen gehen immer).

Die Vorlage ist dabei zweisprachig geworden (Sprache aus `profiles.language`, Standard Deutsch)
und die Betragszeile heisst bei Vollzahlung „Gesamt bezahlt" statt „Anzahlung bezahlt".
Auf Owner-Hinweis vom 03.08. ausserdem in `supportLine()` und `standardFooter()` bereinigt:
die englische Zeile „If you have any questions…" und der alte Claim
„Game Over - Plan unforgettable parties" sind raus, die Fusszeile traegt jetzt `game-over.app`
und deutsche Linklabel (Datenschutz / AGB / Impressum).

**Paketnamen zur Kontrolle:** die Pakete heissen `<Stadt> Feier` (essential), `<Stadt> Rausch`
(classic), `<Stadt> Legende` (grand) - **nicht** „Classic"/„M". Wer eine Vorschau baut, nimmt
echte Werte; eine erfundene Beispielzeile hat am 03.08. eine falsche Fehlermeldung ausgeloest.

### Deploy-Workflow deployte nie alle Funktionen (gefunden und behoben 03.08.)

Der Schritt in `.github/workflows/deploy-edge-functions.yml` heisst „Deploy all edge functions",
zaehlte aber sieben Funktionen einzeln auf. **Vier fehlten:** `confirm-demo-booking`,
`send-payment-reminders`, `check-invite-delivery` und `crisp-identity`. Sie wurden seit ihrer
Entstehung nie deployt - Aenderungen daran liefen bei jedem Merge lautlos ins Leere, und der
Workflow meldete Erfolg. Liste ergaenzt. **Wer eine neue Edge Function anlegt, traegt sie dort
ein**; die Aufzaehlung bleibt bewusst explizit, damit die beiden cron-getriebenen Funktionen
ihr `--no-verify-jwt` behalten.

### Migration umbenannt statt repariert (03.08.)

Vor dem Push lag genau die in §7 beschriebene Kollision vor: die Live-DB fuehrte
`20260731103342_ops_alert_recipient_helper`, lokal lag dieselbe Migration als
`20260731120000_...`. Ursache ist der uebliche Ablauf - jemand wendet sie per MCP
`apply_migration` an (Supabase stempelt dabei seinen eigenen Zeitstempel) und committet die
Datei danach mit einem anderen. `supabase db push` haette abgebrochen und damit **jede**
kuenftige Migration blockiert.

Geprueft und dann umbenannt statt `migration repair` zu rufen: `pg_get_functiondef` der
Live-Funktion ist zeichengleich mit dem Dateiinhalt, die Migration ist also bereits angewendet.
Die Datei traegt jetzt den Live-Zeitstempel, beide Seiten stimmen ueberein, die DB wurde nicht
angefasst.

**Regel daraus:** wer eine Migration per MCP anwendet, holt sich danach den vergebenen
Zeitstempel aus `supabase_migrations.schema_migrations` und benennt die lokale Datei **sofort**
danach. Sonst faellt es erst beim naechsten Push auf, und dann in einem roten CI-Lauf, dessen
Ursache Wochen zurueckliegt.

**Ebenfalls offen an A:** `budget/index.tsx:1462` zieht die Kopfzahl fuer die Zahlungs-URL
weiter aus dem AsyncStorage-Cache statt aus der Buchung - bewusst nicht angefasst, weil die
`+1`-Semantik dort ungeklaert ist.

### Kopfzahl vs. zahlende Personen (Owner-Klarstellung 03.08.)

Es gibt **keinen** Platzhalter fuer „gebucht, aber noch nicht beigetreten" und es soll auch
keiner gebaut werden. Die Differenz zwischen zwei Zahlen hat einen fachlichen Grund:

- `bookings.paying_participants` = wer **zahlt**.
- `bookings.exclude_honoree` = ob der Ehrengast seinen eigenen Anteil **nicht** traegt.
- Sagt der Kunde bei der Buchung, dass Braut/Braeutigam nicht selbst zahlen, wird die Summe
  auf **Kopfzahl minus eins** verteilt. Die Kopfzahl ist dann `paying_participants + 1`.
- `per_person_cents` ist in allen geprueften Zeilen exakt `total_amount_cents / paying_participants`.

Belegt an den Testdaten: Van's hat 9 zahlende bei `exclude_honoree = true`, und der
Bestaetigungsbildschirm zeigt korrekt „10 Gaeste". Sven's hat 4 zahlende, also 5 Koepfe.
Die Kopfzahl ist damit **ableitbar** und muss nirgends zusaetzlich gespeichert werden.

**Widerspruch in Natalias Testzeile, ungeklaert:** dort steht `exclude_honoree = false` bei
5 zahlenden und 114500 (5 x 229 EUR) - die Braut zahlt also mit, und 5 ist die Zahl der
Zahlenden, nicht die Kopfzahl. Der Owner beschrieb sie am 03.08. als „4 zahlen, die fuenfte ist
die Braut". Beides zusammen geht nicht: bei nicht zahlender Braut waeren es 4 x 229 = 91600.
Entweder wurde die handgesetzte Zeile vom 31.07. mit dem falschen Schalter angelegt, oder die
Erinnerung stimmt nicht. **Vor dem naechsten Test an Natalias Zahlen einmal klaeren**, sonst
jagt jemand wieder einen Rechenfehler, den es nicht gibt.

**B. Paketbilder.** In der Paketauswahl (Schritt 4) tragen alle drei Pakete dasselbe
Hintergrundbild. Die Buchungsbestaetigung zeigt danach das *richtige* Bild pro Paket und Stadt -
die Datenquelle stimmt also, die Auswahlliste greift auf einen falschen Index oder ein Fallback.
Regression aus den letzten Buchungsprozess-Aenderungen.

**C. Kanal loeschen (Chat).** Zwei Fehler uebereinander: der Knopf tut nichts (mehrfaches
Druecken ohne Wirkung), und die Bestaetigung ist ein bildschirmfuellendes Sheet, wo die uebrigen
Meldungen der App kleine Toasts sind. Erst pruefen, ob hinter dem Knopf ueberhaupt etwas haengt
(`app/(tabs)/chat/[channelId].tsx`), dann auf das bestehende Toast-Muster vereinheitlichen -
Bestaetigen darf bleiben, nur nicht in dieser Groesse.

**D. Login.** Der „Anmelden"-Knopf verschwindet unter der Tastatur. Ausserdem brauchen E-Mail-
und Passwortfeld zwei bis drei Taps, bis der Cursor sitzt; die *gesamte* Feldflaeche muss treffen,
auch Briefumschlag- und Schlosssymbol. Verdacht: derselbe Mechanismus wie frueher schon - der
Icon-Wrapper in `Input` schluckt Beruehrungen, wenn kein `onRightIconPress` gesetzt ist.

**E. E-Mail aendern (Profil).** Bei einer bereits vergebenen Adresse erscheint der rote
Console-Error-Overlay statt einer deutschen Meldung; Soll ist ein Toast, 6 s, kein Dialog in der
Mitte. Dazu Layout: zwischen Passwortfeld und Knopf steht eine grosse tote Flaeche, die Felder
gehoeren direkt ueber „Bestaetigungslink senden".

**F. Benachrichtigungen.** „Vom Gast angepasst" soll benennen, *was* geaendert wurde (Name /
E-Mail / Telefon, einzeln oder kombiniert) und auf zwei Zeilen umbrechen
(`src/i18n/*.ts` → `manageInvitations.guestAdjusted`, `app/event/[id]/participants.tsx:768`).
Ausserdem darf der „Betriebshinweis - geplanter Aufruf HTTP 500" beim Organisator gar nicht
ankommen; das ist eine Betriebsmeldung, keine Nutzermeldung.

**G. Boot und Splash.** Die graue Zeile `game-over.app` unter dem Logoaufbau soll weg; der
Vier-Sekunden-Aufbau traegt die Marke bereits selbst.
**Einschraenkung:** der zweite Screenshot („Downloading 86.10 %") zeigt den Ladebildschirm des
Expo-Dev-Clients. Diesen Text kontrolliert Expo, nicht dieser Code, und im Store-Build existiert
der Bildschirm nicht. Vor einer Zusage pruefen, was davon ueberhaupt beeinflussbar ist.

**H. Marke in allen Mails.** ~~Grossteil~~ **weitgehend erledigt am 03.08. - die Annahme des
Auftrags war falsch.** Eine Bestandsaufnahme zeigte: die Mails setzen die neue Regel bereits
Wort fuer Wort um. `invite.html` traegt „Du bist zu Game Over eingeladen", `confirm-signup.html`
„E-Mail-Adresse bestaetigen | Game Over", `magic-link.html` „Oeffne Game Over ueber diesen
persoenlichen Link", Absender ist `Game Over <support@game-over.app>`, Domain nur in Footer und
Links. Es war nichts umzubauen.

Drei echte Abweicher gefunden und behoben:
- `create-payment-intent/index.ts:201` - Stripe-`description` hiess `Game-Over:`. Dieser Text
  landet auf der **Kartenabrechnung**, war also der sichtbarste der drei.
- `src/i18n/en.ts` / `de.ts`, Schluessel `faq4A` - „zahlt an Game-Over" in beiden Sprachen.

Reine Code-Kommentare (`constants/colors.ts`, `theme.ts`, `spacing.ts`, `typography.ts`,
`types/tamagui.d.ts`, `lib/supabase/client.ts`) tragen weiter „Game-Over App". Bewusst nicht
angefasst: nicht nutzersichtbar.

**Offen an H:** die Aenderung an `create-payment-intent` ist eine Edge Function. Ein Merge nach
main loest `deploy-edge-functions.yml` aus und deployt live - **braucht Owner-Freigabe.**

### Bekannt, bewusst so gelassen

- `assets/brand/intro.mp4` existiert nicht, `INTRO_VIDEO_SOURCE` bleibt `null`. Der Intro-Aufbau
  läuft als Animation; für die Webseite liegt er als `assets/web/intro.html` (CSS/SVG, kein JS).
- Splash und Adaptive-Icon bleiben PNG - Expo lässt dort kein SVG zu. Nur das Web-Favicon ist SVG.
- Der Profil-Schalter "E-Mail-Benachrichtigungen" steuert **nur** die abbestellbaren Erinnerungen
  (18/16/12/10) und das Briefing. Bestätigungen, Storno und Einladungen gehen immer.
- `send-payment-reminders` und `process-payment-reminders` sind **keine** Dubletten:
  ersteres ist "Alle erinnern" im Budget (`budget/index.tsx:829`), letzteres der tägliche Cron.

---

## Testdaten (Stand 31.07.)

Drei Events, alle `booked`:

| Ehrengast | Datum | Referenz | Total | Anzahlung | Status |
|---|---|---|---|---|---|
| Soleil Phoenix | 02.08. | - | keine Buchung | - | Briefing sendet Platzhalter `GO-XXXXXX` |
| Natalia Schulz | 16.08. | `GO-376D44` | 114500 | 28625 | `processing`, 5 Personen |
| Sven Ostermann | 22.08. | `GO-1B1063` | 137400 | 34350 | `processing` |

Natalias Geldspalten und Teilnehmerbeiträge wurden am 31.07. **von Hand gesetzt** - das dokumentiert
einen Zahlungseingang, den es nie gab. Bewusst so, weil Testevent. Es gibt erst 4 Teilnehmerzeilen;
die Buchung laeuft bewusst ueber 5 Personen, der fuenfte ist noch nicht beigetreten.
Bei einem Testlauf von `process-payment-reminders` vorher prüfen, ob eine Buchung auf einem
Meilenstein steht - die Funktion storniert am Tag 6 automatisch.

---

## Zum Gerätetest offen

Der gesamte Stand vom 30./31.07. ist auf `main`, aber **am Gerät ungesehen**:
Toasts über der Tab-Leiste (6/4/2 s), ConfirmSheet statt nativer Dialoge, Rückerstattungs-Maske,
E-Mail-Fehlermeldungen auf Deutsch, Budget-Zahlen, Boot-Screen mit Wortmarke, Tastatur im Profil.

`xcode-select` zeigt nicht auf Xcode, der Simulator ist blockiert. Braucht das Passwort des Users:
`sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

---

## Arbeitsweise

Bau überwiegend via Codex (`gpt-5.6-sol` für Anspruchsvolles, `terra` für klar Beschriebenes,
`luna -s read-only` für breites Suchen). Diagnose, DB, Deploy und Urteilsfragen bei Claude.
Jede Gruppe mit `npm run typecheck`, `npm run lint`, `npx vitest run` grün, plus `deno check` für
angefasste Edge Functions.

**Vor dem Abzweigen eines Branches `main` prüfen und lange Branches nachziehen.** Am 31.07. lagen
zehn Commits paralleler Sessions an denselben Dateien; die Konfliktauflösung kostete ein Vielfaches
der eigentlichen Änderung.
