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
  ruft über **`zsh -ic '<befehl>'`** auf.

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
3. **Favicon bei 16x16 ungeprüft.** Der doppelte Ring könnte in der Tableiste zu einer Linie
   verschmelzen. Falls ja: eigene Kleinvariante mit einem Ring, **nicht** alle Linien verdicken -
   das hat die Diamantfacetten zerstört und musste zurückgebaut werden.

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
