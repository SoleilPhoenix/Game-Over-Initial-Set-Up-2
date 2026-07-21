# Handoff - Game Over App

Kurzer Übergabestand, damit eine neue Session (z. B. von der iPhone-Claude-Code-App) nahtlos anknüpfen kann.
Letzte Aktualisierung: 2026-07-21.

## Aktueller Stand (2026-07-21) - Start-Journey steht, wartet auf Gerätetest

Die Start-Journey ist vollständig gebaut:

1. App startet, Launch-Intro läuft (Logo-Aufbau, danach das Video).
2. Danach der Welcome-Screen: Logo, Claim, **ein** Button "Party planen".
3. Erst danach die Anmeldung.

Punkt 8 Schritt 3 ist damit abgeschlossen.
Der User testet gerade am Gerät.

## HIER weitermachen

Zwei Dinge stehen an, beide hängen am User:

**1. Rückmeldung aus dem Gerätetest abwarten.**
Siehe Abschnitt "Ungetestet" weiter unten, dort steht was konkret unklar ist.

**2. Die mp4 einhängen, sobald sie da ist.**
Datei nach `assets/brand/intro.mp4` legen, dann in `src/components/brand/introVideo.ts`
das `null` durch das `require` ersetzen, das dort als Kommentar steht.
Das ist eine Zeile, sonst ändert sich nichts.

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

### Einladungscode auf beiden Screens

Neu: `src/components/auth/InviteCodeEntry.tsx`, herausgezogen statt dupliziert.

Wer die Zeile auf dem Welcome übersieht, steht sonst auf dem Continue-Screen
vor drei Anmeldeknöpfen, die er als Gast gar nicht braucht.

testIDs bleiben über `testIDPrefix` getrennt: `invite-code-*` auf dem Welcome,
`continue-invite-code-*` auf dem Continue.

### Layout und Text nach dem Gerätetest des Users

- Logo auf dem Welcome **zentriert**.
  `AnimatedLogo` ist eine Box fester Größe; ohne zentrierendes Elternelement klebte sie am linken Rand.
- Logo-Größe Welcome 150 auf 190, Continue 104 auf 150.
- "Bereits ein Konto? Anmelden" und die Code-Zeile von 14 auf 16 bzw. 15,5 pt.
- Continue-Titel heißt nicht mehr "Lass uns deine Party planen".
  Das versprach dasselbe wie der Knopf, den man gerade gedrückt hat.
  Jetzt "Noch ein Schritt" / "Dann geht es an die Planung."

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

- **Ob `expo-video` in Expo Go überhaupt läuft.**
  Das ist ein Native-Modul.
  Läuft es dort nicht, braucht das Intro einen Dev-Build, oder Phase 2 muss in Expo Go ausfallen.
  Fällt beim ersten Start sofort auf.
  Aktuell nicht dringend, solange `INTRO_VIDEO_SOURCE` auf `null` steht: dann wird gar kein Player gebaut.
- Ob OAuth nach dem Umzug in `useSocialAuth` noch durchläuft.
  Bleibt das größte Risiko, Apple lässt sich nur mit echtem Konto prüfen.
  Die Social-Buttons wurden gerade neu gebaut, die `onPress`-Verdrahtung blieb aber unverändert.
- Ob Logo-Größe 190 neben dem Claim stimmig wirkt.
- Ob das Intro sich in der Länge richtig anfühlt, sobald das Video drin ist.
- Ob nach der Umstellung von 53 Dateien irgendwo ein Icon fehlt.

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
