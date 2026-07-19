# Handoff — Game Over App

Kurzer Übergabestand, damit eine neue Session (z. B. von der iPhone-Claude-Code-App) nahtlos anknüpfen kann.
Letzte Aktualisierung: 2026-07-19.

## Aktueller Stand (2026-07-19) — Gäste-Flow, Zahlungserinnerung, Welcome-Redesign

Arbeitsstrom aus dem Live-Test vom 18.07. (10-Punkte-Backlog). Alles unten ist auf `main` gepusht (dein iPhone zieht `main`).
Neueste Session-Details liegen im lokalen Auto-Memory `guest-flow-backlog.md` (reist nicht über git mit).

Fertig + live auf main:
- Bug A: Foto-Upload repariert (base64/decode statt RN-kaputtem fetch().blob()) — `game-over-app/app/invite/[code].tsx`.
- Bug B: reine Gäste landen auf dem „Attending"-Tab; eigentlicher Blocker war Bug A — `game-over-app/app/(tabs)/events/index.tsx`.
- Bug C: `send-guest-invitations` verwendet den bestehenden Invite-Code wieder (kein neuer pro Erinnerung). DEPLOYED.
- Punkt 4: neue Edge Function `send-payment-reminders` + Budget „Alle erinnern" = echte Zahlungserinnerung (A/B-Ton, DE/EN), nur angemeldete Gäste mit offenem Betrag (ohne Ehrengast). DEPLOYED + live.
- Punkt 5+6: Einladungs-Mail/WhatsApp/Betreff zweisprachig (`supabase/functions/_shared/email-templates.ts` mit language+partyType); Genitiv „von {Name}" statt „Sally Joness"; Support-Link Gold. DEPLOYED.
- Punkt 7: Code-Eingabefeld im Welcome nicht mehr von Tastatur verdeckt.

Offen / als Nächstes (HIER weitermachen):
- Punkt 8 (Welcome + Logo + Intro): Schritt 1 FERTIG (Welcome Konzept 3, Navy, Bold-Claim, echtes Vektor-Logo in Designsystem-Farben; `game-over-app/assets/brand/logo.svg`, `src/components/brand/Logo.tsx`+`logoSvg.ts`). NÄCHSTES: **Schritt 2 = Logo-Reveal-Animation** (Strich zeichnet sich → Cross-Fade in scharfen Vektor → Wortmarke + Glow; react-native-reanimated ist da). Schritt 3 = Launch-Intro: User liefert 10-15s-mp4 → expo-av-Player (Symbol-Stamp → Video → Logo-Aufbau + Claim → Anmelden), danach animiertes Logo-Reveal als Extra-Asset.
- Punkt 10: entschieden (invite_codes-PII 30 Tage nach Event anonymisieren; Konten bleiben bis Selbst-Löschung). Migration/pg_cron-Job VORBEREITET, aber NOCH NICHT ANGEWENDET — auf User-OK warten.
- Punkt 9: User hat Supabase „Confirm email" AUS geschaltet — beim nächsten Signup prüfen (email_confirmed_at sofort gesetzt).
- Offener Chip: veraltete Phantom-E2E-Tests in `game-over-app/e2e/invites/inviteSystem.test.ts` neu schreiben/entfernen.

Neue Session startet also bei: **Punkt 8 Schritt 2 (Logo-Animation)**, dann Punkt 10 anwenden (nach OK), dann Device-Re-Test verifizieren.

## Arbeitsweise (wichtig)

Direkt auf `main` arbeiten und committen/pushen — in dieser Phase wird bewusst **kein** separater Worktree/Branch aufgemacht.
Vor jedem Merge/Rebase zuerst `git -C <repo> status` prüfen: die Haupt-Working-Copy trägt regelmäßig 30–40 uncommittete Dateien.
Nach jeder inhaltlich abgeschlossenen Gruppe: `npx tsc --noEmit --skipLibCheck` (aus `game-over-app/`) muss 0 Fehler zeigen, dann committen + pushen.
App-Code liegt unter `game-over-app/`.

## Was in der letzten Session gemacht wurde

Alles ist auf `main` gepusht. Commit-Reihenfolge (neueste zuerst):

- `e3e3b71b8` — i18n: "Ehrengast"/"Bräutigam/Braut" → **Bachelor/Bachelorette**-Wording, kontextabhängig über `partyType`.
  Betroffen: Wizard Schritt 1 (Name-Label), Wizard Schritt 2 Titel (`groomPreferences`/`bridePreferences`), Buchungs-Zusammenfassung ("… ausschließen"/"… zahlt").
- `5f84aa1df` — i18n: **Paket-Screen** komplett übersetzt (Aktivitäten/Dining/Nightlife-Namen, Tier-/Stadt-Beschreibungen, Feature-Subtitles, Demo-Bewertungen bilingual, Buttons "Weiter zur Buchung"/"Ausgewählt").
  Neues Modul: `src/i18n/packageContent.ts` (EN→DE Lookup, unbekannte Strings fallen unverändert durch).
- `231b83c56` — ShareModal: **`LSApplicationQueriesSchemes`** in `app.config.ts` ergänzt → Instagram/TikTok/Snapchat/X öffnen die App statt Safari (das war der eigentliche Bug).
  Zusätzlich: dezenter Inline-Toast statt OS-Alert; Monatsname in Zahlungsübersicht ausgeschrieben.
- `08b21e974` — Budget/Events/FAQ/Terms: 3-stufige Rückerstattungs-Policy, klarere Affordances.
- `cb2cf344c` — Chat+Budget Event-Dropdown gekoppelt (`src/stores/activeEventStore.ts`); "100% bezahlt"-Pill mit grünem Haken; ShareModal-Kacheln sofort tapbar (Action-Queue).
- `68dc6fcc5` — Budget: "Restbetrag"-Karte + "Restbetrag bezahlen" zu einer tapbaren Karte zusammengeführt; Notification-Labels; FAQ präzisiert.
- `b647bd5cf` — Events-Liste: volle Monatsnamen, Orange-Tint bei Dringlichkeit, kompakte "Schritt N/8"-Zeile, Drafts-Sektion umbenannt/umsortiert; schnellere Polls & Share-Links.

## Bewusst offen gelassen (Kandidaten für die nächste Session)

Restliche **"Ehrengast"-Strings** in Benachrichtigungen und der Planungs-Checkliste wurden **nicht** auf Bachelor/Bachelorette umgestellt.
Betroffen u. a.: `honoreeAutoNotified`, `honoreeNotificationBody`, `honoreePrivacyNote`, `planSurpriseDesc`, `honoree` ("EHRENGAST").
Grund: das sind generische Templates ohne direkten `partyType`-Zugriff am Render-Ort; eine saubere Umstellung braucht Threading von `partyType` in diese Screens.
Die passenden Bachelor/-ette-i18n-Varianten für `planSurpriseDesc` liegen bereits in `src/i18n/en.ts` und `de.ts` bereit (aktuell ungenutzt), falls gewünscht.

## Nützliche Orientierung im Code

- i18n: `src/i18n/en.ts` (Quelle) + `src/i18n/de.ts` (Spiegel), `useTranslation()` → `t.section.key`, `getTranslation()`/`getCurrentLanguage()` für Nicht-React-Kontexte.
- Paket-Inhalte übersetzen: `src/i18n/packageContent.ts` (`translateFeature`, `translateFeatureSub`, `translatePackageDescription`).
- Geteilter Event-Zustand (Chat/Budget): `src/stores/activeEventStore.ts`.
- Party-Typ: `partyType: 'bachelor' | 'bachelorette'` im Wizard-Store (`src/stores/wizardStore.ts`); bei bestehenden Events `event.party_type`.
- ShareModal: `src/components/ui/ShareModal.tsx`; iOS-App-Schemas in `app.config.ts` (`LSApplicationQueriesSchemes`).

## Test-Loop: Änderungen live aufs iPhone

Der Mac dient als Metro-Host; die iPhone-Claude-App (Cloud) pusht nach GitHub `main`, der Mac zieht automatisch nach.

Auf dem Mac (in einem eigenen Terminal, offen lassen):

```bash
cd ~/Desktop/GameOver
./scripts/mac-preview.sh
```

Das bündelt drei Dinge und räumt beim Beenden (Ctrl-C) alles auf:
- `caffeinate` hält den Mac wach (nur am Netzteil zuverlässig; auf Akku greift `-s` nicht).
- `scripts/mac-autopull.sh` pollt `main` alle 15 s und macht `git pull --ff-only` (nie `reset`/`clean`/`stash`, verwirft also nie lokale Arbeit).
- `expo start --tunnel` startet Metro im Tunnel-Modus und zeigt QR + `exp://…ngrok-free.dev`.

Auf dem iPhone: **Expo Go** öffnen, QR scannen (oder die `exp://`-URL eingeben).
Ablauf: iPhone-Claude editiert → Push → Mac-Auto-Pull → Metro **Fast Refresh**; falls nötig iPhone **schütteln → „Reload"**.

Grenzen des Loops:
- Nur **JS/TS/i18n** hot-reloaden. **Native-/Config-Änderungen** (z. B. `app.config.ts`, `LSApplicationQueriesSchemes`) brauchen einen echten **Dev-Build** (`eas build` / `expo run:ios`) — geht nicht per Fast Refresh.
- **Free-ngrok erlaubt nur EINEN Tunnel gleichzeitig**: läuft parallel noch ein Metro/Tunnel (z. B. aus einer anderen Session), scheitert der zweite mit `ERR_NGROK_334`. Dann den alten Metro stoppen und neu starten.
- Die Free-ngrok-URL kann sich beim Neustart ändern — dann neuen QR/URL nutzen.
- Voraussetzung: `@expo/ngrok` ist installiert (einmalig global via `npm install -g @expo/ngrok@^4.1.0`).

## Bekannte Umgebungs-Hinweise

Supabase-Projekt `stdbvehmjpmqbjyiodqg` pausiert automatisch auf INACTIVE — vor Edge-Function-Deploy/Test erst `restore_project` (MCP) oder im Dashboard reaktivieren.
Das lokale Auto-Memory unter `~/.claude/projects/.../memory/` reist **nicht** über git mit; nur committete Dateien (wie diese) sind auf anderen Geräten sichtbar.
