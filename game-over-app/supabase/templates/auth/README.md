# Auth-E-Mail-Vorlagen

Die sechs E-Mails, die **Supabase selbst** verschickt: Registrierung, Passwort, E-Mail-Wechsel,
Anmeldelink, Einladung, Bestätigungscode.
Sie liegen hier als Quelle. Das gehostete Projekt liest diese Dateien **nicht** — es kennt nur, was
in seiner eigenen Konfiguration steht. Es gibt also immer einen Schritt, der sie hochbringt.

Nicht zu verwechseln mit den sechs App-Mails (Willkommen, Buchungsbestätigung, Zahlungserinnerung,
Gasteinladung, Final-Briefing, Storno). Die stehen in
`supabase/functions/_shared/email-templates.ts` und gehen mit dem Deploy der Edge Functions live.

## Weg 1: das Skript (empfohlen)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
node scripts/push-auth-email-templates.mjs
```

Das ist ein **Trockenlauf**: er zeigt pro Vorlage, ob Betreff oder Inhalt vom Server abweichen,
und schreibt nichts. Wenn die Liste passt:

```bash
node scripts/push-auth-email-templates.mjs --apply
```

Das Token erzeugst du einmalig unter
<https://supabase.com/dashboard/account/tokens> ("Generate new token").
Es wird nur aus der Umgebung gelesen, nicht gespeichert und nicht geloggt.
Ein neues Terminal braucht das `export` erneut.

Das Skript fasst ausschließlich die zwölf `mailer_*`-Felder an und prüft nach dem Schreiben gegen
den Server nach, statt der 200-Antwort zu glauben.
`supabase config push` wäre der naheliegende Weg, ist hier aber **gesperrt**: es lädt die komplette
Auth-Konfiguration hoch, inklusive `site_url = "exp://localhost:8081"` aus `config.toml`.
Danach zeigt jeder Bestätigungslink in jeder Kundenmail auf die Entwicklungs-URL.

## Weg 2: von Hand

Supabase-Dashboard → **Authentication** → **Emails**. Dort pro Vorlage: Inhalt der HTML-Datei
komplett einfügen, Betreff setzen, speichern.

| Datei | Vorlage im Dashboard | Betreff |
|---|---|---|
| `confirm-signup.html` | Confirm signup | E-Mail-Adresse bestätigen \| Game Over |
| `reset-password.html` | Reset password | Passwort zurücksetzen \| Game Over |
| `change-email.html` | Change email address | Neue E-Mail-Adresse bestätigen \| Game Over |
| `magic-link.html` | Magic link | Dein Anmeldelink \| Game Over |
| `invite.html` | Invite user | Du bist zu Game Over eingeladen |
| `reauthentication.html` | Reauthentication | Dein Bestätigungscode \| Game Over |

Die Betreffzeilen stehen zusätzlich in `supabase/config.toml` unter `[auth.email.template.*]`.
Das Skript liest sie von dort, damit es nur eine Quelle gibt. Wer sie ändert, ändert sie dort.

## Nach einer Änderung

Wer eine der HTML-Dateien anfasst, muss sie erneut hochbringen — sonst driftet der Server von der
Datei weg, ohne dass es jemand sieht. `config.toml` hält nur den lokalen Stack synchron.

Die Platzhalter (`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`) werden
von Supabase ersetzt und müssen wörtlich stehen bleiben. Ein Tippfehler darin rendert als leerer
Text und bricht den Ablauf still.
