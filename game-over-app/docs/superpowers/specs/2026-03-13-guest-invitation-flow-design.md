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
New route: `app/invite/[code].tsx` expands from the current simple accept screen into a multi-step wizard. The invite code is preserved in state throughout all steps.

### Step 1 — Event Preview
**Purpose:** Show the guest what they're joining before asking them to create an account.

**Content:**
- Hero image (city + package image of the booked event)
- Event name (e.g. "Sophie's Bachelorette")
- Date + city
- "Invited by [Organizer name]"
- Guest count already joined (e.g. "8 guests already in")
- Primary CTA: "Accept Invitation →"

**Logic:**
- Unauthenticated users: show preview, then on CTA tap → go to Step 2
- Already authenticated users: skip Steps 2–3, go directly to accept → event

### Step 2 — Account Creation
**Purpose:** Standard registration, identical validation to organizer signup.

**Fields:**
- First name + Last name (required)
- Email (pre-filled from invite if sent via email, editable)
- Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
- Confirm password

**Behaviour:**
- If email already has an account → show "Already have an account? Log in" link, redirect to login with `?redirect=/invite/{code}`
- On success: Supabase `signUp()` with `full_name` in user metadata → triggers `handle_new_user()` DB trigger (creates `profiles` row)

### Step 3 — Profile Completion
**Purpose:** Collect phone number and optional profile photo.

**Fields:**
- Phone number (required, E.164 format, +49 prefix pre-selected)
- Profile photo (optional, camera or gallery picker)

**Behaviour:**
- "Skip photo" link visible
- On "Continue": saves phone + avatar_url to `profiles` table
- On complete: accept invite (insert into `event_participants` with `role: 'guest'`, `invited_via: 'link'`) → navigate to event

### Navigation guards
- Back button on Steps 2–3 returns to previous step (not out of wizard)
- Pressing hardware back on Step 1 closes the wizard (user declined)
- Wizard state held in local component state (no Zustand store needed)

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
| Chat — create channels | ✅ | ✅ |
| Chat — join channels | ✅ | ✅ |
| Polls — create | ✅ | ✅ |
| Polls — vote | ✅ | ✅ |
| Own payment tab | ✅ | ✅ |

### Implementation approach
- Extend existing `isOrganizer` boolean checks in event screens to also check `isGuest`
- Most screens already have role-aware logic — only need to add hide conditions for the three items above

---

## Part 4 — Contribution Reminder

### First-time welcome card
- Shown **once** after the wizard completes, on the event screen
- Persisted via AsyncStorage key: `gameover:contribution_seen:{eventId}:{userId}`
- Content:
  - Guest's contribution amount (€X)
  - Event name
  - Organizer name ("Please pay [Organizer]")
  - Due date reminder: "Due 14 days before the event"
  - Single dismiss button: "Got it"

### 14-day urgency notification
- Reuses existing `useUrgentPayment.ts` hook
- Current hook is organizer-centric (directs to Budget screen to pay Stripe)
- Extension needed: when current user is a `guest` on the event, show guest-specific message:
  - "Your contribution of €X for [Event] is due in [N] days — please transfer to [Organizer name]"
  - No Stripe payment link (guest pays organizer directly)
  - Bell dot on tabs as already implemented

---

## Part 5 — Full Account Parity

No additional work needed. The Supabase auth account created in Step 2 is identical to an organizer account:
- Same `profiles` table row (created by `handle_new_user()` trigger)
- Same access to event creation wizard
- Events tab shows: events where user is guest (invited) + events where user is organizer (created)
- The `guest` role lives only in `event_participants.role` for a specific event

---

## New Files

| File | Purpose |
|---|---|
| `app/invite/[code].tsx` | Expand existing file into multi-step wizard |

## Modified Files

| File | Change |
|---|---|
| `app/event/[id]/index.tsx` | Hide Manage Invitations, Edit Package, Booking Reference for guests |
| `app/event/[id]/participants.tsx` | Hide invite-sending UI for guests |
| `src/hooks/useUrgentPayment.ts` | Add guest-specific contribution reminder logic |
| `app/(tabs)/events/index.tsx` | Show both guest events and organizer events in the list |

## No DB Changes Required
All necessary tables and RLS policies are already in place.

---

## Out of Scope
- In-app payment for guest contribution (guests pay organizer directly)
- Push notifications for contribution reminder (Bell + Alert is sufficient for MVP)
- Guest ability to invite additional people to the event
