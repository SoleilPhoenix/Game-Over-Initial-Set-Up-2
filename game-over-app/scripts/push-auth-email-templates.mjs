#!/usr/bin/env node
/**
 * Pushes the six Supabase Auth email templates to the hosted project.
 *
 * Why this exists: `supabase config push` is the only CLI path, and it uploads
 * the ENTIRE auth config — including `site_url = "exp://localhost:8081"` and the
 * OAuth secrets that are `env(...)` placeholders locally. That would repoint every
 * confirmation link in every customer email at a dev URL. This script touches
 * nothing but the twelve mailer_* fields.
 *
 * Usage:
 *   export SUPABASE_ACCESS_TOKEN=sbp_...        # create at
 *                                               # supabase.com/dashboard/account/tokens
 *   node scripts/push-auth-email-templates.mjs             # dry run, shows the diff
 *   node scripts/push-auth-email-templates.mjs --apply     # writes
 *
 * The token is read from the environment only. It is never written to disk, never
 * logged, and never committed.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'stdbvehmjpmqbjyiodqg';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes('--apply');

// file stem -> Management API field prefix. The prefixes are Supabase's, not ours;
// the preflight below fails loudly if any of them stops existing.
const TEMPLATES = [
  { file: 'confirm-signup',   api: 'confirmation',      toml: 'confirmation' },
  { file: 'reset-password',   api: 'recovery',          toml: 'recovery' },
  { file: 'change-email',     api: 'email_change',      toml: 'email_change' },
  { file: 'magic-link',       api: 'magic_link',        toml: 'magic_link' },
  { file: 'invite',           api: 'invite',            toml: 'invite' },
  { file: 'reauthentication', api: 'reauthentication',  toml: 'reauthentication' },
];

function die(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

if (!TOKEN) {
  die('SUPABASE_ACCESS_TOKEN is not set.\n'
    + '    Create one at https://supabase.com/dashboard/account/tokens\n'
    + '    then: export SUPABASE_ACCESS_TOKEN=sbp_...');
}

/** Subjects live in config.toml so the file stays the single source of truth. */
function subjectsFromConfig() {
  const toml = readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const found = {};
  for (const { toml: key } of TEMPLATES) {
    const section = toml.split(`[auth.email.template.${key}]`)[1];
    const match = section?.match(/^\s*subject\s*=\s*"([^"]*)"/m);
    if (!match) die(`No subject found for [auth.email.template.${key}] in config.toml`);
    found[key] = match[1];
  }
  return found;
}

async function api(method, body) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    die(`${method} config/auth failed: ${response.status} ${detail.slice(0, 300)}`);
  }
  return response.json();
}

const subjects = subjectsFromConfig();
const local = {};
for (const t of TEMPLATES) {
  local[t.api] = {
    subject: subjects[t.toml],
    content: readFileSync(join(ROOT, 'supabase', 'templates', 'auth', `${t.file}.html`), 'utf8'),
  };
}

console.log(`\n  Projekt: ${PROJECT_REF}`);
const remote = await api('GET');

// Preflight: if Supabase ever renames a field, fail here instead of silently
// PATCHing keys that land nowhere and reporting success.
const missing = TEMPLATES
  .flatMap((t) => [`mailer_subjects_${t.api}`, `mailer_templates_${t.api}_content`])
  .filter((key) => !(key in remote));
if (missing.length) {
  die(`The Management API no longer exposes: ${missing.join(', ')}\n`
    + '    Check the current field names before trusting this script.');
}

const payload = {};
let changed = 0;
for (const t of TEMPLATES) {
  const subjectKey = `mailer_subjects_${t.api}`;
  const contentKey = `mailer_templates_${t.api}_content`;
  const subjectDiffers = remote[subjectKey] !== local[t.api].subject;
  const contentDiffers = (remote[contentKey] ?? '') !== local[t.api].content;
  if (subjectDiffers || contentDiffers) {
    payload[subjectKey] = local[t.api].subject;
    payload[contentKey] = local[t.api].content;
    changed++;
  }
  const marks = [subjectDiffers ? 'Betreff' : null, contentDiffers ? 'Inhalt' : null].filter(Boolean);
  console.log(`  ${marks.length ? '~' : '='} ${t.file.padEnd(18)} ${marks.join(' + ') || 'unveraendert'}`);
}

if (!changed) {
  console.log('\n  Alles bereits aktuell, nichts zu tun.\n');
  process.exit(0);
}

if (!APPLY) {
  console.log(`\n  ${changed} Vorlage(n) wuerden geschrieben. Nochmal mit --apply ausfuehren.\n`);
  process.exit(0);
}

await api('PATCH', payload);

// Verify against the server rather than trusting the 200.
const after = await api('GET');
const wrong = TEMPLATES.filter(
  (t) => after[`mailer_templates_${t.api}_content`] !== local[t.api].content
    || after[`mailer_subjects_${t.api}`] !== local[t.api].subject,
);
if (wrong.length) {
  die(`Nach dem Schreiben weichen noch ab: ${wrong.map((t) => t.file).join(', ')}`);
}
console.log(`\n  ✓ ${changed} Vorlage(n) geschrieben und gegen den Server verifiziert.\n`);
