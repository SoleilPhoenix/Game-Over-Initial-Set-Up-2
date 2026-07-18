# Handoff — Game Over App

Kurzer Übergabestand, damit eine neue Session (z. B. von der iPhone-Claude-Code-App) nahtlos anknüpfen kann.
Letzte Aktualisierung: 2026-07-18.

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

## Bekannte Umgebungs-Hinweise

Supabase-Projekt `stdbvehmjpmqbjyiodqg` pausiert automatisch auf INACTIVE — vor Edge-Function-Deploy/Test erst `restore_project` (MCP) oder im Dashboard reaktivieren.
Das lokale Auto-Memory unter `~/.claude/projects/.../memory/` reist **nicht** über git mit; nur committete Dateien (wie diese) sind auf anderen Geräten sichtbar.
