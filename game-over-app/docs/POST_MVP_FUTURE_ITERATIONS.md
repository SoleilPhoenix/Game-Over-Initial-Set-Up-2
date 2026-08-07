# Post-MVP Future Iterations

Diese Datei dokumentiert geplante Weiterentwicklungen nach dem MVP-Release. Alle Punkte hier sind bewusst aus dem MVP herausgehalten, um den Go-Live nicht zu verzögern. Nach dem ersten Launch werden diese Iterationen priorisiert und umgesetzt.

---

## Iteration 1 — Package Details & Provider Reveal

### 1.1 Package Details — Anbieter-Übersicht pro Feature

Nach dem MVP: Jeder Eintrag in der **Package Includes**-Liste (z. B. „Laser Tag", „Tapas Dinner", „Bar Crawl") soll anklickbar sein und eine Detailansicht öffnen mit:

- **Anbieter-Name** (Provider)
- **Preis** (ggf. pro Person oder Gruppe)
- **Adresse** mit Link zu Maps
- **Öffnungszeiten / Check-in-Zeit**
- **Buchungsreferenz** des Anbieters
- **Kurzbeschreibung** des Angebots
- **Fotos** vom Anbieter (falls verfügbar)

> Kontext: Anbieter-Informationen werden erst nach vollständiger Zahlung freigegeben. Im MVP sind Features nur als Labels sichtbar. In Iteration 1 werden die hinterlegten Provider-Daten aus der Datenbank an die `package_features`-Einträge geknüpft und entsperrt.

### 1.2 Package Details — Event-Tag-Seite weiter ausbauen

Die Package-Details-Seite (geöffnet aus dem Event als `viewOnly`) wird zum zentralen Hub für den Event-Tag:

- **Treffpunkt-Karte** (statische Maps-Preview oder Link zu Apple/Google Maps)
- **Wettervorhersage** für den Event-Tag (via OpenWeather o. Ä.)
- **ÖPNV-Informationen**: Wie kommt man zum Treffpunkt (Linie, Haltestelle, Fahrzeit)
- **Venue-Infos**: Parkmöglichkeiten, Dresscode, was mitnehmen
- **Live-Status**: Ob der Anbieter bestätigt hat, ob Änderungen vorliegen

> Diese Infos werden idealerweise 48h vor dem Event-Datum in der App sichtbar und können vom Organizer oder automatisch per Edge Function befüllt werden.

---

## Iteration 2 — Weitere Post-MVP Features (Backlog)

- Organizer kann den Tagesplan editieren und einzelne Zeitslots anpassen
- Push-Notification: Automatische Erinnerung am Vorabend mit dem Tagesplan
- Gastansicht: Teilnehmer sehen nur ihren relevanten Teil des Tagesplans
- Wetter-Widget im Event-Detail (live)
- ÖPNV-Integration (z. B. über DB Navigator API oder Google Directions)
- Anbieter-Bewertung nach dem Event durch Teilnehmer

---

## Iteration 3 — Ivory Paper (Light Theme) fertigstellen

Aktueller Stand: Der Design-System-Token-Contract (`EDITORIAL_LIGHT` in `src/constants/designSystem.ts`) und der Theme-Store existieren bereits, aber die App rendert im Light-Mode nicht durchgängig korrekt (viele Screens haben noch dark-only Hex-Werte oder falsche Kontraste). Im MVP ist der `Ivory Paper`-Eintrag im `Profile → Darstellung`-Screen deshalb bewusst als **„Demnächst verfügbar" (disabled)** markiert, und wer früher `light` oder `system` gewählt hatte, wird per `useEffect` automatisch auf `dark` zurückgesetzt.

Für die Freischaltung nötig:

1. **Audit aller Screens** auf hardgecodete Hex-Werte (z. B. `#0D1B2A`, `#12253A`, `rgba(255,255,255,…)`) und Umstellung auf `useTheme()` Tokens.
2. **Kontraste prüfen** im Light-Mode (WCAG AA min) — insbesondere für sekundären Text, disabled States, Glass Cards.
3. **Icons/Illustrationen**: Manche Icons haben feste Farben, die im hellen Modus nicht funktionieren.
4. **StatusBar-Style** je nach Theme (`light-content` vs. `dark-content`) durchreichen.
5. **Coming-Soon-Marker entfernen** in `app/(tabs)/profile/appearance.tsx` (das `comingSoon: true`-Flag auf der `light`-Option streichen und die `useEffect` mit dem Force-back-to-dark ebenfalls entfernen).
6. **Optional Iteration 3.1**: `System` Mode wieder als Option freischalten, sobald `light` vollständig funktioniert (aktuell auch ausgeblendet).

---

*Letzte Aktualisierung: 2026-07-16*
