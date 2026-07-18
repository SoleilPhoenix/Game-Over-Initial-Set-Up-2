# Gäste-Registrierungs-Flow - Test, Fixes & i18n

Datum: 2026-07-18
Branch: `claude/event-guest-registration-test-69bcb6`
Status: Entwurf zur Review

## Ziel

Sicherstellen, dass der komplette Weg vom Organisator, der Gäste einlädt, bis zum registrierten Gast sauber funktioniert - inklusive der Frage, ob Name, E-Mail, Telefonnummer und Profilbild des Gastes fehlerfrei durch das System übertragen werden.
Dazu gehört: den Flow end-to-end reproduzieren, gefundene Fehler beheben und den bisher nicht übersetzten Gäste-Flow auf Deutsch/Englisch-Parität bringen.

## Umfang

Enthalten:

- End-to-end-Verifikation des Gäste-Flows (Backend-Datenfluss + realer UI-Durchlauf + automatisierte E2E-Absicherung).
- Behebung der drei identifizierten Fehler-/Risikostellen.
- i18n-Nachzug für den Invite-Wizard und die restlichen englischen Strings in "Gäste verwalten".

Nicht enthalten (separate Vorgänge):

- Umbau des Bezahl-/Booking-Flows.
- Pfad-restriktive Absicherung des Avatar-Uploads (Security-Härtung, siehe "Nebenbefunde").
- Redesign der Screens - nur Textinhalte (i18n) und Bugfixes, keine visuelle Neugestaltung.

## Verifizierter Ist-Zustand (Fakten, nicht Annahmen)

Codebase:

- Organisator-Seite: `app/event/[id]/participants.tsx` - trägt Gast-Slots (Vorname/Nachname/E-Mail/Telefon) ein, cached lokal (`participantCountCache`) und ruft die Edge Function auf.
- Edge Function: `supabase/functions/send-guest-invitations/index.ts` - erzeugt pro Gast einen `invite_codes`-Datensatz (mit Gastdaten, `max_uses=1`, 30 Tage gültig) und verschickt einen Link `/invite/{code}` per E-Mail (SendGrid) oder WhatsApp (Twilio).
- Gast-Seite: `app/invite/[code].tsx` - dreistufiger Wizard: Vorschau (RPC `get_invite_preview`, ohne Login) → Signup → Profil (Telefon + optionaler Foto-Upload) → schreibt `event_participants` (role `guest`) und benachrichtigt den Organisator.
- Repository/Hooks: `src/repositories/invites.ts`, `src/hooks/queries/useInvites.ts`.

Supabase (Projekt `stdbvehmjpmqbjyiodqg`, ACTIVE_HEALTHY):

- `invite_codes` besitzt `guest_first_name`, `guest_last_name`, `guest_email`, `guest_phone` - die Organisator-Eingaben werden real persistiert.
- Storage-Bucket `avatars` existiert und ist `public`; RLS-Policies für INSERT/UPDATE/DELETE existieren für `authenticated`.
- E-Mail-Bestätigung ist historisch auf Auto-Confirm (mehrere `email_confirmed_at` ~6 ms nach `created_at`) - der Flow läuft ohne echtes Postfach durch. Aktueller Setting-Zustand wird im Live-Lauf final bestätigt.

Datenketten-Verifikation (2026-07-18, real geprüft):

- Organisator → `invite_codes`: Beim Einladen werden `guest_first_name`, `guest_last_name`, `guest_email`, `guest_phone` vollständig befüllt (bestätigt an realen Datensätzen).
- Gast → `event_participants`/`profiles`: Registrierte Gäste haben `full_name` **und** `phone` **und** `avatar_url` gesetzt (2 von 3 Stichproben; der dritte übersprang den Profilschritt → nur Name). Name, Telefon und Foto werden also im Happy Path sauber übertragen.
- Fazit: Die Bugs betreffen Edge Cases (stiller Upload-Fehler, Confirmation-Sackgasse) und die Anzeige-Präferenz (Option B), nicht die grundsätzliche Übertragung.

## Datenfluss der Gast-Informationen (Kernfrage "sauber übertragen?")

| Information | Eingabe | Speicherort | Anzeige beim Organisator |
|---|---|---|---|
| Name (Organisator-Sicht) | Organisator in Slot | `invite_codes.guest_first/last_name` | Ja - Quelle der Wahrheit |
| Name (Gast-Selbstangabe) | Gast im Signup | `auth.users.user_metadata.full_name` → `profiles.full_name` | Nein (Organisator sieht `invite_codes`) |
| E-Mail | Organisator + Gast-Signup | `invite_codes.guest_email` / `auth.users.email` | Ja |
| Telefon | Gast im Profilschritt | `profiles.phone` | Über `invite_codes`-Match bevorzugt |
| Profilbild | Gast im Profilschritt | Storage `avatars/{uid}.ext` → `profiles.avatar_url` | Ja (Avatar-Ring) |

Entschieden (Option B): Sobald der Gast sich registriert hat, gewinnt seine **Selbstangabe** (`profiles.full_name`) in der Organisator-Ansicht.
Der vom Organisator vorab eingetragene `invite_codes`-Name ist nur Platzhalter, solange der Slot noch nicht registriert ist.
Begründung: die Person besitzt ihren eigenen Namen; der Organisator-Eintrag dient nur der Erst-Einladung.

## Zu behebende Fehler / Risiken

### Bug 1 - Foto-Upload scheitert still

`app/invite/[code].tsx:306-312`: Bei `uploadError` wird der Fehler nur geloggt; der Gast läuft ohne Foto weiter, ohne Hinweis.
Da der Bucket existiert und public ist, sollte der Happy-Path funktionieren - aber ein Fehlschlag (Netz, MIME, Größe, Policy) bleibt unsichtbar.
Fix: Bei Upload-Fehler den Gast sichtbar informieren (Alert) und den Schritt nicht als "Foto gesetzt" markieren; Happy-Path bleibt unverändert.

### Bug 2 - Sackgasse bei erzwungener E-Mail-Bestätigung

`app/invite/[code].tsx:203-217`: Wenn Supabase Confirmation erzwingt, schlägt der sofortige Passwort-Login fehl und der Gast landet in "Check your inbox" ohne Weg zurück in den konkreten Invite.
Fix: Sicherstellen, dass der "Log in instead"-/Bestätigungspfad mit `redirect=/invite/{code}` zurückführt, und die Meldung übersetzt + eindeutig ist.
Vorab im Test prüfen, ob Confirmation aktuell an/aus ist (bestimmt, ob dieser Pfad überhaupt getriggert wird).

### Bug 3 - Divergierende Namensquelle (Option B)

`app/event/[id]/participants.tsx:284-294`: Aktuell gewinnt immer der `invite_codes`-Name (Organisator-Eingabe), auch nachdem der Gast sich mit abweichendem Namen registriert hat.
Fix (Option B): Sobald ein Slot einem registrierten Teilnehmer zugeordnet ist (`dbGuest` mit `user_id` vorhanden), die **Selbstangabe des Gastes** (`profiles.full_name`) bevorzugen.
Der `invite_codes`-Name bleibt nur die Quelle für noch nicht registrierte Slots (Platzhalter bis zur Registrierung).
Analog für die Telefonnummer prüfen: bei registriertem Gast `profiles.phone` (Selbstangabe) statt der Organisator-Eingabe bevorzugen, damit Selbstangaben konsistent gewinnen.

## Testplan Gäste-Flow

### Happy Path

1. Organisator erstellt Event, trägt einen Gast mit Name + E-Mail + Telefon ein.
2. Einladung senden → `invite_codes`-Datensatz entsteht, Ergebnisliste zeigt "sent".
3. Invite-Link öffnen → Vorschau zeigt Eventname, Stadt, Datum, "Eingeladen von".
4. Signup mit eigener E-Mail + Passwort.
5. Profilschritt: Telefon eingeben + Profilbild wählen → weiter.
6. Landung auf Event-Screen als bestätigter Teilnehmer.
7. Verifikation: `event_participants` (role guest, `confirmed_at`), `profiles.phone`, `profiles.avatar_url`, Avatar im Organisator-View.
8. Gast erstellt anschließend ein eigenes Event (normaler Wizard) - läuft ohne Konflikt.

### Edge Cases

- Bereits Teilnehmer: erneutes Öffnen des Links → freundliche Weiterleitung, kein Doppel-Eintrag.
- Code abgelaufen / `max_uses` erreicht / deaktiviert → klare, übersetzte Fehlermeldung.
- Doppelter Kontakt: gleiche E-Mail/Telefon in zwei Slots → Senden blockiert (bereits implementiert, verifizieren + Meldung übersetzt).
- Foto-Upload-Fehler (zu groß / falsches Format / simulierter Netzfehler) → Gast wird informiert (Bug 1).
- E-Mail-Confirmation an: Sackgasse-Pfad prüfen (Bug 2).
- Gast gibt bei Signup abweichenden Namen ein → Verhalten dokumentieren/entscheiden (Bug 3).
- Gast überspringt Profil ("Skip") → tritt ohne Telefon/Foto bei, keine Fehler.
- Bereits existierendes Konto mit der E-Mail → "Log in instead" führt korrekt zurück in den Invite.

### Testmethode (empfohlene Reihenfolge)

1. Backend-Datenfluss real via Supabase (schnell, faktenbasiert): Invite anlegen, Kette prüfen.
2. Realer UI-Durchlauf: iOS-Simulator (codex-computer-use) oder dein iPhone (mac-preview) - Foto-Picker, Tastatur, Alerts.
3. Bleibende Absicherung: `e2e/invites/inviteSystem.test.ts` um den Profil-/Foto-/Edge-Case-Teil erweitern.

## i18n-Nachzug

- `app/invite/[code].tsx` vollständig auf `useTranslation()` umstellen; neue Keys unter `invite.*` (o. ä.) zuerst in `en.ts`, dann `de.ts` (nach `gameover-i18n`-Muster).
- Restliche englische Strings in `app/event/[id]/participants.tsx` ("Confirm", "Invite All Guests", "SEND FROM GAME OVER", "Sending…", "Tap to add phone number", "Total", "Send another channel" u. a.) auf i18n-Keys ziehen.
- EN/DE-Parität prüfen (aktuell 944 vs. 922 Zeilen) und Lücken schließen.
- Verifikation: Sprachumschaltung DE/EN, kein hartkodierter englischer String mehr im Gäste-Flow.

## Nebenbefunde (nicht in diesem Vorgang)

- Avatar-Upload-Policy schränkt den Objektpfad nicht auf die eigene User-ID ein - jeder Authentifizierte könnte fremde Avatare überschreiben. Als separate Security-Härtung vormerken.
- `incrementUseCount` ist nicht atomar mit dem Participant-Insert (dokumentiert, für MVP akzeptiert).

## Verifikation der Fertigstellung

- `npm run typecheck` und `npm run lint` grün.
- Betroffene Unit-/E2E-Tests grün; neuer Edge-Case-Test grün.
- Realer Durchlauf zeigt: Name/E-Mail/Telefon/Foto kommen beim Organisator korrekt an.
- Gäste-Flow vollständig auf Deutsch, wenn App-Sprache DE.
