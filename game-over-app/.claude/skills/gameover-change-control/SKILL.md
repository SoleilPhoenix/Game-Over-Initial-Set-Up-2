---
name: gameover-change-control
description: How changes are classified, gated, and reviewed in the Game Over project. Use before starting any non-trivial change (DB migration, edge function, CI workflow, new dependency, payment/RLS code, store/release work) to determine which gates apply, what is forbidden, and what needs owner approval.
version: 1.0.0
---

# Game Over — Change Control

This skill is the binding contract for how changes move through this repo
(`SoleilPhoenix/Game-Over-Initial-Set-Up-2`, root `/Users/soleilphoenix/Desktop/GameOver`,
app package in `game-over-app/`). When in doubt: classify the change, check the
non-negotiables, check the owner-approval list, then run the verification gates.

---

## 1. Change classes and their gates

| Class | Examples | Gate before merge |
|---|---|---|
| **Client-only code** | screens under `app/`, `src/components`, `src/hooks`, `src/stores`, i18n | `npm run typecheck` + `npm run lint` + `npx vitest run` (CI "Code Quality" job), plus iOS/Android build jobs on PR |
| **DB migrations** | `game-over-app/supabase/migrations/*.sql` | All of the above + security-patterns RLS rules (§5) + **owner approval** — `migrate.yml` auto-runs `supabase db push` against the LIVE project on merge to main |
| **Edge functions** | `game-over-app/supabase/functions/**` | Code Quality + shared-helper conventions (`_shared/http.ts`: CORS allowlist, constant-time secret compare) + **owner approval** — `deploy-edge-functions.yml` auto-deploys to the live project on merge to main; project must be restored from INACTIVE first |
| **CI workflows** | `.github/workflows/*.yml` **at repo root only** | Manual review; test with `workflow_dispatch` where possible. Never under `game-over-app/.github/` (§2.5) |
| **Deps / native modules** | `package.json`, config plugins, `expo prebuild` inputs | **Owner sign-off required** for any new dependency. npm only (§2.6). Native-module changes must pass both CI build jobs (iOS pod install, Android gradle) |
| **Docs** | `README`, specs, `docs/` | Lightest gate: accuracy review. Tier-5 audit treated doc drift as fixable findings (PR #9, `284eab3d9`) |
| **Store / release** | `eas.json`, `release.yml`, app store metadata | **Owner approval always.** Release builds must keep `SENTRY_DISABLE_AUTO_UPLOAD` handling intact (`ab10676a8`, `8841b689e`) |

---

## 2. Non-negotiables (each backed by a real incident)

### 2.1 Never client-write payment fields or event `booked` status
Booking money columns (`total_cents`, `paid_amount_cents`, `payment_status`, …) and
the event `booked` status transition are **locked to the service role by DB triggers**.
Totals are recomputed server-side from the package price. Clients call edge functions;
they never write money.
- **Incident:** amounts were client-set and a swallowed "already-paid" guard allowed
  double charges. Fixed in `01aa7a03d` (2026-07-06, PR #11) — server-authoritative
  payments, migrations `20260705000000_security_hardening_financials.sql` through
  `20260705000008_security_followups.sql`. Earlier payment-bypass hardening: `3fdefd353` (Tier 2).
- Re-adding a client-side write will silently fail against the trigger at best,
  reintroduce a payment-integrity hole at worst.

### 2.2 Never direct cross-table queries in RLS policies on `events` / `event_participants`
Policies must go through the `SECURITY DEFINER` functions `is_event_creator()` /
`is_event_participant()`.
- **Incident:** direct `SELECT ... FROM events` inside an `event_participants` policy
  caused infinite recursion (Postgres error `42P17`). Fixed via SECURITY DEFINER
  functions — see `20260211000001_fix_event_participants_all_policy.sql` and
  `20260320000000_restore_participant_rls_select.sql`. Enforced by the
  `rls_policy_cross_table_recursion` rule in `.claude/security-patterns.yaml`.

### 2.3 Never re-add the Sentry Expo/Metro plugin until Expo SDK 55+ / @sentry/react-native 8.x
- **Incident:** `@sentry/react-native` 7.x's Metro serializer crashes bundling on SDK 54
  (`TypeError: Cannot read properties of undefined (reading 'match')` in
  `sentryMetroSerializer`). Plugin removed in `75a298995` (2026-05-16), `withSentryConfig`
  disabled in `metro.config.js` in `6ffcf8025`. The JS Sentry library still runs; only
  source-map auto-upload is lost. Re-enable conditions are documented inline in
  `app.config.ts` (~lines 91–95) and `metro.config.js` — do not "fix" those comments away.

### 2.4 Never re-add regular-SMS invitations
Guest invites are **WhatsApp + Email only**. This includes NOT restoring the old
WhatsApp→SMS fallback.
- **History:** SMS was a first-class channel (`0035f9b99`) with an auto-fallback
  (`35c37454b`), then intentionally removed (landed via `cab1006da`, 2026-05-16).
  `send-guest-invitations/index.ts` (~line 360) carries the comment:
  "Regular SMS has been intentionally removed as a channel". Same rule applies to
  `send-final-briefing`.

### 2.5 Never add workflows under `game-over-app/.github/` expecting them to run
GitHub Actions only reads `.github/workflows/` at the **repo root**
(`/Users/soleilphoenix/Desktop/GameOver/.github/workflows/`).
- **Incident:** CI/deploy/migrate workflows were placed under
  `game-over-app/.github/workflows/` and never ran; moved to repo root with
  `defaults.run.working-directory: game-over-app` in `a2699c338` (Tier-5 fix D1/D3/D4).
- **Watch out:** the mistake keeps recurring — PR #11 (`01aa7a03d`, `354624034`) added
  `security-audit.yml` under `game-over-app/.github/workflows/` again. Leftover
  `e2e.yml` and `payment-reminders.yml` also still sit there; they are dead files.
  Any new workflow goes to the repo root, with `working-directory: game-over-app`
  defaults and `game-over-app/`-prefixed path triggers.

### 2.6 npm, not pnpm
The project uses `package-lock.json` and `npm ci --legacy-peer-deps`.
- **Incident:** ci.yml originally used pnpm + frozen-lockfile and failed on every run
  (Tier-5 blocker D1, fixed in `e69dd1aad`).

### 2.7 EN + DE parity for all user-facing strings
Every key added to `src/i18n/en.ts` must be mirrored in `src/i18n/de.ts`.
**Defer to the `gameover-i18n` skill** for the exact procedure. Legal pages
(terms/privacy/impressum) are bilingual via SECTIONS/CONTENT objects keyed by language.

### 2.8 No new dependencies without owner sign-off
Native modules can break both CI build jobs (pod install, gradle) and EAS builds;
version bumps have historically been incident-prone (see §2.3). Propose, get approval,
then add.

### 2.9 German-market rules
- Bilingual legal pages must exist and stay bilingual: `app/(tabs)/profile/impressum.tsx`,
  `privacy.tsx`, `terms.tsx` (Impressum is a German legal requirement).
- Currency is **EUR** by default; `create-payment-intent` enforces an allowlist
  (`eur`, `usd`, `gbp`, `chf`) — do not widen it casually (`23577e561` added it as a
  security fix).
- Guest communication channels: WhatsApp + Email only (§2.4).

---

## 3. What requires OWNER approval (hard stop — ask first)

1. **Anything touching the live Supabase project `stdbvehmjpmqbjyiodqg`:**
   - restoring it from INACTIVE (it auto-pauses; edge-function deploys fail with
     404 "Cannot retrieve service … status 'INACTIVE'" until restored),
   - applying migrations (directly via MCP `apply_migration` OR indirectly by merging
     a migration to main, which triggers `migrate.yml` → `supabase db push`),
   - deploying edge functions (MCP `deploy_edge_function` OR merging function changes
     to main, which triggers `deploy-edge-functions.yml`).
2. **Store submission / release**: `release.yml`, EAS submit, store metadata.
3. **Paid services**: anything creating or increasing spend (Twilio, SendGrid, Stripe
   config, EAS build credits, new SaaS).
4. **New dependencies** (§2.8).

---

## 4. Review workflow (as practiced in this repo's history)

1. **Spec doc first** for larger work — e.g. Tier-4: spec (`241105dd8`) → revisions from
   review (`4d3ee3673`, `beeaf6f95`) → implementation plan (`1daccef4f`) → code.
2. **Implementation** on a feature branch (`feature/…`, `fix/tierN-…`), PR to `main`.
3. **Review** — Claude code review runs on PRs (`.github/workflows/claude.yml`,
   `@claude` mentions).
4. **Explicit review-fix commits** addressing findings by count and source:
   - `5068c21f7` — `fix(review): address all 11 issues from PR #10 Claude code review`
   - `a2e09b0e8` — `fix(review): address 3 remaining MEDIUM/HIGH findings from PR #6 audit`
   Follow this pattern: one commit that names the PR and the number of findings addressed.
5. **Tier-audit pattern** for cross-cutting quality passes: Tier 1 (`9363688e5`, PR #5) →
   Tier 2 (`3fdefd353`) → Tier 3 (PR #7) → Tier 4 (`6bcf8fc6c`, PR #8) →
   Tier 5 docs+DevOps (`284eab3d9`, PR #9). Findings get IDs (B4, C1–C7, D1–D6) and are
   fixed traceably.
6. **Conventional-commit format** throughout: `feat(scope):`, `fix(scope):`, `fix(review):`,
   `chore(lint):`, `ci(security):`, `docs:`, `style(screen):`.

---

## 5. Verification gates before any merge

Run locally from `game-over-app/` (CI runs the same in the "Code Quality" job):

```bash
npm run typecheck     # tsc --noEmit
npm run lint
npx vitest run
```

PRs additionally get **Build iOS** and **Build Android** jobs (expo prebuild + native build).
E2E (Detox) is manual-only (`workflow_dispatch`, `0d678dc44`).

### Enforced guardrails (binding contract)

**`.claude/security-patterns.yaml`** — pattern rules fired on matching edits:
- No service-role key or Stripe secret key outside edge-function env vars; no hardcoded JWTs.
- Components (`app/**`, `src/components/**`) must not call `supabase.from/rpc` directly;
  general hooks must not either — only `src/hooks/queries/**` may, via repositories.
- Never log or send auth tokens to console/Sentry; tokens go in `expo-secure-store`,
  never AsyncStorage.
- New tables in migrations must enable RLS; no cross-table `events`/`event_participants`
  policy queries (use the SECURITY DEFINER helpers).
- No raw URL params straight into Supabase queries (`.eq(..., params.x)`).
- Stripe webhooks must use `stripe.webhooks.constructEvent()`; push notifications must
  verify the token's `user_id` matches the recipient.

**`.claude/claude-security-guidance.md`** — architecture contract:
- All DB access flows Component → hook in `src/hooks/queries/` → repository in
  `src/repositories/`. Components never import repositories or `supabase` directly.
- Anon key is intentionally public (RLS is the security boundary); service-role key never
  reaches client code.
- Fallback city UUIDs (`550e8400-…`) are demo scaffolding — do not spread them beyond the
  existing fallback maps.
- `setSession()` / deep-link `code` params require format validation first.
- Edge functions must never return or log the service-role key.

**`Claude_Rules.md`** (repo root of `game-over-app/`) — session conduct: investigate
before answering, don't change files unless instructed, parallelize independent tool calls.

---

## 6. Decision table: change type → required checks → who approves

| Change type | Required checks | Who approves |
|---|---|---|
| Client-only code | typecheck + lint + vitest + CI builds; security-patterns clean | Normal PR review |
| i18n strings | Above + EN/DE parity (`gameover-i18n` skill) | Normal PR review |
| DB migration | Above + RLS enabled on new tables + no cross-table policy queries + no money-column client writes | **Owner** (merge = live `db push`) |
| Edge function | Above + `_shared/http.ts` conventions + webhook signature/idempotency intact | **Owner** (merge = live deploy; project must be ACTIVE) |
| RLS policy change | SECURITY DEFINER helpers only; test for 42P17 | **Owner** |
| CI workflow | Repo-root location + `working-directory: game-over-app` + `game-over-app/` path triggers; dispatch-test if possible | Normal PR review; **Owner** if it deploys/spends |
| New dependency / native module | Both CI build jobs green + EAS impact assessed | **Owner** sign-off before adding |
| Docs | Accuracy vs. code | Normal PR review |
| Store / release / paid services | Full CI + release checklist | **Owner**, always |

---

## 7. Known nuance: live DB is ahead of `main` (as of 2026-07-08, re PR #11)

PR #11 (`claude/affectionate-bardeen-e9e00d`, head `354624034`, key commit `01aa7a03d`)
is **open, not merged** — but its nine migrations
(`20260705000000` … `20260705000008`) and all eight edge functions are **already deployed
to the live project** `stdbvehmjpmqbjyiodqg`. Meanwhile `main`'s latest migration is
`20260613000000_cleanup_notifications_for_cancelled_events.sql`.

Consequences until PR #11 merges:
- Do NOT write new migrations against `main`'s schema assumptions for bookings/invites/
  notifications — the live schema already has the hardening triggers and RPCs.
- Merging PR #11 will make `migrate.yml` re-push already-applied migrations; expect
  `supabase db push` to treat them as applied (they are date-stamped and idempotent by
  ordering) — verify, don't assume.
- Any hotfix branched from `main` that touches payments/invites must be checked against
  the PR #11 diff first, or it will conflict with (or be blocked by) the live triggers.

Date-stamp any similar "live is ahead of main" note you add — this section describes the
state on **2026-07-08** and must be updated or deleted once PR #11 lands.
