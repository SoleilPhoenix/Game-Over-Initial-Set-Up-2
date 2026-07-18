# Multi-Modell-Orchestrierung: Claude + Codex (gpt-5.5)

Design-Spec, 2026-07-18.
Sprache: Erklaerungen auf Deutsch (fuer den Review durch Soheil), die tatsaechlichen Artefakt-Inhalte (CLAUDE.md-Sektion, SKILL.md-Dateien) auf Englisch.

## 1. Ziel

Einen dauerhaften Workflow einrichten, in dem Claude (Opus 4.8 / Fable 5) plant, reviewt und die Qualitaet sichert, und umsetzungsintensive Arbeit gezielt an Codex (gpt-5.5) delegiert wird.
Claude steuert Codex headless ueber die Codex-CLI (`codex exec` / `codex review`); es gibt kein manuelles Umschalten durch den Nutzer.
Jede Codex-Delegation wird von Claude vorgeschlagen und erst nach ausdruecklicher Bestaetigung des Nutzers ausgefuehrt.

## 2. Entscheidungen (Ergebnis des Brainstormings)

| Frage | Entscheidung |
|-------|--------------|
| Handoff-Modell | Volle Automatisierung: Claude ruft die Codex-CLI headless auf. |
| Delegations-Trigger | Claude schlaegt vor, der Nutzer bestaetigt. |
| QA-Schleife | Maengel gehen mit praezisem Feedback zurueck an Codex (Schleife bis es passt). |
| Claude-Modelle | Kein Auto-Switch; die Skill gibt an Schluesselstellen Modell-Hinweise (Opus/Fable per `/model`). |
| Codex-Skills | Alle drei: `codex-implementation`, `codex-review`, `codex-computer-use`. |
| Platzierung | Global: `~/.claude/CLAUDE.md`-Sektion + `~/.claude/skills/`. |
| Codex-Modell | Auf neuestes verfuegbares `*-codex`-Modell aktualisieren (Ziel 5.5/5.6). |
| Kontroll-Gate | Vorschlag + ausdrueckliche Bestaetigung bei allen drei Skills. |
| Verify-Standard | `typecheck`+`lint` immer; Tests bei UI-Aenderungen verpflichtend; E2E/Simulator bei User-Flow-Aenderungen verpflichtend. |
| Routing | Ausgewogen: Codex fuer gebundene, klar spezifizierte Umsetzung; Claude behaelt Planung, taste-lastige UI/UX, Architektur, Reviews. |

## 3. Voraussetzungen / Setup (einmalig, vor dem ersten `codex exec`)

### 3.1 Sicherheit (blockierend)

`~/.codex/config.toml` enthaelt aktuell drei Live-Secrets im Klartext: ein GitHub Personal Access Token, einen Context7-API-Key und einen Linear-API-Key.
Diese drei Keys werden vom Nutzer rotiert/erneuert.
Danach stellt Claude die `config.toml` auf `env`-Referenzen um, sodass keine Klartext-Secrets mehr in der Datei stehen.

### 3.2 Codex-CLI installieren

`~/.codex/config.toml` und `~/.codex/auth.json` existieren bereits (frueheres Setup), aber das `codex`-Binary ist nirgends installiert.
Schritte: `npm i -g @openai/codex` (oder aequivalent), dann `codex login` mit dem ChatGPT-Pro-Account.
Danach laeuft Codex auf dem Pro-Abo-Kontingent, nicht per API-Token-Abrechnung.

### 3.3 Modell festlegen

Aktueller Default in der Config: `gpt-5.2-codex`.
Nach der Installation prueft Claude mit der CLI, welches neueste `*-codex`-Modell real verfuegbar ist, und setzt `model` in der `config.toml` darauf.
Die Skills werden im Text mit `gpt-5.5` gelabelt (das reale Modell kommt aus der Config).

## 4. Ebene 1: CLAUDE.md-Orchestrierungs-Sektion (global)

Neue Sektion in `~/.claude/CLAUDE.md`.
Angelehnt an die Referenz des Nutzers, aber angepasst an den echten Kontext (kein Convex/Clerk/Vercel/Bun; Codex laeuft auf Pro-Kontingent statt "near-free deal").
Die bestehenden Hard-Rules (kein Em-Dash, Commit nur auf Ansage, keine CHANGELOG/auto-gen-Dateien) werden nicht dupliziert.

Inhalt (Entwurf, Englisch):

- Modell-Rubric-Tabelle (cost/intelligence/taste) mit `gpt-5.5-codex`, `sonnet-5`, `opus-4.8`, `fable-5`.
- Kostenhinweis: Codex laeuft auf dem ChatGPT-Pro-Kontingent (begrenzt), also Output vor Preis bewerten, aber das Kontingent im Blick behalten.
- Routing (ausgewogen): Codex fuer gebundene, klar spezifizierte Umsetzung/Refactoring/Migration, wenn Claude es vorschlaegt und der Nutzer bestaetigt; Claude behaelt Planung, taste-lastige UI/UX (taste >= 7), Architektur und Reviews; `gpt-5.5` optional als unabhaengige Zweitmeinung im Review.
- Kontroll-Gate: alle drei Codex-Delegationen erst nach ausdruecklicher Bestaetigung des Nutzers.
- Verify-Regel (siehe Abschnitt 6).
- Mechanik: `gpt-5.5` ist nur ueber die Codex-CLI erreichbar (`codex exec` / `codex review`); Verweis auf die drei Skills.
- Subagent-Wrapper-Hinweise: duenner `sonnet, effort: low`-Wrapper, der einen self-contained Codex-Prompt schreibt und `codex exec` via Bash ausfuehrt; `gpt-5.5:`-Label; `isolation: 'worktree'` bei parallelen Laeufen; Timeout kann Bash-10-Minuten ueberschreiten (explizites Timeout oder Background + Poll); Codex-Arbeit ist unsichtbar fuer Claude-Token-Budgets.
- Never use Haiku.

## 5. Ebene 2: Die drei Skills

Basis sind die vom Nutzer gelieferten Vorlagen.
Ablage: `~/.claude/skills/<name>/SKILL.md`.
Die Vorlagen sind gesichert im Scratchpad dieser Session (`template-codex-implementation.md`, `template-codex-review.md`, `template-codex-computer-use.md`).

### Gemeinsame Anpassungen (Delta zu den Vorlagen, alle drei)

1. Kontroll-Gate: Ganz oben im Workflow ein Schritt "Propose the delegation to the user and wait for an explicit go before running codex."
   Das ueberschreibt insbesondere in `codex-computer-use` die Vorlagen-Zeile "launching apps ... is fine without asking".
2. GameOver-/Stack-Defaults in den Beispiel-Prompts und Verify-Hinweisen: `npm run typecheck`, `npm run lint`, `npm test` (vitest), `npm run test:e2e` (detox iOS-Sim), Expo/`expo run:ios`, Dark-Theme, npm (nicht bun/pnpm).
3. Reports: kein Em-Dash; bestaetigte Findings von unverifizierten Codex-Vorschlaegen trennen; `codex not installed`-Fallback (Fehler melden, anbieten selbst zu arbeiten).
4. Codex darf nie committen, pushen, deployen oder globale Config aendern (ausser der Nutzer verlangt es ausdruecklich).
5. Modell-Label `gpt-5.5`.

### 5.1 codex-implementation

- Sandbox: `-s workspace-write` (Default; `danger-full-access` nur wenn wirklich noetig).
- Verify verpflichtend: `typecheck`+`lint` (siehe Abschnitt 6, inkl. UI-Regel).
- Nach dem Lauf: Claude inspiziert `git status` und `git diff`, fuehrt die billigste zuverlaessige Verifikation selbst aus, rollt nur Codex-Fehler zurueck (nie User-Aenderungen), stoppt und meldet bei Verschlechterung.
- Bounded tasks: grosse Buendel in separate Codex-Laeufe splitten.

### 5.2 codex-review

- Kommando: `codex review` (read-only) mit `--uncommitted` / `--base main` / `--commit <sha>`.
- Haltung: "Treat Codex's output as evidence, not authority"; Claude verifiziert wichtige Findings am Code, bevor sie berichtet werden.
- Kein Delegieren nur um Code nicht selbst lesen zu muessen.

### 5.3 codex-computer-use

- Sandbox: `-s danger-full-access` (fuer iOS-Simulator, `expo run:ios`, Detox-E2E, Screenshots, GUI); `--skip-git-repo-check` wenn noetig.
- Default: keine Source-Edits.
- Report: pass / fail / blocked plus durchgefuehrte Schritte, beobachtetes Verhalten, Screenshot-Pfade, umsetzbares Feedback.
- Wird u. a. genutzt, um die verpflichtenden E2E/Simulator-Checks aus Abschnitt 6 auszufuehren.

## 6. Verify-Standard (final)

- Immer: `typecheck` + `lint` muessen gruen sein; Codex muss beide laufen lassen und die Ergebnisse berichten.
- Bei UI-aendernden Tasks zusaetzlich verpflichtend: die relevanten Tests (`npm test`, wo moeglich fokussiert).
- Sobald die Aenderung einen echten User-Flow beruehrt, zusaetzlich verpflichtend: E2E/Simulator (`npm run test:e2e` via `codex-computer-use`).
- Nach jedem Codex-Umsetzungslauf fuehrt Claude die billigste zuverlaessige Verifikation nochmal selbst aus, bevor "fertig" gemeldet wird.

## 7. QA-Feedback-Schleife

Findet Claude beim Review/QA Maengel, formuliert Claude praezises Korrektur-Feedback (mit Datei/Zeile, konkretem Fehlerbild, Fix-Richtung) und schickt es erneut an Codex (`codex exec` mit den Findings).
Codex bessert nach, Claude reviewt wieder; die Schleife laeuft, bis es passt.
Triviale Korrekturen macht Claude nicht selbst - die Umsetzung bleibt konsequent bei Codex (Entscheidung "Zurueck an Codex mit Feedback").

## 8. Build-Reihenfolge

1. Nutzer rotiert die drei Secrets; Claude stellt `config.toml` auf `env`-Referenzen um.
2. Codex installieren, `codex login`, neuestes Modell setzen.
3. CLAUDE.md-Orchestrierungs-Sektion schreiben.
4. Die drei Skills schreiben.
5. Ein winziger echter Smoke-Test (propose + confirm) als End-to-End-Nachweis, dass `codex exec` laeuft und der Report korrekt zurueckgelesen wird.

## 9. Annahmen und offene Punkte

- Annahme: `npm i -g @openai/codex` ist der korrekte Install-Weg und `auth.json` genuegt nach Reinstall, sonst `codex login`.
  Wird in Schritt 2 faktisch geprueft.
- Annahme: Das neueste real verfuegbare Codex-Modell wird nach der Installation faktenbasiert bestimmt; "5.5/5.6" ist das Ziel, der reale Name kann abweichen.
- Die Skill-Dateien werden auf Englisch verfasst (konsistent mit Vorlagen und Codebase); Chat-Kommunikation bleibt Deutsch.
- Der `codex-computer-use`-Vorlagen-Schwanz unterhalb Zeile 49 war im Screenshot abgeschnitten; er wird analog zu den anderen beiden Skills mit einem `codex not installed`-Fallback ergaenzt.
