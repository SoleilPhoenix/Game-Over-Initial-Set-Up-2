# Tier 2 Backend & Security Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the critical payment bypass vulnerability, make the Stripe webhook idempotent, add missing database indexes, and add financial integrity constraints.

**Architecture:** All changes are isolated — edge function fixes (Deno, no npm), new SQL migrations (applied via Supabase dashboard), and one app.config.ts line fix. No React component changes in this plan.

**Tech Stack:** Deno Edge Functions (Stripe, Supabase), PostgreSQL migrations, TypeScript

**Worktree:** Run in main repo at `/Users/soleilphoenix/Desktop/GameOver/game-over-app/`
**Verify command:** `npm run typecheck 2>&1 | grep "error TS" | grep -v tsconfig`

---

## PHASE 1: Critical — Payment Amount Bypass

### Task 1.1: Fix `create-payment-intent` — server-side amount calculation

**Why:** The function currently uses `amount_cents` from the client request directly in `stripe.paymentIntents.create({ amount: amount_cents })`. An attacker can send `{ booking_id: "xxx", amount_cents: 1 }` to pay €0.01 for any booking.

**Files:**
- Modify: `supabase/functions/create-payment-intent/index.ts`

**Current broken code (line 156):**
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount_cents,  // ← client-controlled value
  ...
});
```

**Root cause:** The booking is already fetched from DB (line 96–107) with `total_amount_cents`. The fix ignores the client value and computes the correct amount server-side.

- [ ] **Step 1: Read the current file**

```bash
cat /Users/soleilphoenix/Desktop/GameOver/game-over-app/supabase/functions/create-payment-intent/index.ts | head -120
```

- [ ] **Step 2: Update the booking SELECT query to include payment fields**

The `booking` select at line 96 fetches `*`, which includes `total_amount_cents`, `deposit_amount_cents`, `payment_status`. Verify these are present. Then replace the `CreatePaymentIntentRequest` interface and the amount logic:

```typescript
// REPLACE the interface (around line 15):
interface CreatePaymentIntentRequest {
  booking_id: string;
  payment_type?: 'deposit' | 'remaining' | 'full'; // client hints what they're paying
  currency?: string;
  // NOTE: amount_cents is intentionally NOT accepted from the client.
  // The server computes the correct amount from the DB booking record.
}
```

- [ ] **Step 3: Add server-side amount calculation after the booking ownership check**

After line 112 (`if (booking.event.created_by !== user.id)`), add:

```typescript
// Parse payment_type from client (default 'full')
const { booking_id, payment_type = 'full', currency }: CreatePaymentIntentRequest = await req.json();

// --- SERVER-SIDE AMOUNT CALCULATION ---
// NEVER trust amount_cents from the client. Compute from DB.
const bookingTotalCents: number = booking.total_amount_cents ?? 0;
const depositPaidCents: number = booking.deposit_amount_cents ?? 0;

let serverAmountCents: number;
if (payment_type === 'deposit') {
  // 30% deposit
  serverAmountCents = Math.round(bookingTotalCents * 0.3);
} else if (payment_type === 'remaining') {
  // Remaining balance after deposit
  serverAmountCents = bookingTotalCents - depositPaidCents;
} else {
  // Full payment
  serverAmountCents = bookingTotalCents;
}

if (serverAmountCents <= 0) {
  return new Response(JSON.stringify({ success: false, error: 'Nothing to pay — booking may already be settled.' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const MAX_AMOUNT_CENTS = 10_000_000; // €100,000 hard cap
if (serverAmountCents > MAX_AMOUNT_CENTS) {
  return new Response(JSON.stringify({ success: false, error: 'Amount exceeds maximum allowed.' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 4: Replace `amount: amount_cents` with `amount: serverAmountCents` in the PaymentIntent creation**

Find the `stripe.paymentIntents.create` call (around line 155). Replace:
```typescript
// BEFORE:
amount: amount_cents,

// AFTER:
amount: serverAmountCents,
```

Also update the audit log entry:
```typescript
// BEFORE:
amount_cents: amount_cents,

// AFTER:
amount_cents: serverAmountCents,
payment_type: payment_type,
```

- [ ] **Step 5: Remove the old `amount_cents` validation block (lines 72–80)**

The old validation (`if (!amount_cents || amount_cents <= 0)` and the max check) is now replaced by server-side logic. Remove those lines.

- [ ] **Step 6: Update the booking SELECT to include `total_amount_cents` and `deposit_amount_cents` explicitly**

```typescript
// Change the select from:
.select(`*, event:events!inner(id, created_by, title, honoree_name)`)

// To (explicit fields to make the type clear):
.select(`id, total_amount_cents, deposit_amount_cents, payment_status, stripe_payment_intent_id, audit_log, event:events!inner(id, created_by, title, honoree_name)`)
```

- [ ] **Step 7: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
git add supabase/functions/create-payment-intent/index.ts
git commit -m "fix(security): compute payment amount server-side — reject client-provided amount_cents"
```

---

## PHASE 2: High — Stripe Webhook Idempotency

### Task 2.1: Make `handlePaymentSuccess` idempotent

**Why:** Stripe retries webhooks on network errors. Without idempotency, each retry creates a duplicate `notifications.insert` and appends a duplicate audit log entry. The payment_status update is safe (idempotent by nature) but notifications pile up.

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1: Add idempotency guard in `handlePaymentSuccess`**

In `handlePaymentSuccess`, after the audit log is fetched (around line 163), add this check before the `auditLog.push(...)`:

```typescript
// --- IDEMPOTENCY GUARD ---
// Stripe retries webhooks. If we already processed this payment_intent, skip.
const alreadyProcessed = auditLog.some(
  (entry: { action: string; payment_intent_id?: string }) =>
    entry.action === 'payment_succeeded' && entry.payment_intent_id === paymentIntent.id
);
if (alreadyProcessed) {
  console.log(`[stripe-webhook] Duplicate event for PI ${paymentIntent.id} — skipping.`);
  return;
}
```

- [ ] **Step 2: Add idempotency guard in `handlePaymentFailure`**

Same pattern, after the audit log is fetched in `handlePaymentFailure`:

```typescript
const alreadyProcessed = auditLog.some(
  (entry: { action: string; payment_intent_id?: string }) =>
    entry.action === 'payment_failed' && entry.payment_intent_id === paymentIntent.id
);
if (alreadyProcessed) {
  console.log(`[stripe-webhook] Duplicate failure event for PI ${paymentIntent.id} — skipping.`);
  return;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
git add supabase/functions/stripe-webhook/index.ts
git commit -m "fix: make Stripe webhook idempotent — skip duplicate payment_intent events"
```

---

## PHASE 3: High — Database Indexes

### Task 3.1: Add missing performance indexes

**Why:** The Database Optimizer agent identified 4 missing indexes that cause full table scans on every app start, guest filter, chat open, and notification bell fetch.

**Files:**
- Create: `supabase/migrations/20260321000000_performance_indexes.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260321000000_performance_indexes.sql
-- Performance indexes identified by Database Optimizer analysis.
-- All use CONCURRENTLY to avoid locking production tables during apply.
-- Apply via: supabase db push OR Supabase SQL Editor.

-- 1. Events by owner — hit on every app start (getByUser query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_created_by_created_at
  ON events (created_by, created_at DESC)
  WHERE deleted_at IS NULL;

-- 2. Event participants by user + role — used by guest filter and invite acceptance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_participants_user_role
  ON event_participants (user_id, role);

-- 3. Messages by channel — hit on every chat open
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_created_at
  ON messages (channel_id, created_at DESC);

-- 4. Unread notifications — hit on every bell counter render
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- 5. Bookings by event — used by useBooking hook on every event detail open
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_event_id
  ON bookings (event_id);
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
git add supabase/migrations/20260321000000_performance_indexes.sql
git commit -m "perf(db): add 5 missing composite/partial indexes for events, participants, messages, notifications, bookings"
```

---

## PHASE 4: Medium — Bookings Financial Integrity Constraints

### Task 4.1: Add CHECK constraints to bookings table

**Why:** Without DB-level constraints, a bug can insert a booking where `service_fee_cents + package_base_cents ≠ total_amount_cents`, or where `stripe_payment_intent_id` is duplicated across bookings. These constraints turn silent data corruption into loud errors.

**Files:**
- Create: `supabase/migrations/20260321000001_bookings_integrity_constraints.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260321000001_bookings_integrity_constraints.sql
-- Financial integrity constraints for bookings table.
-- These enforce that the DB never holds internally inconsistent payment data.

-- Prevent duplicate payment intents (one PI → one booking)
ALTER TABLE bookings
  ADD CONSTRAINT bookings_stripe_pi_unique
  UNIQUE (stripe_payment_intent_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Total must be positive when set
ALTER TABLE bookings
  ADD CONSTRAINT bookings_total_positive
  CHECK (total_amount_cents IS NULL OR total_amount_cents > 0);

-- Deposit cannot exceed total
ALTER TABLE bookings
  ADD CONSTRAINT bookings_deposit_lte_total
  CHECK (
    deposit_amount_cents IS NULL
    OR total_amount_cents IS NULL
    OR deposit_amount_cents <= total_amount_cents
  );

-- Remaining cannot be negative
ALTER TABLE bookings
  ADD CONSTRAINT bookings_remaining_non_negative
  CHECK (remaining_amount_cents IS NULL OR remaining_amount_cents >= 0);
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
git add supabase/migrations/20260321000001_bookings_integrity_constraints.sql
git commit -m "fix(db): add financial integrity constraints to bookings (unique PI, positive totals, deposit ≤ total)"
```

---

## PHASE 5: High — Deep Link Domain Fix

### Task 5.1: Fix `app.config.ts` domain mismatch

**Why:** `applinks:gameover.app` is configured but the production domain is `game-over.app`. iOS Universal Links and Android App Links silently fail when the domain doesn't match — invite links from SMS/email won't open the app on real devices.

**Files:**
- Modify: `app.config.ts`

- [ ] **Step 1: Read the current file**

```bash
grep -n "gameover.app\|game-over.app\|applinks\|intentFilters" /Users/soleilphoenix/Desktop/GameOver/game-over-app/app.config.ts
```

- [ ] **Step 2: Fix the domain reference**

Find every occurrence of `gameover.app` (without hyphen) in `app.config.ts` and change to `game-over.app`. This affects:
- `applinks:gameover.app` (iOS Associated Domains)
- `android:host="gameover.app"` (Android Intent Filters)

```typescript
// BEFORE (iOS):
associatedDomains: ['applinks:gameover.app'],

// AFTER:
associatedDomains: ['applinks:game-over.app'],

// BEFORE (Android intentFilters):
android: { host: 'gameover.app' }

// AFTER:
android: { host: 'game-over.app' }
```

- [ ] **Step 3: Verify no other domain references are wrong**

```bash
grep -rn "gameover\.app" /Users/soleilphoenix/Desktop/GameOver/game-over-app/app.config.ts
```
Expected: 0 results (all changed to `game-over.app`).

- [ ] **Step 4: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
git add app.config.ts
git commit -m "fix: correct deep link domain gameover.app → game-over.app in app.config.ts"
```

---

## PHASE 6: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app && npm run typecheck 2>&1 | grep "error TS" | grep -v tsconfig
```
Expected: 0 errors.

- [ ] **Step 2: Confirm all migrations exist**

```bash
ls /Users/soleilphoenix/Desktop/GameOver/game-over-app/supabase/migrations/ | grep "20260321"
```
Expected: `20260321000000_performance_indexes.sql`, `20260321000001_bookings_integrity_constraints.sql`

- [ ] **Step 3: Push to remote**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app && git push origin main
```

---

## Post-Deploy: Supabase Dashboard Actions Required

After pushing, apply in Supabase SQL Editor:
1. `20260321000000_performance_indexes.sql` — run each `CREATE INDEX CONCURRENTLY` statement individually (CONCURRENTLY cannot run inside a transaction block)
2. `20260321000001_bookings_integrity_constraints.sql` — run as a single statement block
3. Verify `create-payment-intent` edge function: deploy updated version via `npx supabase functions deploy create-payment-intent`
4. Verify `stripe-webhook` edge function: deploy via `npx supabase functions deploy stripe-webhook`
