# iOS Simulator Testing — Game Over App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5 Organizer-Use-Cases + 5 Guest-Use-Cases + Edge Cases auf iPhone 16 Pro Simulator testen und alle iOS-spezifischen Bugs dokumentieren.

**Architecture:** iOS Simulator Skill (21 Scripts) + accessibility-tree-basierte Navigation (kein Screenshot-Overhead) + Agent-gestützte Analyse (Evidence Collector, Test Results Analyzer, Accessibility Auditor). Jeder Schritt protokolliert Pass/Fail mit konkreter Begründung.

**Tech Stack:** `ios-simulator-skill` v1.3.0, `xcrun simctl`, Python 3.14, iPhone 16 Pro (UDID: `2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4`), Bundle ID: `app.gameover.ios`

**Skill Base Path:** `~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/`

---

## Wichtige Vorab-Information

### Warum Rebuild nötig ist
Der bestehende Build stammt vom **30. Jan 2026** — 2 Monate alt. Folgende Dateien wurden seitdem modifiziert und sind **nicht** im alten Build enthalten:

| Datei | Relevanz für Tests |
|---|---|
| `app/(tabs)/budget/index.tsx` | UC-O3, UC-O5, UC-G5 |
| `app/(tabs)/chat/[channelId].tsx` | UC-G4 |
| `app/event/[id]/communication.tsx` | UC-O4, UC-G4 |
| `app/event/[id]/participants.tsx` | UC-O2 |
| `src/components/chat/MessageBubble.tsx` | UC-G4 |
| `src/components/polls/PollCard.tsx` | UC-O4, UC-G4 |
| `src/lib/participantCountCache.ts` | UC-O1, UC-O3 |
| `metro.config.js` | Build-Konfiguration |

→ **Ohne Rebuild testet man veralteten Code.** Phase 0 muss abgeschlossen sein, bevor Phase 1 startet.

### Agenten-Einsatz
| Agent | Wann einsetzen |
|---|---|
| **Evidence Collector** | Nach jedem Use Case: visuelle Beweise sichern, keine Fantasy-Approvals |
| **Test Results Analyzer** | Nach Phase 1+2: Ergebnisse auswerten, Muster erkennen |
| **Accessibility Auditor** | Phase 3: Jeden Screen auf WCAG prüfen |
| **Code Reviewer** | Bei gefundenen Bugs: Root-Cause-Analyse im Code |

---

## Phase 0: Environment Setup & Fresh Build

### Task 0.1: System Health Check

**Files:**
- Run: `~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/sim_health_check.sh`

- [ ] **Step 1: Health Check ausführen**

```bash
bash ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/sim_health_check.sh
```

Expected Output: `✓ xcrun available`, `✓ Python 3.x`, `✓ simctl works`
Fail-Kriterium: Fehlende Dependencies → vor Weiterfahren lösen.

- [ ] **Step 2: Python-Abhängigkeiten prüfen**

```bash
python3 -c "import subprocess, json, pathlib; print('deps OK')"
```

Expected: `deps OK`

---

### Task 0.2: Fresh iOS Build erstellen

**Files:**
- Project: `/Users/soleilphoenix/Desktop/GameOver/game-over-app/ios/GameOver.xcworkspace`
- Output: `~/Library/Developer/Xcode/DerivedData/GameOver-.../Build/Products/Debug-iphonesimulator/GameOver.app`

- [ ] **Step 1: In App-Verzeichnis wechseln + Pods sicherstellen**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app && pod install --project-directory=ios
```

Expected: `Pod installation complete!` (oder "already up to date")

- [ ] **Step 2: Expo Native Build für Simulator starten**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
npx expo run:ios --device "iPhone 16 Pro" --no-install 2>&1 | tee /tmp/expo-build.log
```

Timeout: 10 Minuten. Expected: `Build Succeeded` in den letzten Zeilen.
Bei Fehler: `cat /tmp/expo-build.log | grep -E "(error:|ERROR)" | head -20`

- [ ] **Step 3: Build-Datum verifizieren**

```bash
stat ~/Library/Developer/Xcode/DerivedData/GameOver-*/Build/Products/Debug-iphonesimulator/GameOver.app | grep Modify
```

Expected: Datum von heute (2026-03-29).

---

### Task 0.3: Simulator booten & App installieren

**Files:**
- Script: `simctl_boot.py`, `app_launcher.py`

- [ ] **Step 1: iPhone 16 Pro Simulator booten**

```bash
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/simctl_boot.py \
  --udid 2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4
```

Expected: `Simulator booted successfully` oder `already booted`

- [ ] **Step 2: 10 Sekunden warten bis Simulator bereit**

```bash
sleep 10 && xcrun simctl list devices | grep "2AA40A03" | grep -c "Booted"
```

Expected: `1`

- [ ] **Step 3: App installieren**

```bash
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/GameOver-*/Build/Products/Debug-iphonesimulator -name "GameOver.app" -type d | head -1)
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/app_launcher.py \
  --install "$APP_PATH" \
  --udid 2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4
```

Expected: `App installed successfully`

- [ ] **Step 4: App starten**

```bash
python3 ~/.claire/skills/ios-simulator-skill/ios-simulator-skill/scripts/app_launcher.py \
  --launch app.gameover.ios \
  --udid 2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4
```

Expected: `App launched: app.gameover.ios`

- [ ] **Step 5: Welcome Screen verifizieren**

```bash
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/screen_mapper.py \
  --udid 2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4
```

Expected: Buttons `Log In` und `Sign Up` sichtbar. Falls Auth-Tab sichtbar → App startet eingeloggt (vorherige Session löschen mit `simctl_erase.py`).

---

### Task 0.4: Test-Benutzer einloggen

- [ ] **Step 1: Auf Login-Screen tippen**

```bash
UDID=2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/navigator.py \
  --find-text "Log In" --tap --udid $UDID
```

- [ ] **Step 2: Organizer-Credentials eingeben**

```bash
# E-Mail
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/navigator.py \
  --find-type TextField --enter-text "organizer@test.gameover.app" --udid $UDID

# Passwort (zweites TextField)
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/navigator.py \
  --find-type SecureTextField --enter-text "TestPass123!" --udid $UDID
```

- [ ] **Step 3: Login absenden**

```bash
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/navigator.py \
  --find-text "Log In" --tap --index 1 --udid $UDID
# ODER Submit-Button:
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/keyboard.py \
  --key return --udid $UDID
```

- [ ] **Step 4: Events-Tab bestätigen**

```bash
python3 ~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts/screen_mapper.py --udid $UDID
```

Expected: Tab-Bar mit `Events`, `Chat`, `Budget`, `Profile` sichtbar.

> **ACHTUNG:** Falls kein Test-User existiert → Neuen Account in Supabase anlegen oder `Sign Up` Flow verwenden. Notiere Credentials in `/tmp/test-credentials.txt` für Guest-Tests.

---

## Phase 1: Organizer Use Cases

**Vor jedem UC:** `screen_mapper.py` ausführen zur Orientierung.
**Nach jedem UC:** Evidence Collector Agent mit Screenshot-Beweis aufrufen.

---

### Task 1.1: UC-O1 — Event erstellen & Paket buchen

**Erwartetes Ergebnis:** Event erscheint mit Status "booked" im Events-Tab, Buchungsreferenz `GO-XXXXXX` sichtbar.

```bash
UDID=2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4
SCRIPTS=~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts
```

- [ ] **Step 1: Events-Tab öffnen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Events" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

Expected: FAB "+" Button sichtbar.

- [ ] **Step 2: Neues Event starten (FAB "+" tippen)**

```bash
python3 $SCRIPTS/navigator.py --find-text "+" --tap --udid $UDID
sleep 0.5
# Alternativ via accessibility ID:
python3 $SCRIPTS/navigator.py --find-id "create-event-fab" --tap --udid $UDID
```

Expected: Wizard Step 1 erscheint (Stadt-Auswahl).

- [ ] **Step 3: Stadt Hamburg auswählen (Wizard Step 1)**

```bash
python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Hamburg" --tap --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Next" --tap --udid $UDID
```

Expected: Wizard Step 2 (Datum + Teilnehmer).

- [ ] **Step 4: Datum setzen + 4 Teilnehmer (Wizard Step 2)**

```bash
python3 $SCRIPTS/screen_mapper.py --udid $UDID
# Datum: DatePicker scrollen oder tippen
python3 $SCRIPTS/navigator.py --find-type "DatePicker" --tap --udid $UDID
# Datum 14 Tage in Zukunft setzen (für UC-O5 Urgency-Test)
# Teilnehmer-Slider auf 4
python3 $SCRIPTS/navigator.py --find-type "Slider" --tap --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Next" --tap --udid $UDID
```

Expected: Wizard Step 3 (Honoree + Gruppen-Profil).

- [ ] **Step 5: Honoree-Details + Gruppen-Profil (Wizard Step 3)**

```bash
python3 $SCRIPTS/screen_mapper.py --udid $UDID
# Honoree Name eingeben
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Alex" --index 0 --udid $UDID
# Energie-Level auswählen
python3 $SCRIPTS/navigator.py --find-text "High Energy" --tap --udid $UDID
# Altersgruppe
python3 $SCRIPTS/navigator.py --find-text "25-35" --tap --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Next" --tap --udid $UDID
```

Expected: Wizard Step 4 (Paket-Auswahl).

- [ ] **Step 6: Paket auswählen (Wizard Step 4)**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
# Erstes empfohlenes Paket auswählen
python3 $SCRIPTS/navigator.py --find-text "Select" --tap --index 0 --udid $UDID
```

Expected: Booking Summary Screen mit Gesamtpreis.

- [ ] **Step 7: Gesamtpreis prüfen (Booking Summary)**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

Prüfen: Preis = `participants × price_per_person_cents / 100` (z.B. 4 × €149 = €596). Deposit = 25% (€149).

- [ ] **Step 8: Weiter zur Zahlung**

```bash
python3 $SCRIPTS/navigator.py --find-text "Proceed to Payment" --tap --udid $UDID
# ODER:
python3 $SCRIPTS/navigator.py --find-text "Book Now" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

Expected: Payment Screen mit Deposit-Betrag.

- [ ] **Step 9: Demo-Zahlung bestätigen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Pay" --tap --udid $UDID
# Demo-Alert erscheint → bestätigen
sleep 1
python3 $SCRIPTS/navigator.py --find-text "Confirm" --tap --udid $UDID
# ODER "OK":
python3 $SCRIPTS/navigator.py --find-text "OK" --tap --udid $UDID
```

Expected: Confirmation Screen.

- [ ] **Step 10: Buchungsreferenz prüfen**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

**Pass-Kriterium:** Text `GO-` sichtbar im Screen (Buchungsreferenz `GO-XXXXXX`).

- [ ] **Step 11: Zum Events-Tab → Event-Status prüfen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Go Home" --tap --udid $UDID
sleep 1
python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Event-Card mit Status-Badge `booked` sichtbar.

- [ ] **Step 12: UC-O1 Ergebnis protokollieren**

In `/tmp/test-results.md` notieren:
```
## UC-O1: Event erstellen & Paket buchen
Status: PASS / FAIL
GO-Referenz: [XXXXXX]
EventId: [für weitere Tests notieren]
Gefundene Bugs: [Liste]
```

---

### Task 1.2: UC-O2 — Gäste einladen & verwalten

**Voraussetzung:** UC-O1 erfolgreich, Event-ID bekannt.

**Erwartetes Ergebnis:** Counter zeigt "Pending: 2" nach Einladungsversand.

- [ ] **Step 1: Event öffnen → "Manage Invitations"**

```bash
python3 $SCRIPTS/navigator.py --find-text "booked" --tap --udid $UDID
sleep 0.5
python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Manage Invitations" --tap --udid $UDID
```

- [ ] **Step 2: Gast 1 (Wais) eintragen**

```bash
python3 $SCRIPTS/screen_mapper.py --udid $UDID
# Name
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Wais" --index 0 --udid $UDID
# Email
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "wais@test.com" --index 1 --udid $UDID
# Telefon
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "+4917612345678" --index 2 --udid $UDID
```

- [ ] **Step 3: Gast 2 (Lina) eintragen**

```bash
# Zweite Gast-Reihe öffnen / Hinzufügen
python3 $SCRIPTS/navigator.py --find-text "Add Guest" --tap --udid $UDID
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Lina" --index 3 --udid $UDID
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "lina@test.com" --index 4 --udid $UDID
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "+4917687654321" --index 5 --udid $UDID
```

- [ ] **Step 4: Honoree-Kontaktdaten eintragen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Honoree" --tap --udid $UDID
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "alex@test.com" --index 0 --udid $UDID
```

- [ ] **Step 5: "Invite All Guests" → Kanal wählen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Invite All" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
# Kanal-Auswahl (Sheet erscheint)
python3 $SCRIPTS/navigator.py --find-text "Email" --tap --udid $UDID
```

- [ ] **Step 6: Pending-Counter prüfen**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

**Pass-Kriterium:** Text `Pending: 2` oder `2 pending` sichtbar.

**Edge Case prüfen:** Honoree-Row zeigt HONOREE-Badge (kein eigener Anteil, kein "Pending").

- [ ] **Step 7: UC-O2 protokollieren**

```
## UC-O2: Gäste einladen & verwalten
Status: PASS / FAIL
Pending-Counter korrekt: JA / NEIN
Honoree-Badge sichtbar: JA / NEIN
Gefundene Bugs: [Liste]
```

---

### Task 1.3: UC-O3 — Budget-Übersicht & Zahlungserinnerung

**Erwartetes Ergebnis:** Organiser "Paid", Gäste "Pending", Honoree-Badge, Erinnerungen versandt.

- [ ] **Step 1: Budget-Tab öffnen → Event wählen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Budget" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
# Event selektieren (falls Dropdown)
python3 $SCRIPTS/navigator.py --find-text "Alex" --tap --udid $UDID
```

- [ ] **Step 2: Group Contributions prüfen**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

Prüfe manuell:
- Organiser-Row: Badge/Text `Paid` (hat Deposit bezahlt) ✓
- Wais-Row: `Pending` ✓
- Lina-Row: `Pending` ✓
- Alex (Honoree): HONOREE-Badge sichtbar, **kein** "Pending" ✓

- [ ] **Step 3: Info-Icon beim Honoree antippen → Alert lesen**

```bash
python3 $SCRIPTS/navigator.py --find-text "ⓘ" --tap --udid $UDID
# ODER via accessibility:
python3 $SCRIPTS/navigator.py --find-id "honoree-info-button" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Alert erscheint mit Erklärung warum Honoree nicht zahlt.

Alert dismissen:
```bash
python3 $SCRIPTS/navigator.py --find-text "OK" --tap --udid $UDID
```

- [ ] **Step 4: "Remind All" tippen → Kanal wählen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Remind All" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "WhatsApp" --tap --udid $UDID
```

**Pass-Kriterium:** Feedback-Toast oder Alert "Reminders sent".

- [ ] **Step 5: UC-O3 protokollieren**

```
## UC-O3: Budget-Übersicht & Zahlungserinnerung
Status: PASS / FAIL
Organiser-Status korrekt (Paid): JA / NEIN
Gäste-Status korrekt (Pending): JA / NEIN
Honoree-Badge sichtbar: JA / NEIN
Info-Alert erscheint: JA / NEIN
Remind-All funktioniert: JA / NEIN
Gefundene Bugs: [Liste]
```

---

### Task 1.4: UC-O4 — Umfrage erstellen & Ergebnis sehen

**Erwartetes Ergebnis:** Poll sichtbar für alle Gäste, Live-Results-Ansicht.

- [ ] **Step 1: Event Detail → "Communication" Tab**

```bash
python3 $SCRIPTS/navigator.py --find-text "Events" --tap --udid $UDID
sleep 0.5
python3 $SCRIPTS/navigator.py --find-text "Alex" --tap --udid $UDID  # Event öffnen
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Communication" --tap --udid $UDID
```

- [ ] **Step 2: "+ New Poll" tippen**

```bash
python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "New Poll" --tap --udid $UDID
```

Expected: Poll-Erstellungs-Formular.

- [ ] **Step 3: Frage eingeben**

```bash
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Welches Restaurant für Dinner?" --index 0 --udid $UDID
```

- [ ] **Step 4: Optionen eingeben**

```bash
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Italian" --index 1 --udid $UDID
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Sushi" --index 2 --udid $UDID
# Option 3 hinzufügen:
python3 $SCRIPTS/navigator.py --find-text "Add Option" --tap --udid $UDID
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Steakhouse" --index 3 --udid $UDID
```

- [ ] **Step 5: Poll absenden**

```bash
python3 $SCRIPTS/navigator.py --find-text "Create Poll" --tap --udid $UDID
# ODER "Send":
python3 $SCRIPTS/navigator.py --find-text "Send" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** PollCard mit Frage "Welches Restaurant für Dinner?" sichtbar + "Live Results" Bereich (0 Stimmen).

- [ ] **Step 6: UC-O4 protokollieren**

```
## UC-O4: Umfrage erstellen & Ergebnis sehen
Status: PASS / FAIL
Poll-Card sichtbar: JA / NEIN
Optionen korrekt angezeigt: JA / NEIN
Live Results (0 Stimmen): JA / NEIN
Gefundene Bugs: [Liste]
```

---

### Task 1.5: UC-O5 — Restzahlung leisten

**Voraussetzung:** UC-O1 abgeschlossen, Event mit Datum ≤14 Tage (beim Erstellen in Step 4 setzen).
**Falls das Event-Datum >14 Tage ist:** Event-Datum in Supabase manuell auf 10 Tage in Zukunft setzen, dann App neu starten.

**Erwartetes Ergebnis:** Status wechselt zu "Fully Paid".

- [ ] **Step 1: Budget-Tab → Dringlichkeits-Bell prüfen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Budget" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Bell-Icon mit rotem Dot (`hasUnseenUrgency: true`) sichtbar.
**Falls nicht:** Event-Datum ist >14 Tage → siehe Voraussetzung.

- [ ] **Step 2: Bell antippen → Alert prüfen**

```bash
python3 $SCRIPTS/navigator.py --find-id "urgency-bell" --tap --udid $UDID
# ODER:
python3 $SCRIPTS/navigator.py --find-text "🔔" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Alert mit Event-Name + Tage bis Event + Button "Go to Budget".

- [ ] **Step 3: "Go to Budget" → Event auswählen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Go to Budget" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

- [ ] **Step 4: "Pay Remaining Balance" Button drücken**

```bash
python3 $SCRIPTS/navigator.py --find-text "Pay Remaining Balance" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

Expected: Payment Screen mit Restbetrag (75% des Gesamtpreises).

- [ ] **Step 5: Demo-Zahlung durchführen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Pay" --tap --udid $UDID
sleep 0.5
python3 $SCRIPTS/navigator.py --find-text "OK" --tap --udid $UDID
sleep 2 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Budget-Screen zeigt "Fully Paid" oder Balken = 100%.

- [ ] **Step 6: UC-O5 protokollieren**

```
## UC-O5: Restzahlung leisten
Status: PASS / FAIL
Urgency-Bell sichtbar (≤14 Tage): JA / NEIN
Bell-Alert korrekt: JA / NEIN
Pay-Remaining-Button sichtbar: JA / NEIN
Status nach Zahlung "Fully Paid": JA / NEIN
Gefundene Bugs: [Liste]
```

---

## Phase 2: Guest Use Cases

**Vor Phase 2:** Organizer ausloggen und Guest-Account einloggen.
**Guest-Testaccount anlegen:** Supabase Dashboard → neuer User `guest@test.gameover.app / TestGuest456!`

```bash
UDID=2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4
SCRIPTS=~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts
```

### Task 2.0: Account-Wechsel zu Guest

- [ ] **Step 1: Organizer ausloggen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Profile" --tap --udid $UDID
sleep 0.5
python3 $SCRIPTS/navigator.py --find-text "Log Out" --tap --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Confirm" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

Expected: Welcome Screen.

---

### Task 2.1: UC-G1 — Einladung via Link annehmen (Erstnutzer)

**Voraussetzung:** Invite-Code aus UC-O2 bekannt (in Supabase `invite_codes` Tabelle nachschauen).

**Erwartetes Ergebnis:** Guest erscheint als "Confirmed" in Manage Invitations.

- [ ] **Step 1: Deep Link mit Invite-Code öffnen**

```bash
# Invite-Code aus Supabase holen (ersetze CODE mit echtem Code)
INVITE_CODE="AB12CD34"  # Aus Supabase Dashboard holen

python3 $SCRIPTS/app_launcher.py \
  --open-url "gameover://invite/$INVITE_CODE" \
  --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

Expected: Invite-Accept Screen mit Event-Preview (Name, Honoree, Stadt, Datum, Organisator).

- [ ] **Step 2: Event-Preview-Daten verifizieren**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

Prüfe: Event-Name, "Hamburg", Datum, Organisator-Name sichtbar.

- [ ] **Step 3: "Accept Invitation" tippen → Account-Erstellung**

```bash
python3 $SCRIPTS/navigator.py --find-text "Accept Invitation" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

Expected: Sign-Up Formular (Name, Email, Passwort).

- [ ] **Step 4: Account-Daten eingeben**

```bash
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "Wais Testuser" --index 0 --udid $UDID
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "wais@test.gameover.app" --index 1 --udid $UDID
python3 $SCRIPTS/navigator.py --find-type SecureTextField --enter-text "TestWais789!" --index 0 --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Create Account" --tap --udid $UDID
```

- [ ] **Step 5: "Join Party" → Event-Screen prüfen**

```bash
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Join Party" --tap --udid $UDID
sleep 2 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Event-Detail Screen mit `?firstVisit=1` Indikator (Welcome-Message o.ä.).

- [ ] **Step 6: In Organizer-Account wechseln → "Confirmed" in Manage Invitations prüfen**

Dieser Schritt erfordert kurzfristiges Einloggen als Organizer:
```bash
# App neu starten als Organizer → Manage Invitations → Wais = "Confirmed"
```

- [ ] **Step 7: UC-G1 protokollieren**

```
## UC-G1: Einladung via Link annehmen (Erstnutzer)
Status: PASS / FAIL
Event-Preview zeigt alle Daten: JA / NEIN
Deep Link funktioniert: JA / NEIN
Account-Erstellung klappt: JA / NEIN
"Join Party" navigiert korrekt: JA / NEIN
Gefundene Bugs: [Liste]
```

---

### Task 2.2: UC-G2 — Einladung via Code einlösen

**Erwartetes Ergebnis:** Gleiche Erfahrung wie UC-G1, anderer Einstiegspunkt.

- [ ] **Step 1: Welcome Screen → "Have an invite code?" tippen**

```bash
python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "invite code" --tap --udid $UDID
```

Expected: Code-Eingabe-Feld.

- [ ] **Step 2: Code manuell eingeben**

```bash
python3 $SCRIPTS/navigator.py --find-type TextField --enter-text "AB12CD34" --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Submit" --tap --udid $UDID
# ODER "Validate":
python3 $SCRIPTS/navigator.py --find-text "Validate" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Gleicher Event-Preview Screen wie UC-G1 Step 1.

- [ ] **Step 3: Flow wie UC-G1 ab Step 3 fortsetzen**

Dieser Schritt kann mit einem zweiten Gast-Account (`lina@test.gameover.app`) durchgeführt werden.

- [ ] **Step 4: UC-G2 protokollieren**

```
## UC-G2: Einladung via Code einlösen
Status: PASS / FAIL
Code-Eingabe-Field sichtbar: JA / NEIN
Validierung funktioniert: JA / NEIN
Gleicher Flow wie UC-G1: JA / NEIN
Gefundene Bugs: [Liste]
```

---

### Task 2.3: UC-G3 — Event-Details als Gast einsehen (Read-Only)

**Als Gast eingeloggt (Wais aus UC-G1).**

**Erwartetes Ergebnis:** Read-Only Ansicht — keine Organizer-Buttons sichtbar.

- [ ] **Step 1: Events-Tab → "Attending"-Filter**

```bash
python3 $SCRIPTS/navigator.py --find-text "Events" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Attending" --tap --udid $UDID
```

- [ ] **Step 2: Event öffnen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Hamburg" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

**Pass-Kriterien (alle müssen erfüllt sein):**
- `Edit`-Button NICHT sichtbar ✓
- `Checklist`-Buttons NICHT sichtbar ✓
- Datum, Stadt, Honoree-Info SICHTBAR ✓
- "Contribution Card" mit eigenem Anteil SICHTBAR ✓

- [ ] **Step 3: Fehlende Organizer-Elemente verifizieren**

```bash
# Prüfe dass Edit-Buttons fehlen
python3 $SCRIPTS/screen_mapper.py --json --udid $UDID | python3 -c "
import json, sys
data = json.load(sys.stdin)
elements = str(data)
forbidden = ['Edit', 'Manage Invitations', 'Planning Checklist']
for f in forbidden:
    if f in elements:
        print(f'FAIL: {f} sichtbar für Guest!')
    else:
        print(f'PASS: {f} nicht sichtbar')
"
```

- [ ] **Step 4: "Destination Guide" öffnen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Destination Guide" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Stadtinfo-Content sichtbar (Hamburg Guide).

- [ ] **Step 5: UC-G3 protokollieren**

```
## UC-G3: Event-Details als Gast einsehen
Status: PASS / FAIL
Edit-Button NICHT sichtbar: JA / NEIN
Contribution Card sichtbar: JA / NEIN
Destination Guide öffnet: JA / NEIN
Korrekte Read-Only Ansicht: JA / NEIN
Gefundene Bugs: [Liste]
```

---

### Task 2.4: UC-G4 — An Chat & Poll teilnehmen

**Erwartetes Ergebnis:** Stimme gezählt, Nachricht für alle sichtbar.

- [ ] **Step 1: Communication-Tab öffnen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Communication" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

Expected: Chat-Kanal(e) + Poll aus UC-O4 sichtbar.

- [ ] **Step 2: Laufende Unterhaltung lesen**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

Prüfe: Vorherige Nachrichten sichtbar (falls vorhanden).

- [ ] **Step 3: Nachricht schreiben und senden**

```bash
python3 $SCRIPTS/navigator.py --find-type TextField --tap --udid $UDID
python3 $SCRIPTS/keyboard.py --type "Ich freue mich! 🎉" --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Send" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Nachricht "Ich freue mich! 🎉" in Chat sichtbar.

- [ ] **Step 4: Poll-Stimme abgeben**

```bash
# Zur Poll-Section scrollen
python3 $SCRIPTS/gesture.py --scroll down --udid $UDID
python3 $SCRIPTS/screen_mapper.py --udid $UDID
# Auf "Italian" stimmen
python3 $SCRIPTS/navigator.py --find-text "Italian" --tap --udid $UDID
sleep 1
```

**Pass-Kriterium:** Prozentzahl-Anzeige aktualisiert sich (Italian = 1 Stimme = 100%).

- [ ] **Step 5: Live-Ergebnisse verfolgen**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

Prüfe: Ergebnis-Balken zeigt `Italian 100%` (einzige Stimme).

- [ ] **Step 6: UC-G4 protokollieren**

```
## UC-G4: An Chat & Poll teilnehmen
Status: PASS / FAIL
Chat-Nachricht sichtbar: JA / NEIN
Poll-Abstimmung funktioniert: JA / NEIN
Live-Ergebnis aktualisiert: JA / NEIN
Emoji in Nachricht korrekt: JA / NEIN
Gefundene Bugs: [Liste]
```

---

### Task 2.5: UC-G5 — Eigene Zahlung bestätigen

**Erwartetes Ergebnis:** Status wechselt von "Pending" zu "Paid".

- [ ] **Step 1: Budget-Tab → eigenes Event**

```bash
python3 $SCRIPTS/navigator.py --find-text "Budget" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Hamburg" --tap --udid $UDID
```

- [ ] **Step 2: Eigene Zeile prüfen ("Pending")**

```bash
python3 $SCRIPTS/screen_mapper.py --verbose --udid $UDID
```

**Pass-Kriterium:** Wais-Row zeigt "Pending" + "I've Paid" Button SICHTBAR.
**Fail-Kriterium:** Kein "I've Paid" Button → Bug (fehlt für Gäste).

- [ ] **Step 3: "I've Paid" tippen → Alert bestätigen**

```bash
python3 $SCRIPTS/navigator.py --find-text "I've Paid" --tap --udid $UDID
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
python3 $SCRIPTS/navigator.py --find-text "Confirm" --tap --udid $UDID
# ODER "Yes":
python3 $SCRIPTS/navigator.py --find-text "Yes" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Wais-Row zeigt jetzt "Paid".

- [ ] **Step 4: (Optional) Organizer-View prüfen**

Als Organizer einloggen und Budget-Tab öffnen → Wais sollte "Paid" zeigen (Realtime-Update).

- [ ] **Step 5: UC-G5 protokollieren**

```
## UC-G5: Eigene Zahlung bestätigen
Status: PASS / FAIL
"I've Paid" Button nur für eigene Zeile sichtbar: JA / NEIN
Status wechselt zu "Paid": JA / NEIN
Organiser sieht Update: JA / NEIN (optional)
Gefundene Bugs: [Liste]
```

---

## Phase 3: Edge Cases & Accessibility Audit

### Task 3.1: Accessibility Audit (WCAG)

Für jeden Haupt-Screen den Accessibility Auditor einsetzen.

- [ ] **Step 1: Events-Tab Audit**

```bash
python3 $SCRIPTS/accessibility_audit.py --udid $UDID
```

Dokumentiere alle WCAG-Verstöße (Contrast, Labels, Touch-Targets).

- [ ] **Step 2: Event Detail Audit**

```bash
# Event öffnen, dann:
python3 $SCRIPTS/accessibility_audit.py --udid $UDID
```

- [ ] **Step 3: Budget-Tab Audit**

```bash
python3 $SCRIPTS/navigator.py --find-text "Budget" --tap --udid $UDID
python3 $SCRIPTS/accessibility_audit.py --udid $UDID
```

- [ ] **Step 4: Accessibility Agent einsetzen**

Dispatch `Accessibility Auditor` Agent mit den gesammelten Audit-Ergebnissen für priorisierte Fixes.

---

### Task 3.2: Deep Link Edge Cases

- [ ] **Step 1: Ungültiger Invite-Code**

```bash
python3 $SCRIPTS/app_launcher.py \
  --open-url "gameover://invite/INVALID9" \
  --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Fehlermeldung "Invalid or expired invite code" (keine App-Crash).

- [ ] **Step 2: Abgelaufener Invite-Code**

Invite-Code in Supabase auf `expires_at = now() - 1 hour` setzen, dann:
```bash
python3 $SCRIPTS/app_launcher.py \
  --open-url "gameover://invite/EXPIRED1" \
  --udid $UDID
```

**Pass-Kriterium:** Sinnvolle Fehlermeldung, kein Crash.

- [ ] **Step 3: Event Deep Link**

```bash
python3 $SCRIPTS/app_launcher.py \
  --open-url "gameover://event/NONEXISTENT-ID" \
  --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** 404-ähnliche Meldung, kein Crash.

---

### Task 3.3: Error States & Offline-Verhalten

- [ ] **Step 1: Netzwerk deaktivieren**

```bash
# Netzwerk im Simulator ausschalten
xcrun simctl status_bar $UDID override --networktype "none"
# ODER via Privacy Manager:
python3 $SCRIPTS/privacy_manager.py --disable-network --udid $UDID
```

- [ ] **Step 2: Offline-Verhalten in Events-Tab testen**

```bash
python3 $SCRIPTS/navigator.py --find-text "Events" --tap --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Cached Daten sichtbar ODER sinnvolle Offline-Meldung. Kein Crash.

- [ ] **Step 3: Pull-to-Refresh offline**

```bash
python3 $SCRIPTS/gesture.py --refresh --udid $UDID
sleep 1 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Fehlermeldung "No connection" (kein weißer Screen).

- [ ] **Step 4: Netzwerk wiederherstellen**

```bash
xcrun simctl status_bar $UDID clear
```

---

### Task 3.4: Push Notifications

- [ ] **Step 1: Permission-Status prüfen**

```bash
python3 $SCRIPTS/privacy_manager.py --app app.gameover.ios --status --udid $UDID
```

- [ ] **Step 2: Test-Push senden**

```bash
python3 $SCRIPTS/push_notification.py \
  --bundle-id app.gameover.ios \
  --title "Zahlungserinnerung" \
  --body "Dein Anteil ist in 3 Tagen fällig!" \
  --udid $UDID
sleep 2 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Notification erscheint im System.

---

### Task 3.5: Status Bar & Dark Mode

- [ ] **Step 1: Status Bar auf Demo-Werte setzen**

```bash
python3 $SCRIPTS/status_bar.py --time "09:41" --battery 100 --udid $UDID
```

- [ ] **Step 2: Dark Mode erzwingen (App ist Dark-Only)**

```bash
xcrun simctl ui $UDID appearance dark
sleep 0.5 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Kein weißer Flash, alle Screens korrekt dunkel.

- [ ] **Step 3: Light Mode Switch (sollte weiter dark bleiben)**

```bash
xcrun simctl ui $UDID appearance light
sleep 0.5
```

**Pass-Kriterium:** App bleibt dunkel (da `colorScheme = 'dark'` hardcoded).

---

### Task 3.6: Wizard Edge Cases

- [ ] **Step 1: Draft-Wiederherstellung nach App-Neustart**

```bash
# Während Wizard Step 2 offen ist:
python3 $SCRIPTS/app_launcher.py --terminate app.gameover.ios --udid $UDID
sleep 1
python3 $SCRIPTS/app_launcher.py --launch app.gameover.ios --udid $UDID
sleep 2 && python3 $SCRIPTS/screen_mapper.py --udid $UDID
```

**Pass-Kriterium:** Draft-Card auf Events-Tab sichtbar ODER Wizard öffnet sich wieder an korrekter Stelle.

- [ ] **Step 2: "Extreme" Energie-Level im Wizard**

Wizardstore mappt `extreme` → `high_energy` für DB-Kompatibilität. Prüfen:
```bash
# Im Wizard Step 3 "Extreme" auswählen (falls vorhanden)
python3 $SCRIPTS/navigator.py --find-text "Extreme" --tap --udid $UDID
```

**Pass-Kriterium:** Kein Crash, Pakete werden korrekt gefiltert.

---

## Phase 4: Test Report & Bug Dokumentation

### Task 4.1: Report zusammenführen

- [ ] **Step 1: Test Results Analyzer Agent einsetzen**

Dispatch `Test Results Analyzer` Agent mit `/tmp/test-results.md` für:
- Pass/Fail-Matrix aller 10 Use Cases
- Kritikalitäts-Klassifizierung der Bugs (P1/P2/P3)
- Empfehlungen für die nächsten Sprints

- [ ] **Step 2: Visual Diff für Before/After (falls Screens gespeichert)**

```bash
python3 $SCRIPTS/visual_diff.py --compare /tmp/screenshot-before.png /tmp/screenshot-after.png
```

- [ ] **Step 3: Accessibility-Befunde kodifizieren**

Accessibility Auditor Agent → WCAG-Report mit prioritisierten Issues.

- [ ] **Step 4: Finalen Report speichern**

```bash
# Report nach docs/ speichern
cat /tmp/test-results.md > /Users/soleilphoenix/Desktop/GameOver/game-over-app/docs/ios-test-report-2026-03-29.md
```

---

## Bekannte Risiken & Abhängigkeiten

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| Build schlägt fehl (Pod-Konflikte) | Mittel | `pod install --repo-update`, dann neu bauen |
| Kein Test-Account in Supabase | Hoch | Account via Supabase-Dashboard anlegen |
| Invite-Code nicht bekannt | Hoch | Nach UC-O2 in `invite_codes` Tabelle nachschauen |
| Accessibility IDs fehlen in App | Mittel | Fallback: `--find-text` statt `--find-id` |
| App startet als eingeloggt (alter State) | Niedrig | Simulator löschen: `simctl_erase.py` |
| Poll/Chat nicht in altem Build | Hoch | **Rebuild ist Pflicht** (Phase 0 abwarten) |

---

## Schnellreferenz: Script-Pfade

```bash
UDID="2AA40A03-C422-40D9-BCFE-40DC9FD9D0D4"
S="~/.claude/skills/ios-simulator-skill/ios-simulator-skill/scripts"
BUNDLE="app.gameover.ios"

# Standard-Befehle
alias map="python3 $S/screen_mapper.py --udid $UDID"
alias tap="python3 $S/navigator.py --tap --udid $UDID"
alias find_text="python3 $S/navigator.py --find-text"
alias type_text="python3 $S/keyboard.py --type"
alias scroll="python3 $S/gesture.py --scroll"
alias audit="python3 $S/accessibility_audit.py --udid $UDID"
alias logs="python3 $S/log_monitor.py --app $BUNDLE --severity error --udid $UDID"
```
