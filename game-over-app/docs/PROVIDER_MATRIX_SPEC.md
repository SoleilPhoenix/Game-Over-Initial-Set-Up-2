# Anbieter-Matrix: Auftrag und Ausgangslage

Übergabe vom 06.08.2026 an eine eigene Session.
Alles hier ist geprüft, nicht vermutet - wo etwas offen ist, steht es ausdrücklich dabei.

---

## Worum es geht

Die Kern-DNA der App: der Fragebogen des Assistenten führt die Antworten der Gruppe mit den
echten Anbietern der gewählten Stadt zusammen.
Die eine Hälfte davon läuft. Die andere ist nicht angeschlossen.

---

## Was bereits funktioniert

Die Matching-Matrix **existiert und ist verdrahtet**:

- `app/create-event/packages.tsx:295` übergibt alle zwölf Antworten
  (H1-H6 Ehrengast, G1-G6 Gruppe) plus Stadt-Slug an `assemblePackages()`.
- `src/utils/packageAssembly.ts:204` ruft `scoreActivities()` auf.
- `src/utils/packageMatching.ts` bewertet 53 Aktivitäten gegen die zwölf Antworten,
  inklusive Ice-Breaker-Bonus, H3×G5-Konfliktausgleich und Saisonabschlag für Outdoor.
- Die Spezifikation dazu: `Activities_lists/ACTIVITY_MATCHING_MATRIX.md` (53 KB).

Die Fragebogen-Seite ist also gebaut und muss nicht neu erfunden werden.

## Was fehlt

`src/utils/packageMatching.ts` ist auf 441 Zeilen **vollständig stadt-unabhängig** -
null Vorkommen von `berlin`, `hamburg`, `hannover` oder `city`.
Es bewertet generische Aktivitäts**typen** („Laser Tag", „Hafenrundfahrt"), nicht die
tatsächlichen Anbieter.

Die Anbieterdaten liegen ungenutzt im Repo. **Kein Code liest sie.**

---

## Die Datenquelle

**Maßgeblich ist die Excel** (Stand 05.07.2026, am 06.08. ins Repo gelegt):
`Activities_lists/JGA_Anbieter_Hannover_Hamburg_Berlin_v.3.xlsx`

| Blatt | Datenzeilen |
|---|---|
| Hannover | 60 |
| Hamburg | 58 |
| Berlin | 58 |

Spalten: `Kategorie`, `Aktivität`, `Anbietername`, `Original_Rating`, `Rating_Link`,
`Website`, `Notizen`, `Verify_Status`, `Ablehnungsgrund`, `Echtes_Rating`, `Quelle`,
`Geprüft_am`.

Kategorien: Action & Rätsel, Creative, Dining, Entertainment, Mobility, Nightlife,
Outdoor, Tasting, Wellness.

**Zwei Fallen beim Einlesen:**
1. Jedes Blatt endet mit einem Abschnitt **„Abgelehnte Anbieter (zur Referenz)"**.
   Diese Zeilen dürfen nicht in die App. `Verify_Status` unterscheidet sie (`passed`).
2. `Original_Rating` und `Echtes_Rating` weichen voneinander ab
   (z.B. 4.5 gegen 4.5999999999999996). Welches der beiden maßgeblich ist, muss der Owner
   festlegen - `Echtes_Rating` sieht nach der geprüften Zahl aus.

**Veraltet, aber noch vorhanden** (Stand 09.03.2026, von der Excel abgelöst):
die drei CSVs unter `Activities_lists/<Stadt>/`. Uneinheitliche Trennzeichen -
Berlin Semikolon, Hamburg und Hannover Komma. Vor dem Wegwerfen prüfen, ob sie Felder
enthalten, die die Excel nicht hat (die CSVs führen Adresse, Telefon und Maps-URL).

---

## Anforderungen des Owners (06.08.2026)

### 1. Anbietername ist Geschäftsgeheimnis bis zur vollständigen Zahlung

Vor der Zahlung sieht der Kunde **nur die Aktivität** („Escape Room", „Hafenrundfahrt"),
nicht den Anbieter. Sonst kann er den Anbieter selbst kontaktieren, direkt buchen und das
Event stornieren.
Sobald **vollständig bezahlt** ist, werden die Anbieternamen freigegeben.

**Das ist eine Zugriffsregel, keine Anzeigeregel.** Wenn der Name in der Serverantwort steht
und die App ihn nur ausblendet, liest ihn jeder aus dem Netzwerkverkehr - der Anon-Key ist
öffentlich, RLS ist die Sicherheitsgrenze (siehe `.claude/claude-security-guidance.md`).
Umsetzung deshalb serverseitig:
- eine RLS-Policy, die die Anbieterspalten erst bei vollständig bezahlter Buchung freigibt,
  **oder**
- eine `SECURITY DEFINER`-Funktion, die vor der Zahlung nur Kategorie und Aktivität liefert.

Maßgeblich für „vollständig bezahlt" ist `bookings.fully_paid_at` - dieselbe Spalte, an der
sich schon die Budget-Anzeige orientiert (siehe HANDOFF, Paket A1).

### 2. Paketbewertung aus den Anbietern ableiten

Ein Paket besteht aus drei bis vier Anbietern. Seine Bewertung soll aus deren Bewertungen
entstehen, statt erfunden zu werden.

Der Owner hatte zunächst erfundene Werte gewünscht (4,8 bis 5,0 bei 15 bis 20 Bewertungen).
**Davon wurde abgeraten und der Owner ist mitgegangen:** die Excel enthält echte, verifizierte
Google-Bewertungen samt Anzahl. Erfundene Bewertungen sind rechtlich heikel, echte nicht.

Zu klären: schlichter Mittelwert oder nach Bewertungsanzahl gewichtet, und was angezeigt wird,
solange der Anbieter noch geheim ist (die Note darf gezeigt werden, sie verrät den Anbieter nicht).

Heutiger Stand: `rating` und `review_count` sind in `app/package/[id].tsx:38-48` von Hand
gesetzt. Seit dem 06.08. wird eine Bewertung mit null Bewertungen gar nicht mehr angezeigt.
Bewertungsgeber-**Namen** gibt es im Code bisher überhaupt nicht, nur Note und Anzahl.

### 3. Eignungsregel nach Geschlecht

Manche Aktivitäten passen nicht zu jeder Runde. Owner-Beispiele: ein Gin-Tasting ist eher
nichts für eine Frauenrunde, Kranzbinden eher nichts für eine Männerrunde.

Die Information liegt bereits vor: `events.party_type` unterscheidet Bachelor und Bachelorette.
Die Matrix in `packageMatching.ts` kennt diese Dimension noch nicht - sie hätte als weitere
Punktespalte dieselbe Form wie H1-H6 und G1-G6.

**Vorsicht bei der Formulierung.** „Für Frauen nichts" als harte Sperre schließt Runden aus,
die es anders wollen. Eine Gewichtung (-1 statt Ausschluss) trifft dasselbe, ohne jemandem
etwas zu verbieten - und die Matrix arbeitet ohnehin mit Punkten, nicht mit Verboten.
Das ist eine Owner-Entscheidung, keine technische.

### 4. Angezeigt wird zunächst nur die Aktivität

Im ersten Schritt erscheinen ausschließlich die Aktivitäten - und zwar die, die laut Matrix am
besten passen. Der Anbieter kommt erst nach Punkt 1 dazu.

---

## Offene Entscheidungen, bevor Code entsteht

1. Wandern die Anbieter in die Datenbank (Tabelle plus Migration) oder bleiben sie als Datei
   im Bundle? Für die Datenbank spricht die Zugriffsregel aus Punkt 1 - eine Datei im Bundle
   ist nicht geheim zu halten.
2. Wie sieht die Zuordnung Aktivitäts**typ** (Matrix) zu Anbieter (Excel) aus? Die Spalte
   `Aktivität` der Excel und die 53 Namen in `packageMatching.ts` müssen aufeinander abgebildet
   werden - das ist der eigentliche Klebstoff.
3. `Original_Rating` oder `Echtes_Rating`?
4. Geschlechtsregel als Gewichtung oder als Ausschluss?
5. Was passiert mit `packages.features` in der Datenbank? Heute leer; seit dem 06.08. fängt der
   Client das mit einem Rückfall auf `assemblePackages` ab. Sobald echte Anbieter da sind,
   sollte der Rückfall verschwinden.

---

## Rahmenbedingungen

- Migrationen sind **owner-freigabepflichtig**; ein Merge nach `main` pusht sie live.
  Siehe Skill `gameover-change-control`.
- Jede vom Nutzer lesbare Zeichenkette gehört nach `src/i18n/` - EN zuerst, dann DE.
  In drei Runden Gerätetest war jeder zweite Befund ein vergessener englischer Text.
  Skill: `gameover-i18n`.
- Delegation an Codex `gpt-5.6-sol`, nicht an die kleineren Modelle (Owner-Vorgabe 06.08.).
- Gates: `npm run typecheck`, `npm run lint`, `npx vitest run` - alle grün, bevor etwas gemeldet wird.
