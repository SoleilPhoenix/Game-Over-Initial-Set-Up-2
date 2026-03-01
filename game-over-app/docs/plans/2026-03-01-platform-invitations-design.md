# Platform Invitations Design
**Date:** 2026-03-01
**Status:** Approved — building

## Overview

Send event invitations from Game Over's own platform accounts (email, SMS, WhatsApp) rather than opening the device's native apps. Guests receive branded messages with a unique invite link that opens the app directly.

## Provider Stack

All three channels run through a single Twilio account:

| Channel  | Service               | Sender identity       | Cost/message |
|----------|-----------------------|-----------------------|-------------|
| Email    | Twilio SendGrid       | noreply@mail.game-over.app | ~$0.001 |
| SMS      | Twilio Programmable SMS | Alphanumeric: `GameOver` | ~$0.075 |
| WhatsApp | Twilio WhatsApp Business API | Game Over WhatsApp number | ~$0.05–0.08 |

No monthly number rental — SMS uses a free Alphanumeric Sender ID (no registration required for DE/AT/CH). WhatsApp uses the number provisioned during Meta Business Account setup.

## Validation Before Sending

- **Email** → SendGrid Email Validation API — checks domain exists, mailbox is real, risk score. Skips invalid addresses.
- **SMS / WhatsApp** → Twilio Lookup API — checks number is real and mobile (not landline). Skips invalid or landline numbers.

Cost: ~€0.005 per phone lookup, ~€0.01 per email validation.

## Database

### New table: `guest_invitations`

```sql
create table guest_invitations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  slot_index   int  not null,
  channel      text not null check (channel in ('email', 'sms', 'whatsapp')),
  recipient    text not null,
  status       text not null default 'pending'
                 check (status in ('pending','sent','failed','invalid')),
  error        text,
  invite_code  text,
  sent_at      timestamptz default now(),
  created_at   timestamptz default now()
);

-- RLS: organizer reads own event records
alter table guest_invitations enable row level security;
create policy "organizer reads own invitations"
  on guest_invitations for select
  using (
    event_id in (
      select id from events where created_by = auth.uid()
    )
  );
```

## Edge Function: `send-guest-invitations`

### Request

```
POST /functions/v1/send-guest-invitations
Authorization: Bearer <user-jwt>

{ "eventId": "uuid", "channel": "email" | "sms" | "whatsapp" }
```

### Internal flow per guest slot

```
1. Fetch event + guest slots from DB (service role key)
2. Filter: only slots with contact data for the chosen channel
3. For each guest:
   a. Validate contact (SendGrid validation API or Twilio Lookup)
   b. If invalid → record status='invalid', skip send
   c. Generate unique invite code (insert into invite_codes table, 30-day expiry)
   d. Build message with invite link: https://game-over.app/invite/{code}
   e. Send via Twilio/SendGrid API
   f. Record result in guest_invitations table
4. Return summary { sent, failed, invalid, results[] }
```

### Response

```json
{
  "sent": 3,
  "failed": 0,
  "invalid": 1,
  "results": [
    { "slotIndex": 1, "status": "sent",    "recipient": "an**@gmail.com" },
    { "slotIndex": 2, "status": "sent",    "recipient": "+4915x***" },
    { "slotIndex": 3, "status": "sent",    "recipient": "+4917x***" },
    { "slotIndex": 4, "status": "invalid", "recipient": "+4932x***", "error": "landline" }
  ]
}
```

Recipients are masked in the response — raw contact data stays server-side.

## Supabase Secrets Required

```
SENDGRID_API_KEY        — SendGrid full-access API key
TWILIO_ACCOUNT_SID      — from Twilio Console dashboard
TWILIO_AUTH_TOKEN       — from Twilio Console dashboard
TWILIO_SMS_FROM         — GameOver  (alphanumeric sender ID)
TWILIO_WHATSAPP_FROM    — whatsapp:+49...  (provisioned during Meta setup)
```

## App-Side UI Changes (`participants.tsx`)

The invite modal gains three states:

- **`idle`** — channel selector: [Email N guests] [SMS N guests] [WhatsApp N guests]
- **`sending`** — spinner with channel name and guest count
- **`done`** — per-guest result list with ✓ / ✗ / ⚠ badges + "Send another channel" button

New state variables:
```typescript
type InviteSendStatus = 'idle' | 'sending' | 'done';
const [inviteSendStatus, setInviteSendStatus] = useState<InviteSendStatus>('idle');
const [inviteResults, setInviteResults] = useState<GuestResult[]>([]);
const [activeChannel, setActiveChannel] = useState<'email'|'sms'|'whatsapp'|null>(null);
```

## WhatsApp Message Template

Template name: `game_over_event_invite`
Category: `UTILITY`

```
🎉 You're invited to celebrate {{1}}!

{{2}} is planning the ultimate party and wants you there.

Join the group on Game Over and RSVP here:
{{3}}

Reply STOP to opt out.
```

Variables: `{{1}}` = honoree name, `{{2}}` = organizer name, `{{3}}` = invite link.

## GDPR / Legal

- Phone numbers transmitted to Twilio solely for invitation delivery
- Deleted 90 days after event date (add DB retention job in Phase 2)
- Privacy Policy updated (EN + DE) with Twilio data processing disclosure
- SMS/WhatsApp messages include opt-out instruction ("Reply STOP")

## Build Order

1. DB migration (`guest_invitations` table)
2. Update `_shared/email.ts` — swap Resend → SendGrid
3. Add `getInviteEmailHtml` to `_shared/email-templates.ts`
4. Build `send-guest-invitations` edge function
5. Update `participants.tsx` invite modal UI

## Phase 2 (post-launch, see GO_LIVE_CHECKLIST.md)

- Delivery / read receipt webhooks (`twilio-status-webhook` function)
- Inbound SMS reply → auto-RSVP
- Twilio Verify for phone confirmation on guest sign-up
- 90-day data retention cron job
