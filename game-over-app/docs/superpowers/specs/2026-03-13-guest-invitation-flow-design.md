# Guest Invitation Flow — Design Spec
**Date:** 2026-03-13
**Status:** Approved

---

## Overview

Full end-to-end guest journey: an organizer sends a working invite link (Email / SMS / WhatsApp) → guest opens the link → completes a 3-step onboarding wizard → lands on the event in guest view → receives a contribution reminder when the event is 14 days away.

The resulting account is fully equivalent to an organizer account. The `guest` role is per-event only (stored in `event_participants.role`), not an account-level restriction.

---

## Part 1 — Invite Sending (Infrastructure)

### What exists
- Edge Function `send-guest-invitations` is fully built (Email via SendGrid, SMS + WhatsApp via Twilio, fallback WhatsApp→SMS on error codes 63016/63007)
- Invite code generation (8-char alphanumeric, 30-day expiry, max_uses=1)
- `guest_invitations` table for delivery status tracking
- Email HTML template (`getGuestInviteEmailHtml`) in `_shared/email-templates.ts`

### What needs to be done
1. Set the following Supabase Edge Function secrets:
   - `SENDGRID_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_SMS_FROM` (alphanumeric sender ID, e.g. `GameOver`)
   - `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886` for Twilio Sandbox)
2. Deploy: `npx supabase functions deploy send-guest-invitations`
3. Test all three channels end-to-end with a sandbox recipient:
   - Email: SendGrid test delivery
   - WhatsApp: Twilio Sandbox (recipient must have sent join message to sandbox number)
   - SMS: Twilio trial number

### Invite link format
```
https://game-over.app/invite/{8-char-code}
```
Deep link fallback: `gameover://invite/{8-char-code}`

---

## Part 2 — Guest Onboarding Wizard

### Route
`app/invite/[code].tsx` is expanded from the current simple accept screen into a multi-step wizard. The invite code is preserved in local component state throughout all steps.

### Step 1 — Event Preview

**Purpose:** Show the guest what they're joining before asking them to create an account.

**Data fetching:** `invite_codes` has a public anonymous SELECT policy (`is_active = true AND not expired AND not maxed`). A Supabase query joining `invite_codes → events → profiles (organizer)` can be made without auth to fetch: event name, city, date, organizer name, and current accepted guest count. No new RLS policy or Edge Function is needed.

**Content:**
- Hero image (city + package image derived from event's city_id)
- Event name
- Date + city
- "Invited by [Organizer full_name]"
- Count of accepted guests (from `event_participants` WHERE role = 'guest' AND confirmed_at IS NOT NULL)
- Primary CTA: "Accept Invitation →"

**Error states:**
- `not_found` / `inactive`: "This invite link is no longer valid."
- `expired`: "This invite link has expired."
- `max_uses_reached`: "This invite is full — ask the organizer for a new link."

**Logic:**
- Unauthenticated users: show preview → on CTA tap → go to Step 2
- Already authenticated users: skip Steps 2–3, call `acceptInvite()` directly → navigate to event
- Already a participant: skip wizard, navigate directly to event

### Step 2 — Account Creation

**Purpose:** Standard registration, identical validation to organizer signup.

**Fields:**
- First name + Last name (required)
- Email (pre-filled if invite was sent to an email address, editable)
- Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
- Confirm password

**Existing-email detection:** Attempt `signUp()`. If Supabase returns error code `user_already_exists` or message contains "already registered", display inline error: "An account with this email already exists." + "Log in instead →" link that navigates to `/(auth)/login?redirect=/invite/{code}`. Do not use a pre-check RPC — rely on the `signUp()` error response to avoid a round-trip.

**On success:** `supabase.auth.signUp()` with `full_name` in user metadata → `handle_new_user()` DB trigger creates `profiles` row automatically.

### Step 3 — Profile Completion

**Purpose:** Collect phone number and optional profile photo.

**Fields:**
- Phone number (required, E.164 format, country prefix selector, +49 pre-selected)
- Profile photo (optional, camera or gallery via `expo-image-picker`)

**Behaviour:**
- "Skip photo →" link visible at all times
- On "Continue": `UPDATE profiles SET phone = ?, avatar_url = ? WHERE id = auth.uid()`
- On complete: call `invitesRepository.accept(code, userId)` which inserts into `event_participants` with `role: 'guest'`. **Note:** `invited_via` column does not exist in the current DB schema — the insert omits this field. A migration adding `invited_via TEXT` to `event_participants` is required (see DB Changes below).
- Navigate to `/event/{eventId}`

### Navigation guards
- Back button on Steps 2–3 returns to previous step
- Hardware back / swipe on Step 1 closes the wizard (user declined)
- Wizard step state held in local component state (no Zustand store needed)

---

## Part 3 — Guest Event View

### What changes from the organizer view
The event detail screen (`app/event/[id]/index.tsx`) already reads `currentUserRole` from `event_participants`. Additions needed:

| Feature | Organizer | Guest |
|---|---|---|
| Event details | Read + Edit | Read-only |
| Package details | Read + Edit | Read-only |
| Participant list + payment status | ✅ | ✅ |
| Full budget (who paid what) | ✅ | ✅ |
| Manage Invitations button | ✅ | ❌ hidden |
| Edit package button | ✅ | ❌ hidden |
| Booking Reference (GO-XXXXX) | ✅ | ❌ hidden |
| Chat — create + join channels | ✅ | ✅ |
| Polls — create + vote | ✅ | ✅ |
| Own payment tab | ✅ | ✅ |

### Implementation approach
- Add `isGuest = currentUserRole === 'guest'` derived boolean
- Gate the three hidden items behind `!isGuest`
- Events tab: `eventsRepository.getByUser()` already fetches both organizer and guest events — no query change needed. Add a "Guest" badge to event cards where the user's role is `guest`.

---

## Part 4 — Contribution Reminder

### Contribution amount source
The per-guest contribution amount is derived as follows (same logic as the existing `useBookingFlow` / budget screen):
1. Read `cachedBudget` from AsyncStorage (`gameover:budget:{eventId}`)
2. `perGuestAmount = Math.ceil((cachedBudget.totalCents) / cachedBudget.payingCount)`
3. Fallback if no cache: read `booking.total_amount_cents / participants.length` from DB

### First-time welcome card
- Shown **once** after the wizard completes, when the event screen mounts
- Persisted via AsyncStorage key: `gameover:contribution_seen:{eventId}:{userId}`
- Content:
  - Guest's contribution amount (€X, derived above)
  - Event name
  - Organizer name ("Please pay [Organizer name]")
  - Due date: "Due 14 days before the event"
  - Dismiss button: "Got it"
- Implemented as a `Modal` overlay on `app/event/[id]/index.tsx`, shown if key is not set

### 14-day urgency notification
- Reuses existing `useUrgentPayment.ts` hook
- Extension: when `currentUserRole === 'guest'` on the urgent event, the hook returns a guest-specific payload:
  - Message: "Your contribution of €X for [Event] is due in [N] days — please transfer to [Organizer name]"
  - `isGuestContribution: true` flag (no Stripe link, no Budget navigation)
  - Bell dot on tabs fires as already implemented
- **`isPaid` logic for guests:** a guest's contribution is considered paid when `event_participants.payment_status === 'paid'` for that user+event row. The organizer marks this manually in the participants screen. The urgency hook reads this field directly — it does not use `budget_info` AsyncStorage cache for guests.

---

## Part 5 — Full Account Parity

No additional work needed beyond what the wizard creates. The Supabase auth account is identical to an organizer account:
- Same `profiles` table row (via `handle_new_user()` trigger)
- Same access to event creation wizard
- Events tab: shows guest events + organizer events (query unchanged, badge added)
- `guest` role lives only in `event_participants.role` for a specific event

---

## DB Changes Required

One migration needed:

```sql
-- Add invited_via column to event_participants (nullable, no backfill needed)
ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS invited_via TEXT;
```

File: `supabase/migrations/20260313000000_event_participants_invited_via.sql`

All other tables and RLS policies are already in place.

---

## New / Modified Files

| File | Change |
|---|---|
| `app/invite/[code].tsx` | Full rewrite: multi-step wizard (Preview → Signup → Profile) |
| `app/event/[id]/index.tsx` | Hide 3 items for guests; show first-time contribution card |
| `app/event/[id]/participants.tsx` | Hide invite-sending UI for guests |
| `src/hooks/useUrgentPayment.ts` | Guest contribution path (no Stripe, reads `payment_status`) |
| `app/(tabs)/events/index.tsx` | Add "Guest" badge to event cards where role = guest |
| `supabase/migrations/20260313000000_event_participants_invited_via.sql` | Add `invited_via` column |

---

## Out of Scope
- In-app payment for guest contribution (guests pay organizer directly, organizer marks as paid)
- Push notifications for contribution reminder (Bell + Alert is sufficient for MVP)
- Guest ability to invite additional people to the event
