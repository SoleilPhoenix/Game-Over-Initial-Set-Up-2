# Handoff - Game Over App

Statusdatei des Projekts. Ein `Status.md` gibt es bewusst nicht.
Wird laut globaler `~/.claude/CLAUDE.md` im selben Commit fortgeschrieben wie die Änderung, die sie beschreibt.

**Diese Datei ist absichtlich kurz.** Sie beschreibt den *aktuellen* Stand und offene Punkte,
nicht die Sitzungshistorie. Dauerhafte Lehren gehören ins Projektgedächtnis
(`~/.claude/projects/-Users-soleilphoenix-Desktop-GameOver/memory/`), nicht hierher.
Erledigtes wird gelöscht, nicht archiviert - `git log` ist das Archiv.

Letzte Aktualisierung: 2026-08-06.

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

**Weitere Kosten und Paketrechnung sind zwei getrennte Kassenbücher.** Owner-Entscheidung vom
06.08. `event_expenses` fließt **nicht** in `bookings`, nicht in Anzahlung, Restbetrag oder
`splitPerPerson`. Auch die Zahlungserinnerung *listet* beide getrennt und *summiert* sie nicht.
Wer hier eine gemeinsame Gesamtsumme baut, wiederholt den Fehler vom 05.08.: zwei Wahrheiten für
dieselbe Zahl.

**Anteile an weiteren Kosten nur über `set_expense_shares`.** Ein Trigger erzwingt, dass die Summe
der Anteile den vollen Betrag des Postens ergibt - aufgeschoben bis zum Commit, weil die Anteile
Zeile für Zeile geschrieben werden. PostgREST fährt aber jede Anfrage in einer eigenen Transaktion:
wer den Betrag ändert und danach die Anteile nachzieht, läuft schon beim ersten Schritt in die
Prüfung. Die RPC macht beides in einem Zug. Direkte Schreibzugriffe auf `event_expense_shares`
aus dem Client funktionieren nur zufällig, solange sich der Betrag nicht mit ändert.

**Der Ehrengast hängt an `can_see_event_money()`, nicht an `is_event_participant()`.** Letztere
kennt die Rolle nicht - der Ehrengast *ist* Teilnehmer. Jede Policy auf den vier
`event_expense*`-Tabellen benutzt deshalb die neue Funktion. Wer das beim Erweitern vergisst,
öffnet die Sperre aus `20260806073606` von hinten wieder.

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

### Weitere Kosten in die Datenbank - fertig, wartet auf den Geraetetest (Stand 06.08.)

**Vollstaendig in `main` und live deployt.** Migration `20260806133222_event_expenses.sql`
angewendet: 4 Tabellen (`event_expenses`, `event_expense_shares`, `event_expense_reports`,
`event_expense_categories`), alle mit RLS, 16 Policies, 6 Trigger, 7 Funktionen.

Fertig und verifiziert (typecheck gruen, 211 Tests in 31 Dateien gruen):
Schema, Repository, Query-Hooks, Aufteilungsrechnung (`calculateExpenseSplit` in `money.ts`,
neben `splitPerPerson`, das unangetastet bleibt), einmalige Uebernahme aus dem Geraetespeicher,
geteilte Kategorien, Budget-Reiter, Push an die Markierten, zweiter Abschnitt in den
Zahlungserinnerungen.

**Offen ist nur noch der Geraetetest.** Nichts davon ist je auf einem Geraet gelaufen.

Vier Dinge, die beim Bauen Zeit gekostet haben:
- Der Benachrichtigungstrigger feuerte bei **jeder** Bearbeitung erneut fuer alle Beteiligten,
  weil `set_expense_shares` die Anteile komplett ersetzt. Er schickt jetzt nur beim ersten Mal
  je Person und Posten.
- Push fuer Gast -> Gast geht **nicht** ueber `send-push-notification`: deren Autorisierung
  kennt nur Teilnehmer -> Organisator und Organisator -> Gast. Dafuer gibt es
  `notify-expense-shares`, die nur eine expenseId annimmt und ueber den Service-Role-Pfad
  zustellt. Keine allgemeine Gast-zu-Gast-Erlaubnis aufmachen.
- Zwei Testsuiten (`usePublicInvitePreview`, `useBookingFlow`) scheiterten **nur in Worktrees**
  und liefen im Hauptbaum gruen - Vitest loest `expo-modules-core` ausserhalb des Vite-Roots auf
  und uebersetzt dessen Quellen. Behoben ueber einen Alias auf `__tests__/stubs/`.
- Der Ehrengast-Einladungsweg **existiert vollstaendig** (Slot im Teilnehmer-Bildschirm ->
  `isHonoree` -> `send-guest-invitations` schreibt `is_honoree` -> `accept_invite` setzt die
  Rolle). Er wurde nur nie benutzt, deshalb gibt es null Ehrengaeste in der Datenbank und die
  Sperre hatte noch nie einen realen Betroffenen. Wer das prueft, sucht nicht nach fehlendem
  Code - der Slot braucht nur eine E-Mail.

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
   (eine Einheit = ein Pixel). `app.config.ts` zeigt jetzt dorthin. `generate.py` erzeugt diese
   Datei **nicht** und darf sie nicht ueberschreiben.

   **Der Diamant ist drin** (Owner-Entscheidung 03.08.), aber als *massive* Raute statt als
   facettierte Strichzeichnung: Flaeche ueberlebt das Runterrechnen, Haarlinien nicht.
   Entscheidend war das Breitenverhaeltnis - Stein 4,8 Einheiten, Steg 1,8, rund 2,7:1. Zwei
   Zwischenstaende wurden verworfen, weil beide bei 16px zu einem Nagel verschmolzen.
   Ab 32px ist der Stein klar lesbar; bei 16px wird er zu einem kurzen Querbalken. Das ist die
   bewusst getragene Einbusse, weil Browser auf Retina mit 32-40 Geraetepixeln rendern.

   Die **Wortmarke bleibt draussen**: „game-over.app" sind 13 Zeichen, bei 16 Pixeln Breite
   blieben 1,2 Pixel pro Zeichen. Sie gehoert auf den Boot-Screen und in den Mail-Kopf.

   Nachpruefen mit `qlmanage -t -s 16 -o /tmp/fav assets/web/favicon-small.svg`; jedes Goldpixel
   heller als `#C6A75E` ist ein Artefakt, Antialiasing kann nur Richtung Navy abdunkeln.

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

### Rundung und Cache-Wahrheit (05.08.) - vier Fehler, eine Krankheit

Beim Geraetetest am 05.08. fielen widerspruechliche Zahlen auf. Die DB war bei **allen** Events
korrekt; alle vier Fehler lagen in der Anzeige, und drei davon hatten dieselbe Wurzel:
**zwei Wahrheiten fuer dieselbe Zahl** - die Buchung und der AsyncStorage-Cache.

1. **`bookingKeys` wurde nach der Zahlung nie invalidiert.** `payment.tsx` invalidierte nur
   `eventKeys.all`. Die Buchungsabfrage behielt ihren Wert von *vor* der Zahlung - bei einem
   frisch angelegten Event ist das `null`, weil sie lief, bevor die Buchung existierte. Der
   Budget-Bildschirm fiel dann in seinen Demo-Zweig und zeigte „Bezahlter Betrag 0 €", obwohl
   die Anzahlung in der DB stand. Das war der Fall „Hans".
2. **Die Dringlichkeitspruefung las den Cache**, nicht die Buchung
   (`event/[id]/index.tsx`). Deshalb kippte sie je Event in die andere Richtung: bei Natalia
   sagte der Cache „voll bezahlt" (am 31.07. von Hand gesetzt), die Buchung 25 %; bei Sven
   genau umgekehrt. Liest jetzt die Buchung, Cache nur noch als Rueckfall.
3. **Der Anteil pro Person wurde durch `participants.length` geteilt** - also durch die
   *beigetretenen* Gaeste statt durch `paying_participants`. Bei Natalia 4 statt 5, der Anteil
   damit 286,25 € statt 229 €.
4. **Zwei Waehrungsformate auf demselben Bildschirm.** In der Zahlungsuebersicht standen
   Gesamtbetrag und Anzahlung glatt, der Anteil pro Person mit zwei Nachkommastellen.
5. **Die Prozentangabe auf der Eventkachel** (`(tabs)/events/index.tsx`, `getPaymentStatus`)
   las ebenfalls den Cache - **und hatte einen fest verdrahteten Rueckfall auf 25 %**, der
   immer dann log, wenn der Cache fehlte. Genau der Fall Sven: Kachel „25 % bezahlt",
   Buchung vollstaendig bezahlt. Der Ratewert ist raus; ohne belastbare Quelle wird lieber
   nichts angezeigt.

   Dafuer laedt die Eventliste jetzt die Buchung mit
   (`booking:bookings(total_amount_cents, deposit_amount_cents, fully_paid_at)`).
   **Zwei Fallen dabei:** PostgREST liefert eine eingebettete Beziehung als **Array**, auch
   bei genau einer Buchung - `firstBooking()` in `events.ts` normalisiert das. Und die
   Einbettung funktioniert nur, weil `bookings_event_id_fkey` existiert; ohne Fremdschluessel
   scheitert die ganze Abfrage zur Laufzeit und die Liste bliebe leer. Am 05.08. geprueft.

**Owner-Regel vom 05.08., jetzt in `src/utils/money.ts` an einer Stelle:**

- Betraege erscheinen **ueberall** als ganze Euro - Buchungsstrecke wie Budget.
- **Der Rest ist immer eine Differenz**, nie eine eigene Rundung. Getrennt gerundet liegen
  Anzahlung und Rest sonst einen Euro neben der Summe.
- **Pro Person wird abgerundet, die Differenz traegt der Organisator.** Alle Gaeste sehen
  denselben glatten Betrag. Beispiel Dana: 895 € auf 4 Zahlende, jeder Gast 223 €, der
  Organisator 226 €.
- Abgerundet wird bewusst, nicht kaufmaennisch: eine zu niedrig ausgewiesene Anzahlung
  ueberzeichnet den offenen Rest, und das ist die ungefaehrliche Richtung.

12 Tests sichern die Regel, darunter einer, der ueber sechs Kombinationen prueft, dass die
Summe der Anteile **exakt** den Gesamtbetrag trifft. Das ist die Eigenschaft, die beim Runden
zuerst kaputtgeht.

**Achtung fuer die naechste Aenderung:** `budget/index.tsx` hat weiterhin einen Demo-Zweig fuer
Events ohne Buchungszeile, der aus dem Cache liest. Er ist jetzt schwerer zu treffen, aber nicht
weg. Wer dort Zahlen aendert, muss beide Zweige anfassen.

### Gruppenbeitraege: Aufteilung, Ehrengast, Erinnern-Knopf (05.08., zweite Runde)

**Die Zeilenbetraege kamen aus `contribution_amount_cents`** - dem beim Beitritt eingefrorenen
Wert. Der driftet danach von der Buchung weg: bei Natalia standen 229 € je Zeile, waehrend vier
sichtbare Zeilen 916 € statt 1145 € ergaben. Sie kommen jetzt aus `splitPerPerson(total,
paying_participants)`, der Organisator traegt die Differenz. Damit passt die Summe immer.

**Neue Regel: der Ehrengast erscheint als Beitragszeile, wenn er mitzahlt** (`exclude_honoree =
false`). Er hat keine `event_participants`-Zeile, solange er nicht selbst beitritt - deshalb
eine synthetische Zeile in `sortedParticipants`.

**Die Zeile zeigt keinen Mahnstatus** (Owner-Wunsch 05.08.). Statt „Ausstehend" nennt sie unter
dem Namen die Rolle - „Bachelorette" bzw. „Bachelor" aus `events.party_type` - und unter dem
Betrag „Wird nach dem Event eingezogen". Der Grund ist fachlich: der Ehrengast soll von der
Party nichts wissen, also darf er vorher nicht zur Zahlung gedraengt werden. Ein Mahnstatus an
dieser Stelle waere nicht nur haesslich, sondern sachlich falsch.

Passend dazu ist der Ehrengast von „Alle erinnern" ausgenommen: `reminderRecipients` filtert auf
`role === 'guest' && !!user_id`. Und er zaehlt nicht in `pendingCount`, weil `budgetStats` aus
den echten `participants` rechnet, nicht aus `sortedParticipants` mit der synthetischen Zeile -
der Erinnern-Knopf bleibt also nicht seinetwegen aktiv. **Beides ist Absicht, nicht Zufall.**

**Was die App nicht weiss:** ob der Ehrengast tatsaechlich gezahlt hat. Es gibt keine Zeile, an
der ein Status haengen koennte.

### Offen: echte Teilnehmerzeile fuer den Ehrengast (Owner-Wunsch 05.08.)

Der Ehrengast soll kurz vor der Party die App bekommen und sie waehrend des Events nutzen -
**ohne Zahlen und Geldfakten zu sehen**. Dafuer braucht er eine echte `event_participants`-Zeile
statt der synthetischen Anzeige. Bestandsaufnahme vom 05.08., damit die naechste Session nicht
neu suchen muss:

**Was schon da ist:**
- Das Enum `participant_role` kennt **`honoree`** bereits. Keine Enum-Migration noetig.
- `app/event/[id]/participants.tsx` rendert den Ehrengast bereits als vollwertigen Platz mit
  eigener Darstellung, editierbarer E-Mail/Telefon und einer Suche nach
  `dbParticipants.find(p => p.role === 'honoree')`. Der Platz erwartet die Zeile also schon.

**Was fehlt - vier Teile, drei davon freigabepflichtig:**

1. **`accept_invite` vergibt fest `'guest'`.** Der Einladungscode traegt keine Information
   darueber, fuer wen er gedacht war. Loest der Ehrengast ihn ein, wird er zum Gast.
   → `invite_codes` braucht ein Kennzeichen (z. B. `is_honoree`), und `accept_invite` muss es
   auswerten. **Migration, Owner-Freigabe.**
2. **Der Einladungsversand muss den Ehrengast-Platz mitschicken** und entsprechend kennzeichnen.
   → Client plus `send-guest-invitations`. **Edge-Function-Deploy, Owner-Freigabe.**
3. **RLS gibt Geldspalten heute an jeden Teilnehmer frei.** Die SELECT-Policy auf `bookings`
   heisst „Event participants can view bookings" und prueft nur die Mitgliedschaft - ein
   Ehrengast mit Zeile saehe damit Gesamtpreis, Anzahlung und Restbetrag. RLS ist
   zeilen-, nicht spaltenbasiert; der Ehrengast muss also von `bookings` **ganz** ausgenommen
   werden. **Migration, Owner-Freigabe.**
4. **UI:** Budget-Tab und Beitragsliste fuer die Rolle `honoree` ausblenden bzw. auf
   nicht-finanzielle Inhalte reduzieren. Reiner Client, keine Freigabe.

**Reihenfolge:** 3 vor 1. Wuerde zuerst die Zeile entstehen und erst danach die Policy greifen,
haette der Ehrengast in der Zwischenzeit vollen Blick auf die Zahlen - genau das, was der
Wunsch verhindern soll.

**ALLE VIER PUNKTE SIND ERLEDIGT** (06.08.). Die DB-Haelfte kam zuerst, der Client danach in
einem Codex-sol-Lauf ueber 22 Dateien. Details unten; das Wichtigste zuerst:

**`src/utils/permissions.ts` ist ab jetzt die einzige Stelle fuer Rollenrechte.** Vorher lagen
`isOrganizer`/`isGuest` an rund 86 Stellen in 12 Dateien verstreut, viermal unterschiedlich
hergeleitet. Wer eine neue rollenabhaengige Anzeige baut, fragt **Faehigkeiten** ab
(`canViewBudget`, `canViewExtraCosts`, …), nicht Rollen. Drei Eigenschaften tragen das Modell:

- **Default-Deny.** Unbekannte oder fehlende Rolle ergibt ein eingefrorenes Nullobjekt. Wer eine
  Stelle vergisst, faellt auf „darf nicht" - nicht auf „darf".
- **Ein URL-Parameter kann Rechte nur senken, nie heben.** `?role=guest` war vorher an mehreren
  Stellen die Quelle fuer `isGuest`. Fuer die Vorschau ist das gewollt, fuer Rechte waere es
  faelschbar gewesen. Ein Rangvergleich erzwingt die Richtung.
- **Organisator ist ausschliesslich `events.created_by`.** Eine Teilnehmerzeile mit Rolle
  `organizer` gewaehrt bewusst nichts - sonst waere eine veraltete Zeile ein Rechteweg.

Je ein Test haelt die letzten beiden Punkte fest.

**Der Ehrengast fragt die Buchung gar nicht erst ab.** Zweistufige Aufloesung: erst Faehigkeiten
ohne Buchung, daraus die Entscheidung, was geladen wird, dann die endgueltigen Faehigkeiten.
`useBooking` laeuft nur bei `canViewBudget`, das RPC `get_my_event_share` nur im Gegenfall. Der
RLS-Fehlerpfad wird nie beruehrt - **so muss das bleiben**, sonst kommt der Fehler als Absturz
durch.

**Schritt 3 und die DB-Haelfte von 1 sind erledigt** (Migration
`20260806073606_honoree_participant_role.sql`, von Codex sol geschrieben, 06.08.):
`invite_codes.is_honoree`, `accept_invite` vergibt die Rolle daraus, die `bookings`-SELECT-Policy
schliesst `role = 'honoree'` aus, und `get_my_event_share(event_id)` liefert `(pays, share_cents)`
ohne den Gesamtpreis preiszugeben.

**Die Rundung im RPC ist eine bewusste Doppelung von `splitPerPerson`** in
`src/utils/money.ts` - noetig, weil der Client den Gesamtpreis nicht bekommt und deshalb nicht
selbst teilen kann. **Beide muessen zusammen geaendert werden**, ein SQL-Kommentar sagt das auch.
Codex hatte im ersten Wurf fuer den Organisator denselben Anteil wie fuer Gaeste zurueckgegeben;
bei Dana waeren das 4 x 223 = 892 statt 895 EUR gewesen. Nach der Korrektur stimmen SQL und
TypeScript ueber neun geprueften Faellen inklusive Randfaelle exakt ueberein.

**Zwei Grenzen, die bleiben und die man kennen muss:**
- `event_participants` bleibt fuer alle Teilnehmer lesbar, inklusive
  `contribution_amount_cents`. RLS ist zeilen-, nicht spaltenbasiert; den Ehrengast ganz
  auszusperren wuerde Gaesteliste und Chat brechen.
- Wer seinen eigenen Anteil kennt und die Teilnehmer zaehlen kann, **kann den Gesamtpreis
  ueberschlagen**. Das folgt zwangslaeufig daraus, dem zahlenden Ehrengast seinen Betrag zu
  zeigen. Verhindern liesse es sich nur, indem man ihm den Anteil ganz vorenthaelt - der Owner
  hat sich am 06.08. bewusst dagegen entschieden. Die Zusage lautet also „er sieht die Zahlen
  nicht", nicht „er kann sie nicht erschliessen".

**„Weitere Kosten" brauchen keine RLS:** es gibt keine `expenses`-Tabelle, die Eintraege liegen
ausschliesslich im AsyncStorage des jeweiligen Geraets (`gameover:custom_cats:<eventId>`). Auf
dem Telefon des Ehrengasts ist die Liste ohnehin leer. Ausblenden ist reine UI-Arbeit.

**„Alle erinnern"** verschwindet nicht mehr, wenn niemand offen ist, sondern wird ausgegraut.
Das **„DU"-Abzeichen** hinter dem eigenen Namen ist raus - der Nutzer weiss, wie er heisst.

**Freie Plaetze werden jetzt angezeigt** (Owner-Wunsch 05.08., loest die Absage vom 03.08. ab).
Die Buchung ist fuer `paying_participants` Personen bezahlt; fuer wen noch niemand eingetragen
ist, erscheint eine Platzhalterzeile „Gast #N" mit dem Anteil und Status offen. Vorher zeigte
das Budget direkt nach der Buchung nur den Organisator, und die sichtbaren Betraege ergaben
einen Bruchteil des Gesamtpreises.

Die Nummerierung nutzt `manageInvitations.guestSlot`, damit sie mit dem Einladungsbildschirm
uebereinstimmt. Die Zeilen sind **bewusst nicht bearbeitbar**: ein Tippen erklaert, dass Gaeste
unter „Einladung" gepflegt werden, weil dort E-Mail und Telefon miterfasst werden - ohne die
kann niemand eingeladen oder erinnert werden. Neue Schluessel `budget.openSlotTitle` und
`budget.openSlotMessage`, EN und DE.

Kontrollrechnung ueber alle vier Live-Events, jeweils exakt aufgehend:

| Event | Zahlende | Organisator | je Gast | Summe |
|---|---|---|---|---|
| Natalia | 5 | 229 € | 229 € | 1145 € |
| Sven | 4 | 287 € | 286 € | 1145 € |
| Hans | 4 | 287 € | 286 € | 1145 € |
| Dana | 4 | 226 € | 223 € | 895 € |

**Natalias Buchungszeile bleibt der Ausreisser.** Drei von vier Events haben
`exclude_honoree = true` mit 4 Zahlenden; Natalia hat `false` mit 5. Das ist die von Hand
gesetzte Testzeile vom 31.07. Mit der neuen Ehrengast-Regel ist sie **in sich stimmig**
(5 Zeilen a 229 € = 1145 €), weicht aber vom Muster der anderen Events ab. Wer sie angleichen
will, aendert Geldspalten - das schreibt nur der Server, und es braucht Owner-Freigabe.

### Markenclaim in jeder Mail, Partybezeichnung vereinheitlicht (03.08.)

Der Claim „Einer heiratet. Alle feiern. Keiner stresst." stand dreimal als **kopiertes Markup**
in `email-templates.ts` und fehlte dafuer in Buchungsbestaetigung und Willkommensmail. Jetzt
liegt er als `brandClaimTable()` / `brandClaimRow()` an einer Stelle und steht in jeder Mail
direkt unter dem goldenen Knopf. Die verwaisten `claimLines`/`claimSub`-Schluessel in den drei
Copy-Objekten sind entfernt.

Die Anrede der Buchung heisst jetzt **„<Ehrengast>: Bachelor(ette) Party"** (`buildPartyLabel`),
in Betreff und Fliesstext dieselbe Zeichenkette. Quelle ist `events.party_type`, **nicht**
`events.title`: der lautet bereits „Natalia's Bachelorette", was zu „Natalia Schulz: Natalia's
Bachelorette Party" gefuehrt haette.

Der Paketname erscheint **ohne Stadtpraefix**: die Pakete heissen „Berlin Legende", die Stadt
steht in der Mail aber schon in einer eigenen Zeile darunter. Abgeschnitten wird datengetrieben
anhand des Stadtnamens, nicht per Namensliste - neue Staedte funktionieren ohne Codeaenderung,
und ein Paket ohne Praefix bleibt unveraendert.

(Die zwischenzeitlich notierte Frage nach einer Anrede „Hallo Django und Jane," hat sich
erledigt: „Jane" war ein Diktierfehler, es geht nur um den Organisator.)

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

**B bis G: umgesetzt am 03.08.**, Reihenfolge C-D-B-F-E-G wie geplant. Was dabei herauskam,
steht weiter unten unter „Pakete B bis G - Ergebnis". Am 05.08. wurden die dort offenen Punkte
nachgezogen: Kanal-Persistenz scharf geschaltet, Lesestand pro Nutzer, lokale Kanaele werden
uebernommen, Tastatur-Muster vereinheitlicht. Offen bleibt allein **F2**, und dort nur noch der
Schritt, den der Owner selbst ausfuehrt (Betreiber-Konto anlegen).

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

### MMKV auf 4.3.2 - behebt den roten iOS-Build (03.08., Owner-Freigabe)

`Build iOS` scheiterte mit `exit code 65` (behoben, siehe unten); die Ursache stand weit oben im Log:

```
ios/Pods/MMKVCore/Core/aes/AESCrypt.cpp:83:11: error: use of undeclared identifier 'memset_s'
```

**Die Ursache war nicht der Compiler, sondern eine offene Versionsspanne.** `react-native-mmkv`
2.12.2 deklarierte `s.dependency "MMKV", ">= 1.3.3"` - nach oben unbegrenzt. CocoaPods zog damit
bei jedem CI-Lauf die neueste Core-Fassung; irgendwann war das eine mit `memset_s`, und der Build
brach, **ohne dass sich im Projekt etwas geaendert hatte**. Der Job war schon am 30.07. rot.

Behoben mit **`react-native-mmkv` 4.3.2** plus **`react-native-nitro-modules` 0.36.5** als
Peer. Dessen Podspec pinnt exakt auf `MMKVCore 2.4.0`; an der Quelle geprueft enthaelt dessen
`AESCrypt.cpp` kein `memset_s`. Damit ist auch die Drift weg, nicht nur das Symptom.

**Verifiziert:** CI-Lauf `30840786969` zu Commit `1a4e835ae` - `Code Quality`, `Build Android`
und `Build iOS` alle **gruen**. Damit ist der iOS-Build erstmals seit mindestens dem 30.07.
wieder in Ordnung, und Android hat den neuen nativen Nitro-Teil ebenfalls gebaut.

**Lehre fuer die Empfehlung:** vorgeschlagen war der kleinere Eingriff, ein Preprocessor-Define
per Config-Plugin. Der Owner entschied sich fuer den Bump, und die Pruefung gab ihm recht - das
Define haette die offene Versionsspanne stehen gelassen und der naechste Core-Sprung haette
erneut zugeschlagen. Bei einem Fehler, der **ohne eigene Aenderung** auftaucht, lohnt der Blick
in die Podspec auf ungepinnte Abhaengigkeiten, bevor man am Compiler dreht.

**Wichtig fuer die Bewertung:** empfohlen war urspruenglich der kleinere Eingriff - ein
Preprocessor-Define `__STDC_WANT_LIB_EXT1__=1` per Config-Plugin. Der Owner entschied sich fuer
den Bump. Die anschliessende Pruefung gab ihm recht: das Define haette die ungepinnte
Abhaengigkeit stehen gelassen, der naechste Core-Sprung haette erneut zugeschlagen.

**Migrationsaufwand war gering, weil die API gleich blieb.** `storage.ts` nutzt nur
`new MMKV({id})`, `getString`, `set`, `delete` - alle unveraendert in 4.x. Die beiden Testmocks
bilden genau diese Methoden ab und blieben gueltig. Expo SDK 54 hat die New Architecture
ohnehin standardmaessig an, die 3.x+ voraussetzt.

**Noch ungesehen:** MMKV 4 laeuft auf Nitro Modules und damit definitiv nicht in Expo Go.
`storage.ts` faengt das ueber `isExpoGo` und einen try/catch mit AsyncStorage-Rueckfall bereits
ab - das ist Code, der so schon vorher existierte, aber mit der neuen Fassung **am Geraet noch
nicht erprobt** wurde. Beim naechsten Geraetetest gezielt pruefen, ob Zustand-Persistenz und
Supabase-Session einen Neustart ueberleben.

**Triage-Falle:** `--log-failed | tail` zeigt bei diesem Fehler nur Warnungen zu
Deployment-Targets. Immer `| grep -E "error:|The following build commands failed"`.

### Push-Autorisierung (06.08.) - Code fertig, Deploy offen

`send-push-notification` liess **jeden angemeldeten Nutzer** beliebigen Text an beliebige
Nutzer-IDs schicken. Der Autorisierungsblock prüfte nur, ob das JWT gültig ist, nicht *wen*
der Aufrufer benachrichtigen darf; Titel und Text waren ungeprüft. Die Funktion lief also
mit Service-Role-Rechten auf eine Nutzlast, die vollständig vom Aufrufer kam.

Jetzt trennt `callerId` die beiden Wege: `null` heisst Service Role (Cron, Webhooks) und darf
weiterhin alles, eine Nutzer-ID zwingt jeden einzelnen Empfänger durch
`resolveAuthorizedRecipients()`. Diese Funktion bildet die beiden INSERT-Policies auf
`notifications` nach - Teilnehmer → Organisator und Organisator → Gast (`role = 'guest'`) -
und läuft über den Service-Role-Client, damit sie die echten Beziehungen sieht und nicht die
RLS-gefilterte Sicht des Aufrufers. Ein einziger nicht erlaubter Empfänger kippt die ganze
Anfrage mit 403, statt still gefiltert zu werden. Dazu die Längengrenzen des Triggers
`enforce_notification_safety` (120 / 500), ebenfalls nur auf dem Nutzerpfad.

**Wichtig für die Bewertung:** der Nutzerpfad hat heute **keinen einzigen Aufrufer**.
`sendPushNotification()` in `src/hooks/usePushNotifications.ts` wird nirgends verwendet, der
einzige lebende Aufruf ist `process-payment-reminders/index.ts:244` mit Service-Role-Key.
`app/event/[id]/day.tsx:118` trägt ein TODO für einen künftigen Organisator-Aufruf. Die Lücke
war also offen, aber nicht benutzt - und die Änderung kann keinen bestehenden Aufruf brechen.

**Offen:** Der Deploy braucht Owner-Freigabe (Merge nach main löst
`deploy-edge-functions.yml` aus). `send-push-notification` steht **nicht** in `config.toml`,
läuft also mit `verify_jwt = true` - das ist hier richtig, beide Aufrufwege bringen ein
gültiges JWT mit. Nach dem Deploy trotzdem einmal aufrufen und `net._http_response` lesen.

**Ehrengast war ausgeschlossen - am 06.08. auf Owner-Entscheidung behoben.** Die nachgebildete
Policy kannte nur `role = 'guest'`, `honoree` ist seit `20260806073606` eine eigene Rolle. Damit
erreichte ihn weder eine Chatnachricht noch eine app-seitige Erinnerung. Begründung des Owners:
er zahlt seinen Anteil am Paketpreis, also ist Erreichbarkeit Voraussetzung dafür, dass er seinen
Pflichten überhaupt nachkommen kann - auch für Chats und für den Fall, dass er die App erst kurz
vor dem Event installiert. Neue Policy `"Event members can notify the event honoree"`
(`20260806184606_notify_event_honoree.sql`, live) plus der dritte Zweig in
`resolveAuthorizedRecipients()`. Absenderseite nimmt Organisator **und** Gast an.
Der Ehrengast sieht dadurch **keine Zahlen** - das hängt an den `bookings`-Policies und an
`src/utils/permissions.ts` und ist unangetastet. Ein Positiv-Test an echten Daten war nicht
möglich: es existiert live noch keine einzige `honoree`-Zeile. Geprüft ist stattdessen, dass das
Prädikat fehlerfrei läuft und nach Rolle unterscheidet (ein Gast als Empfänger fällt durch, die
Regel weitet also nicht auf Gast-an-Gast aus).

**Migrationsversion muss dem entsprechen, was die DB verbucht hat.** `apply_migration` über MCP
vergibt einen **eigenen** Zeitstempel, nicht den aus deinem Dateinamen. Wer die lokale Datei
danach nicht umbenennt, hinterlässt eine Fernversion ohne lokale Entsprechung - und dann bricht
`supabase db push` **jede** weitere Migration ab, nicht nur die eine. Nach jedem
`apply_migration` also `select version from supabase_migrations.schema_migrations order by
version desc limit 1` lesen und die Datei exakt so benennen. Hier: Datei hiess erst
`20260806190000`, verbucht wurde `20260806184606`, umbenannt.

### Bekannt, bewusst so gelassen

- `assets/brand/intro.mp4` existiert nicht, `INTRO_VIDEO_SOURCE` bleibt `null`. Der Intro-Aufbau
  läuft als Animation; für die Webseite liegt er als `assets/web/intro.html` (CSS/SVG, kein JS).
- Splash und Adaptive-Icon bleiben PNG - Expo lässt dort kein SVG zu. Nur das Web-Favicon ist SVG.
- Der Profil-Schalter "E-Mail-Benachrichtigungen" steuert **nur** die abbestellbaren Erinnerungen
  (18/16/12/10) und das Briefing. Bestätigungen, Storno und Einladungen gehen immer.
- `send-payment-reminders` und `process-payment-reminders` sind **keine** Dubletten:
  ersteres ist "Alle erinnern" im Budget (`budget/index.tsx:829`), letzteres der tägliche Cron.

---

## Pakete B bis G - Ergebnis (03.08.)

Umgesetzt in der Reihenfolge C-D-B-F-E-G. Umsetzung ueberwiegend via Codex (`terra`, fuer B
`sol`), Diagnose, DB-Abfragen und Abnahme bei Claude. Gates nach jedem Paket gruen:
`npm run typecheck`, `npm run lint`, `npx vitest run` - zuletzt 122 Tests, 0 Lint-Warnungen.
**Am Geraet ist nichts davon gesehen**, `xcode-select` zeigt weiterhin nicht auf Xcode.

### C - Kanal loeschen. Behoben, und die Persistenz ist jetzt scharf.

Die Vermutung „vielleicht fehlt eine DELETE-Policy" war **nicht** die Ursache des toten Knopfes,
aber sie hat eine groessere Baustelle aufgedeckt.

**C1 - der tote Knopf: ein Fenster, kein Recht.** Der Loeschknopf sitzt in einem echten
React-Native-`<Modal>` (Kanal-Info). `feedback.confirm()` rendert das globale `ConfirmSheet`
dagegen als gewoehnliche View im Root-Layout. Ein RN-`Modal` ist auf iOS ein **eigenes natives
Fenster ueber dem gesamten React-Baum** - das ConfirmSheet erschien unsichtbar darunter, das
`await` loeste sich nie auf, der Knopf wirkte tot. Jedes weitere Druecken stapelte nur eine
weitere haengende Zusage. Fix: `setInfoModalVisible(false)` wandert **vor** das `await`.
Das Poll-Loeschen war nie betroffen, weil dessen Info-Sheet kein `Modal` ist.
**Merksatz:** `feedback.confirm()` niemals aus einem offenen `<Modal>` heraus aufrufen.
Geprueft: es gibt im Projekt keine zweite solche Stelle.

**C2 - `chat_channels` war eine tote Tabelle.** Null Zeilen, ausser SELECT keine Policy. Jeder
INSERT scheiterte mit `42501`, und `handleChannelCreate` fing genau das ab und legte den Kanal
lokal in AsyncStorage an - **mit Erfolgsmeldung**. Kein Kanal ist je in der DB gelandet; die
Zusage in `CLAUDE.md` traf nicht zu.

Owner-Entscheidung 05.08.: Persistenz scharf schalten. Zwei Migrationen sind **angewendet und
live**:

- `20260805072931_chat_channels_enable_persistence` - Spalte `created_by`, Policies fuer
  INSERT / UPDATE / DELETE, und die SELECT-Policy von einer direkten `event_participants`-Abfrage
  auf `is_event_participant()` umgestellt. Letzteres ist kein Schoenheitsfehler: die alte Policy
  war genau das Muster, das die 42P17-Rekursion ausloest, und es ist nur deshalb nie aufgefallen,
  weil die Tabelle leer war und die Policy nie eine Zeile pruefen musste.
- `20260805073349_channel_read_state_per_user` - neue Tabelle `channel_read_state`
  (Lesestand je Kanal und Nutzer), Spalte `chat_channels.unread_count` **entfernt**, neue Sicht
  `chat_channels_with_unread` mit `security_invoker = true`.

**Unter echtem RLS geprueft** (`set local role authenticated` plus gesetzte JWT-Claims, alles in
zurueckgerollten Transaktionen), nicht nur angenommen:

| Fall | Ergebnis |
|---|---|
| Teilnehmer legt Kanal an | erlaubt |
| Urheber loescht eigenen Kanal | erlaubt |
| Nicht-Teilnehmer legt an | `42501` |
| Teilnehmer loescht fremden Kanal | **0 Zeilen, kein Fehler** |
| Zwei Leser, einer liest | A sieht 0, B sieht 2 |

Die vierte Zeile ist dieselbe Falle wie C1: ein verbotenes DELETE wirft nichts, es betrifft still
0 Zeilen. `channelsRepository.delete` prueft deshalb jetzt die zurueckgegebenen Zeilen und wirft,
wenn nichts geloescht wurde.

**Client nachgezogen:** Lesepfade auf die Sicht, `markAsRead` als Upsert in `channel_read_state`,
`updateUnreadCount` ersatzlos entfernt (ein Zaehler laesst sich nicht mehr von aussen setzen),
`created_by` beim Anlegen - auch im Standardkanal in `events.ts`, sonst haette dieselbe Policy
dort zugeschlagen. Das Info-Sheet zeigt statt „—" den Namen des Urhebers.

**Bestehende lokale Kanaele werden uebernommen.** `src/repositories/localChatMigration.ts` holt
sie beim Fokus einmalig in die DB, samt Nachrichten und deren urspruenglichem `created_at`.
Reihenfolge bewusst: erst in die DB schreiben, dann lokal loeschen - nie umgekehrt. Die
Ziel-UUIDs werden **vor** dem ersten Schreibzugriff persistiert, ein Abbruch wiederholt also mit
denselben IDs und `ignoreDuplicates`. Scheitert ein Kanal, bleibt genau dieser lokal erhalten und
sichtbar und wird beim naechsten Fokus erneut versucht. Kanaele im Eimer `'none'` (ohne Event)
bleiben lokal - es gibt kein Event, an das sie gehoeren. Fremde Nachrichten werden uebersprungen,
weil die `messages`-Policy `user_id = auth.uid()` verlangt.

Nebenbei entschaerft: der Persist-Effekt in `chat/index.tsx` schrieb bei **jeder**
Zustandsaenderung die komplette Karte zurueck und haette gerade uebernommene Kanaele wieder
auferstehen lassen. Er schreibt jetzt nur noch nach einer echten lokalen Aenderung.

Der Loeschtext sagt jetzt, dass die Nachrichten mit geloescht werden - `messages` haengt per
`ON DELETE CASCADE` daran, das war vorher verschwiegen.

**Offen an C:** `unread_count` war eine geteilte Spalte und ist es nicht mehr, aber am Geraet ist
nichts davon gesehen. Beim Test gezielt: Kanal anlegen (landet er in der DB?), alten lokalen Kanal
oeffnen (wird er uebernommen?), Kanal loeschen (verschwindet er wirklich, DB pruefen).

### D - Login. Behoben.

- `src/components/ui/Input.tsx`: der Container fokussiert jetzt selbst; ein rechtes Icon **ohne**
  eigene Aktion fokussiert ebenfalls und traegt kein `pressStyle` mehr. Letzteres war noetig,
  weil ein Tamagui-`XStack` mit `pressStyle` Beruehrungen auch bei `onPress={undefined}` abfaengt -
  die im Projekt bereits dokumentierte Falle. Ein rechtes Icon **mit** Aktion stoppt die
  Weitergabe und fokussiert nicht zusaetzlich.
- `app/(auth)/login.tsx` nutzt `Input.tsx` gar nicht, sondern rohe `TextInput`. Dort ist jetzt
  der gesamte `inputContainer` ein `Pressable`, nicht nur die Symbole.
- Fuer den Knopf ueber der Tastatur wurde das bestehende Mittel aus Commit `685fa537a`
  uebernommen (`profile/edit.tsx`, `profile/email.tsx`): Feld-`onLayout` + `scrollTo` beim Fokus,
  plus angehefteter Footer. Die `88` aus `edit.tsx` gehoeren zur Tab-Leiste und wurden bewusst
  **nicht** uebernommen; Login hat keine.

### B - Paketbilder. Behoben, und die Meldung war zu klein gefasst.

Die Annahme „die Datenquelle stimmt, nur die Auswahlliste greift daneben" war falsch. **Beide**
Bildschirme rieten:

- Schritt 4 nahm eine Konstante: `getPackageImage('berlin', 'essential')` fuer jede Karte -
  falsch in Stadt *und* Stufe. Der Fallback griff immer, weil `hero_image_url` in der Live-DB
  bei **allen neun** Paketen `null` ist.
- Die Bestaetigung zerlegte `packageId` als Slug `"<stadt>-<stufe>"`. DB-Pakete haben aber UUIDs,
  der Zweig griff **nie**, und der Fallback nahm still immer `classic`. Essential und Grand
  zeigten also seit jeher das Classic-Bild - unbemerkt, weil ein Classic-Bild plausibel aussieht.

Neu: `resolvePackageImage()` in `src/constants/packageImages.ts` als einzige Aufloesung fuer
beide Bildschirme. Reihenfolge: gesetztes `hero_image_url` → Stadt+Stufe aus den Paketfeldern
(`city_id` ueber `CITY_UUID_TO_SLUG`) → Slug-ID der Fallback-Pakete → benannter Endfallback.
Die Bestaetigung holt Stufe und Stadt ueber `usePackage(packageId)`; es wurden **keine** neuen
URL-Parameter durch die Buchungsstrecke gefaedelt. 4 neue Tests. Nebenbei entfernt: die zweite
Kopie von `CITY_UUID_TO_SLUG` in `packages.tsx`, jetzt Import aus `citySlugMap.ts`.

### F1 - „Vom Gast angepasst". Vollstaendig geloest, ueber `claimed_by`.

Der erste Anlauf konnte die E-Mail nicht benennen und begruendete das damit, es fehle eine
stabile Zuordnung Gast↔Einladung. **Das stimmte nicht.** `invite_codes.claimed_by` existiert und
ist in der Live-DB bei allen vier angenommenen Einladungen gefuellt - der Client las die Spalte
nur nirgends. Warum es niemandem auffiel: in den Testdaten hat noch nie jemand mit einer anderen
Adresse angenommen als der eingeladenen.

Die Zuordnung lief ueber die **E-Mail** (`invitesByEmail`, aufgebaut aus `guest_email`,
nachgeschlagen mit der *aktuellen* Adresse des Teilnehmers). Wer sich mit einer anderen Adresse
registrierte, verlor damit jeden Einladungsbezug - kein Namens-, kein Telefon- und
selbstverstaendlich kein E-Mail-Abgleich. Der Fall war nicht unbeschriftet, er war unsichtbar.

Jetzt: primaer `invite_codes.claimed_by === event_participants.user_id`, die E-Mail nur noch als
Rueckfall fuer Einladungen **ohne** `claimed_by` (offene und Altbestand). `resolveGuestDisplay`
vergleicht zusaetzlich die Einladungsadresse gegen die Kontoadresse, getrimmt und
case-insensitiv - noetig, weil in den Echtdaten `Test-go4@action.ms` gegen `test-go4@action.ms`
steht. Die „Vorher"-Zeile fuehrt jetzt alle drei Felder; der frueher dort stehende Ausschluss von
E-Mail war nicht sachlich begruendet, denn die aktuellen Werte stehen bei **allen** dreien darueber.

**Formulierung, mit Test festgehalten:** `joinList()` in `guestDataChange.ts` setzt „Name, E-Mail
und Telefon" statt „Name und E-Mail und Telefon". Ein blosses `join(' und ')` liest sich bei drei
Feldern in beiden Sprachen wie ein Fehler - und drei ist hier der Normalfall, weil ein Gast, der
seine Angaben korrigiert, meist alle korrigiert.

Im Datenbestand steckt uebrigens ein echter Fall: Code `5C2X5F6Y` wurde fuer „Svenja Schmidt"
eingeladen, das Konto heisst „Susanne Lauch".

### E - E-Mail aendern. Behoben.

Der rote Overlay war **kein** fehlender Toast. Die deutsche 6-Sekunden-Meldung wurde die ganze
Zeit korrekt erzeugt; sie lag nur unter der LogBox, die `console.error` im `catch` aufmacht
(`email.tsx:166`). Ersetzt durch `console.log` - die Diagnose bleibt im Protokoll, die LogBox
bleibt zu. Dieselbe Stelle lag in `profile/edit.tsx:210` und `profile/security.tsx:77` und wurde
mitgenommen; die uebrigen ~36 `console.error` im Projekt sind bewusst unangetastet.

Die tote Flaeche: der Knopf sass in einem am unteren Rand angehefteten Footer, das Formular ist
kurz. Er steht jetzt direkt unter dem Passwortfeld im Scrollfluss.
**Zielkonflikt, bewusst zugunsten der Owner-Vorgabe entschieden:** der geloeschte Kommentar in
`email.tsx:51` hielt fest, dass der Footer genau deshalb angeheftet war, weil der Knopf bei
offener Tastatur sonst unerreichbar war. Sichtbar bleibt er jetzt ueber `scrollPasswordIntoView`
plus `paddingBottom: 160` bei offener Tastatur. **Am Geraet gezielt nachpruefen.** Damit tragen
Login (angeheftet) und E-Mail-Aendern (im Fluss) jetzt zwei verschiedene Muster - das ist die
Folge zweier gegenlaeufiger Meldungen zum selben Bauteil und sollte einmal vereinheitlicht werden.

### G - Boot und Splash. Erledigt und abgeschlossen. Es war eine Dublette.

Die graue Zeile war eine gewoehnliche `<Text>`-Komponente (`BrandDomain` in `AnimatedLogo.tsx`),
kein natives Asset - **kein `prebuild` noetig.** `BrandDomain` ist entfernt, ebenso beide
Aufrufstellen (`app/_layout.tsx:201` Boot-Screen, `app/(auth)/intro.tsx:167` Aufbau); die
`color`-Prop von `BrandLockup` ist damit entfallen.

**Der eigentliche Befund: es stand zweimal da.** `assets/brand/logo.svg` - die Quelle fuer
`Logo`, fuer den Boot-Screen und fuer das Endbild des Aufbaus - traegt **selbst**
„Game-Over.app" als Schriftzug, und das ist der **einzige** Text darin. Eine separate Wortmarke
„Game Over" existiert im Vektor nicht. Der Boot-Screen zeigte die Domain also gold aus der
Grafik und direkt darunter nochmal grau aus `BrandDomain`, in abweichender Schreibweise.
Genau diese graue Dublette war die Meldung; sie ist weg, der Schriftzug der Grafik bleibt.

**`assets/splash.png` bleibt unveraendert, und das ist jetzt richtig so.** Es zeigt exakt
dieselbe Grafik. Nach der Aenderung sind Splash, Boot und Aufbau-Endbild deckungsgleich - die
Stufe, die Commit `685fa537a` beseitigen wollte, ist damit geschlossen, nicht aufgerissen.

**Owner-Entscheidung 03.08.: der Schriftzug bleibt „Game-Over.app".** Damit ist das Thema
abgeschlossen - an `logo.svg` und `assets/splash.png` ist **nichts** zu tun, und es braucht kein
`prebuild`. Zu entfernen war nur die graue Dublette darunter, und die ist raus.

Wer die Entscheidung spaeter doch aufmacht, muss zwei Folgen einkalkulieren:
1. Der Schriftzug ist der einzige Text der Marke. Ohne ihn traegt sie **nirgends** mehr einen
   Namen - weder auf dem Splash noch im Boot noch am Ende des Aufbaus.
2. Phase 4 des Vier-Sekunden-Aufbaus animiert genau ihn
   (`WORD_BAND = { top: 745, bottom: 872 }` in `logoGeometry.ts`, plus die Lichtwanderung
   darueber). Ohne ihn laeuft eine Sekunde Choreografie ins Leere.
Der Text liegt als 35 ausgezeichnete Pfade vor, kein `<text>`-Element - eine Aenderung ist
Vektorarbeit, keine Textersetzung.

**Der Screenshot „Downloading 86.10 %" ist nicht beeinflussbar.** Das ist der Ladebildschirm des
Expo-Dev-Clients; den Text kontrolliert Expo, und im Store-Build existiert der Bildschirm nicht.

### F2 - Betriebshinweis beim Organisator. Erledigt, ohne zweites Konto.

Der Mechanismus arbeitete wie entworfen; die Kollision war eine Personen-, keine Codefrage.
`ops_alert_recipients` enthielt genau eine Zeile - das Konto des Owners, das zugleich Organisator
ist. Der Client blendete Betriebsmeldungen nur aus, **solange** `is_ops_alert_recipient()` false
lieferte; fuer dieses Konto lieferte sie true.

Zwischenzeitlich war ein eigenes Betreiber-Konto beschlossen. Beim Umsetzen zeigte sich ein
Weg, der ohne auskommt und niemanden auf einen manuellen Schritt warten laesst:
**der Filter greift jetzt immer**, unabhaengig vom angemeldeten Konto, und nach dem **Praefix**
`ops_` statt nach der einzelnen Zeichenkette `ops_cron_health`. `includeOpsAlerts` und der
RPC-Aufruf im Client sind entfallen.

Die Zeilen werden weiterhin geschrieben - die Ueberwachung bleibt intakt, sie ist nur nicht mehr
in der Nutzeroberflaeche sichtbar. Wer nachsehen will, fragt sie ab:
`select * from notifications where type like 'ops_%' order by created_at desc;`
Wenn daraus spaeter eine sichtbare Betriebsansicht werden soll, ist das ein eigener Bildschirm
unter Profil, kein Umbau des Filters.

### Zweite Runde am 05.08. - Befunde aus dem Geraetetest

**Eine Meldungssprache statt drei.** Es gab drei visuelle Sprachen fuer dieselbe Sache: den Toast
(`ToastHost`), ein bildschirmbreites, unten angeklebtes `ConfirmSheet` mit 62%-Schleier, und eine
eigene Komponente `ValidationToast` mit eigenen Hexwerten und fest verdrahtetem Englisch.
Owner-Entscheidung: **der Toast ist die Vorlage.**

- `ConfirmSheet` ist jetzt dieselbe schwebende Karte - `surfaceBright`, haarfeiner Rand,
  `maxWidth: 420`, Icon links, Titel und Text rechts, darunter die beiden Aktionen (mindestens
  44 Punkt hoch). Der Ziehgriff ist weg, der Schleier faellt auf 24 %: genug, um Fehlgriffe zu
  verhindern und „daneben tippen = abbrechen" zu erhalten, ohne den Bildschirm zuzudecken.
- `ValidationToast` ist **geloescht**. Der Hinweis laeuft ueber das vorhandene Toast-System und
  erbt damit Aussehen und die 2/4/6-Sekunden-Staffel, statt sie zu kopieren.
- Gemeinsame Geometrie in `src/components/ui/floatingFeedbackLayout.ts`. Beide sitzen auf
  `Math.max(insets.bottom, 8)`. **Tiefer geht nicht** - darunter liegt der Home-Indicator, dort
  waere die Karte angeschnitten. Wer die Karte optisch weiter unten haben will, aendert ihre
  Hoehe, nicht ihre Position.

**Wer eine neue Meldung baut, nimmt `feedback` aus `src/stores/uiStore`.** Eine eigene Komponente
mit eigenen Farben ist genau der Zustand, aus dem dieser Abschnitt entstanden ist.

**Deutsch, wo Deutsch hingehoert.**
- Die Pflichtfeldnamen im Assistenten waren auf **allen drei** Schritten fest verdrahtetes
  Englisch („Please fill in: Date (05)" mitten in deutscher Oberflaeche). Jetzt aus dem
  i18n-System; die Nummerierung (01, H3, G6) bleibt, sie verweist auf die Formularabschnitte.
- „Payment Successful!" kam englisch **aus der Datenbank**, geschrieben vom `stripe-webhook`.
  Ohne Deploy geloest: jede `payment_success`-Zeile traegt eine `event_id`, das Event liefert den
  Titel, der Client baut den Text zur Anzeigezeit selbst - rueckwirkend auch fuer bestehende
  Zeilen. Muster ist `guest_data_changed`, kein zweites eingefuehrt.
  Der doppelte Genitiv „Hans Zimmer's Hans's Bachelor" verschwand dabei mit: der Eventtitel
  enthaelt den Namen bereits, der Ehrengast wurde zusaetzlich davorgesetzt.

**Zurueckgenommen: der Knopf im Scrollfluss.** Am 03.08. wurde der Aktionsknopf auf allen drei
Formularbildschirmen aus dem angehefteten Footer in den Scrollfluss gezogen, um bei kurzen
Formularen die tote Flaeche zu vermeiden. **Der Geraetetest hat das widerlegt:** im Fluss steht
der Knopf *unter* der Tastatur, der angeheftete Footer sass *darueber*. In „Profil bearbeiten"
war der Speichern-Knopf mit offener Tastatur nicht mehr erreichbar.
Es gilt wieder das Muster aus `685fa537a`: angehefteter Footer innerhalb der
`KeyboardAvoidingView`. Die tote Flaeche ist ein Schoenheitsfehler, ein unerreichbarer Knopf ist
keiner. Wer sie angehen will, tut das ueber die Feldabstaende, nicht ueber die Position des
Knopfes - und prueft es **am Geraet**, nicht am gruenen Typecheck.

### Dritte Runde am 06.08. - Bilder, Paketinhalte, Sprache

**Jedes Event zeigte das Berlin-Bild.** Ursache war Datenmuell in einer Spalte: beim Anlegen
schrieb `packages.tsx` die **Paket-ID** in `events.hero_image_url`. Bei DB-Paketen ist das eine
UUID; der Bildaufloeser hielt sie fuer einen Stadtwert und fiel auf Berlin zurueck. An der
Live-DB nachgezaehlt: **alle neun Events** tragen einen Nicht-URL-Wert, sieben UUIDs und zwei
Paket-Slugs wie `hamburg-classic`. Die Spalte hat nie eine URL enthalten.

Neu: `isImageUrl()` in `packageImages.ts` laesst nur `http://`, `https://` und `data:` als
Bildquelle gelten. Alles andere wird ignoriert, das Bild kommt aus `city_id` plus Stufe. Damit
sind die neun bestehenden Zeilen **ohne Datenbankaenderung** repariert, und die Paket-ID wandert
nicht mehr in die Spalte. Eine Aufraeumung der Altwerte per SQL ist moeglich, aber nicht noetig.

**Die Paketinhalte in Schritt 4 waren leer** - drei bis vier Aktivitaeten je Paket fehlten.
Die DB-Pakete tragen **keine** `features`; die Seed-Migration `20260729102334` befuellt das Feld
nicht, und DB-Pakete haben Vorrang vor den Fallback-Paketen, die welche haetten. Fehlt `features`,
kommen die Inhalte jetzt aus `assemblePackages`.
**Offen und Sache des Owners:** `packages.features` in der Datenbank ist inhaltlich leer. Was dort
stehen soll, ist eine Produktentscheidung, keine Programmieraufgabe - bis dahin traegt der
Rueckfall die Anzeige.

Dabei fiel auf, dass die zusammengestellten Namen **durchweg englisch** waren („Harbor Cruise",
„Bar Night with Drinks", „City Experience"). Der erste Anlauf haette damit eine leere Liste gegen
eine englische getauscht. Sie laufen jetzt ueber das i18n-System, ebenso die statischen Pakete in
`app/package/[id].tsx`.

**„4.5 (0 Bewertungen)" ist weg.** Eine Bewertung ohne Bewertungen ist eine Falschaussage; die
Zeile erscheint erst ab einer echten.

**Teilnehmerregler 3 bis 50** statt 1 bis 30 (Owner-Vorgabe 05.08.). Unter drei Koepfen gibt es
keine Feier - Organisator, Ehrengast und mindestens ein Gast; ein oder zwei war immer eine
Fehleingabe. Die Grenzen liegen in `src/constants/participantLimits.ts`, alte Entwuerfe unter 3
werden beim Laden angehoben.

**„Event bearbeiten" war komplett englisch**, samt Loeschbestaetigung. Jetzt durchgaengig i18n.

**Wiederkehrendes Muster, das Zeit kostet:** in dieser und den beiden vorigen Runden war
*jeder* zweite Befund derselbe - ein Text, der beim Schreiben oder im Code auf Englisch
festgelegt wurde und in einer deutschen Oberflaeche landet. Wer eine Zeichenkette anfasst, die
ein Nutzer lesen kann, legt sie in `src/i18n/` ab. Auch in Hilfsmodulen, auch in Fallback-Daten,
auch wenn sie „nur" ein Platzhalter ist.

### Anbieter-Matrix - eigener Auftrag, eigene Session (06.08.)

Die Kern-DNA der App ist **zur Haelfte gebaut**. Das Matching laeuft: `packages.tsx:295`
uebergibt alle zwoelf Fragebogen-Antworten an `assemblePackages()`, das `scoreActivities()` aus
`src/utils/packageMatching.ts` aufruft; die Spezifikation liegt in
`Activities_lists/ACTIVITY_MATCHING_MATRIX.md`.
**Nicht angeschlossen** sind die echten Anbieter: `packageMatching.ts` ist auf 441 Zeilen
vollstaendig stadt-unabhaengig und bewertet generische Aktivitaetstypen.

Die aktualisierte Anbieterliste liegt seit dem 06.08. im Repo:
`Activities_lists/JGA_Anbieter_Hannover_Hamburg_Berlin_v.3.xlsx` (176 Zeilen, geprueft 05.07.).
Die drei CSVs daneben sind vom 09.03. und damit ueberholt.

**Der vollstaendige Auftrag steht in `docs/PROVIDER_MATRIX_SPEC.md`** - Datenquelle, die vier
Owner-Anforderungen, fuenf offene Entscheidungen und die Fallen beim Einlesen. Wer daran
arbeitet, faengt dort an, nicht hier.

Ein Punkt daraus gehoert aber auch hierher, weil er leicht falsch gebaut wird:
**„Der Anbietername ist geheim bis zur vollstaendigen Zahlung" ist eine Zugriffsregel, keine
Anzeigeregel.** Wird der Name mitgeliefert und nur ausgeblendet, liest ihn jeder aus dem
Netzwerkverkehr. Das muss ueber RLS oder eine `SECURITY DEFINER`-Funktion laufen, gebunden an
`bookings.fully_paid_at`.

### Was sonst offen blieb

- **Geraetetest steht weiterhin aus.** `xcode-select` zeigt nicht auf Xcode; das braucht das
  Passwort des Owners: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
  Der gesamte Stand seit 30.07. ist am Geraet ungesehen, jetzt zusaetzlich der MMKV-Wechsel.
- **`budget/index.tsx:1462`** zieht die Kopfzahl fuer die Zahlungs-URL weiter aus dem
  AsyncStorage-Cache statt aus der Buchung; die `+1`-Semantik dort ist ungeklaert.
- **`.claude/*` und `game-over-app/deno.lock`** sind unversioniert. War schon vor dem 03.08. so,
  bewusst nicht mitcommittet - `security-patterns.yaml` und `claude-security-guidance.md` sind
  laut Change-Control bindende Vertraege und gehoeren eigentlich ins Repo. Eigene Entscheidung.
- **Worktrees haben kein `node_modules`.** Damit die Gates dort laufen, genuegt ein Symlink auf
  das Haupt-Checkout: `ln -s <haupt>/game-over-app/node_modules node_modules` im Worktree-App-
  Verzeichnis. `tsc`, `eslint` und `vitest` brauchen nur die Modulaufloesung. Fuer
  `expo run:ios` reicht das **nicht**.
- **Codex-Laeufe ueberschreiten das 10-Minuten-Limit der Shell.** Im Hintergrund starten
  (`nohup … &`) und auf die Report-Datei pollen, sonst killt SIGTERM den Lauf mitten im Test.
  Zwei *schreibende* Laeufe duerfen nie gleichzeitig auf demselben Worktree arbeiten; ein
  read-only-Lauf parallel dazu ist unbedenklich.

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

Der gesamte Stand seit dem 30.07. ist auf `main`, aber **am Gerät ungesehen**:
Toasts über der Tab-Leiste (6/4/2 s), ConfirmSheet statt nativer Dialoge, Rückerstattungs-Maske,
E-Mail-Fehlermeldungen auf Deutsch, Budget-Zahlen, Boot-Screen mit Wortmarke, Tastatur im Profil.

Vom 03.08. kommt hinzu:

- **Budget-Zahlen aus dem Buchungs-Kassenbuch.** Erwartung für Natalia: Gesamt 1.145 €,
  bezahlt 286,25 €, offen 858,75 €. Sven's Buchung ist vollständig bezahlt und darf **keinen**
  Restbetrag mehr fordern.
- **Buchungsbestätigung per Mail.** Sie ging vorher auf keinem Weg raus. Bei einer Demo-Buchung
  muss jetzt eine Mail ankommen, deutsch, mit Claim unter dem goldenen Knopf.
- **MMKV 4.3.2.** Der heikelste Punkt: Nitro Modules laufen nicht in Expo Go. `storage.ts` fängt
  das über `isExpoGo` und einen AsyncStorage-Rückfall ab, aber dieser Pfad ist mit der neuen
  Fassung ungetestet. **Gezielt prüfen:** überlebt die Supabase-Session einen App-Neustart, und
  bleibt ein Wizard-Entwurf erhalten? Beides läuft über MMKV.
- **Favicon mit Diamant** - nur im Web-Build sichtbar.

Vom 03.08. (Pakete B bis G) kommt hinzu - alles ungesehen:

- **Kanal loeschen** muss beim *ersten* Druck wirken, und das Bestaetigungs-Sheet muss sichtbar
  sein. Danach pruefen, ob der Kanal wirklich weg ist (er liegt in AsyncStorage, nicht in der DB).
- **Login:** ein Tap an jeder Stelle des Feldes, auch auf Briefumschlag und Schloss; Auge-Symbol
  schaltet weiterhin nur um. „Anmelden" bei offener Tastatur sichtbar.
- **Paketauswahl Schritt 4:** drei verschiedene Bilder, passend zur gewaehlten Stadt. Danach in
  der Bestaetigung dasselbe Bild - besonders bei Essential und Grand, die vorher beide das
  Classic-Bild zeigten.
- **E-Mail aendern:** vergebene Adresse → deutscher Toast, **kein** roter Overlay. Und der
  heikle Punkt: sitzt der Knopf bei offener Tastatur noch im sichtbaren Bereich, nachdem er aus
  dem angehefteten Footer in den Scrollfluss gewandert ist?
- **Boot und Intro** ohne graue Domainzeile - der native Splash traegt sie weiterhin im Bild.

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
