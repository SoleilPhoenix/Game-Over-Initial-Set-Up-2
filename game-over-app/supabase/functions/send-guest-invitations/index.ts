/**
 * send-guest-invitations Edge Function
 *
 * Sends event invitations from Game Over's own platform accounts.
 * Supports three channels: email (SendGrid), SMS (Twilio), WhatsApp (Twilio).
 *
 * Flow per guest slot:
 *  1. Validate contact (SendGrid Email Validation or Twilio Lookup)
 *  2. Generate unique invite code (30-day expiry)
 *  3. Send via Twilio / SendGrid
 *  4. Record result in guest_invitations table
 *
 * Required Supabase secrets:
 *   SENDGRID_API_KEY      — Twilio SendGrid full-access key
 *   TWILIO_ACCOUNT_SID    — Twilio account SID
 *   TWILIO_AUTH_TOKEN     — Twilio auth token
 *   TWILIO_SMS_FROM       — e.g. "GameOver" (alphanumeric sender ID)
 *   TWILIO_WHATSAPP_FROM  — e.g. "whatsapp:+49..." (WhatsApp Business number)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email.ts';
import { getGuestInviteEmailHtml } from '../_shared/email-templates.ts';
import { sendWhatsApp } from '../_shared/twilio.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ───────────────────────────────────────────────────

type Channel = 'email' | 'whatsapp';
type SendStatus = 'sent' | 'failed' | 'invalid';

interface GuestSlot {
  slotIndex: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface GuestResult {
  slotIndex: number;
  status: SendStatus;
  recipient: string;  // masked
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}**@${domain}`;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 5)}***`;
}

/** Normalise to E.164: keep leading + and digits only, strip spaces/dashes/parens.
 *  Numbers starting with 0 are treated as German (+49) local format: 0177... → +49177...
 *  Numbers already starting with + are kept as-is.
 */
function normalisePhone(phone: string): string {
  const stripped = phone.replace(/[^\d+]/g, '');
  if (stripped.startsWith('+')) return stripped;
  // German local format: leading 0 → replace with +49
  if (stripped.startsWith('0')) return `+49${stripped.slice(1)}`;
  // Assume already international without + prefix
  return `+${stripped}`;
}

function generateCode(): string {
  // 8-char alphanumeric code, URL-safe
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 8);
}

// ─── Validation ───────────────────────────────────────────────

async function validateEmail(email: string): Promise<{ valid: boolean; reason?: string }> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!apiKey) return { valid: true }; // skip validation if no key

  try {
    const res = await fetch('https://api.sendgrid.com/v3/validations/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, source: 'game-over-invite' }),
    });
    if (!res.ok) return { valid: true }; // fail open — don't block on API error
    const data = await res.json();
    const verdict: string = data.result?.verdict ?? 'Valid';
    if (verdict === 'Invalid') return { valid: false, reason: 'invalid email address' };
    return { valid: true };
  } catch {
    return { valid: true }; // fail open
  }
}

async function validatePhone(phone: string): Promise<{ valid: boolean; reason?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!sid || !token) return { valid: true }; // skip if no credentials

  try {
    const encoded = encodeURIComponent(phone);
    const res = await fetch(
      `https://lookups.twilio.com/v2/PhoneNumbers/${encoded}?Fields=line_type_intelligence`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
        },
      }
    );
    if (!res.ok) return { valid: true }; // fail open
    const data = await res.json();
    const lineType: string = data.line_type_intelligence?.type ?? 'mobile';
    if (lineType === 'landline' || lineType === 'voip') {
      return { valid: false, reason: `${lineType} number — cannot receive SMS/WhatsApp` };
    }
    return { valid: true };
  } catch {
    return { valid: true }; // fail open
  }
}

// ─── Main handler ─────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth verification
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userToken = authHeader.replace('Bearer ', '');
  // Pass the JWT explicitly to getUser(). With supabase-js v2, getUser() WITHOUT
  // an argument looks for a stored session (absent in an edge function) and fails
  // with "Auth session missing!" even for a valid token — the global-header
  // pattern does NOT feed getUser(). This was the cause of every 401 here.
  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data: { user }, error: authError } = await userSupabase.auth.getUser(userToken);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Parse & validate request (parse body once — req.json() consumes the stream) ──
    const { eventId, channel, guests: guestsRaw } = await req.json() as {
      eventId: string;
      channel: Channel;
      guests: GuestSlot[];
    };

    if (!eventId || !channel) {
      return new Response(
        JSON.stringify({ error: 'eventId and channel are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (!['email', 'whatsapp'].includes(channel)) {
      return new Response(
        JSON.stringify({ error: 'channel must be email or whatsapp' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ── Ownership check ──
    const { data: eventCheck, error: eventCheckError } = await supabase
      .from('events')
      .select('id, created_by')
      .eq('id', eventId)
      .single();
    if (eventCheckError || !eventCheck) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (eventCheck.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Batch size guard ──
    const MAX_GUESTS_PER_CALL = 50;
    if ((guestsRaw ?? []).length > MAX_GUESTS_PER_CALL) {
      return new Response(JSON.stringify({ error: `Too many guests. Maximum ${MAX_GUESTS_PER_CALL} per call.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch event details ──
    // NOTE: events.created_by → auth.users (NOT profiles), so PostgREST cannot
    // resolve a profiles:created_by(...) join. Two separate queries required.
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, honoree_name, created_by, party_type, start_date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('[fetch event]', eventError?.message ?? 'not found', 'id=', eventId);
      return new Response(
        JSON.stringify({ error: 'Event not found', detail: eventError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch organizer's full name — auth user metadata is always up to date,
    // profiles.full_name may lag if user hasn't saved since last update.
    const { data: authUserData } = await supabase.auth.admin.getUserById(event.created_by);
    const authFullName: string = authUserData?.user?.user_metadata?.full_name ?? '';

    // Fall back to profiles table if auth metadata is empty
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', event.created_by)
      .single();

    const organizerName: string = authFullName || profile?.full_name || 'Your friend';
    const honoreeName: string = event.honoree_name ?? 'the guest of honour';
    const partyTypeLabel: string = event.party_type === 'bachelorette' ? 'Bachelorette Party' : 'Bachelor Party';

    // ── Guests were already parsed from the request body above ──
    const guests: GuestSlot[] = guestsRaw ?? [];

    if (guests.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No guests provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ── Filter to guests with contact for this channel ──
    const eligible = guests.filter(g =>
      channel === 'email' ? !!g.email : !!g.phone
    );

    if (eligible.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0, failed: 0, invalid: 0,
          results: [],
          message: `No guests have ${channel === 'email' ? 'email addresses' : 'phone numbers'} entered.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ── Process each guest ──
    const results: GuestResult[] = [];
    let sentCount = 0;
    let failedCount = 0;
    let invalidCount = 0;

    for (const guest of eligible) {
      const rawContact = channel === 'email' ? guest.email! : guest.phone!;
      // Normalise phone numbers to E.164 (strip spaces, dashes, parentheses)
      const contact = channel === 'email' ? rawContact : normalisePhone(rawContact);

      // 1. Validate
      let validation: { valid: boolean; reason?: string };
      if (channel === 'email') {
        validation = await validateEmail(contact);
      } else {
        validation = await validatePhone(contact);
      }

      if (!validation.valid) {
        invalidCount++;
        results.push({
          slotIndex: guest.slotIndex,
          status: 'invalid',
          recipient: channel === 'email' ? maskEmail(contact) : maskPhone(contact),
          error: validation.reason,
        });
        // Non-blocking — record failure but don't crash if table is unavailable
        supabase.from('guest_invitations').insert({
          event_id: eventId,
          slot_index: guest.slotIndex,
          channel,
          recipient: contact,
          status: 'invalid',
          error: validation.reason,
        }).then(({ error }) => {
          if (error) console.warn('[guest_invitations] insert failed (invalid):', error.message);
        });
        continue;
      }

      // 2. Reuse the guest's existing active invite code for this event if one
      //    exists — a person keeps ONE personal code until the event. Re-invites
      //    and reminders must NOT mint a new code each time. Match on the guest's
      //    email OR phone so either channel resolves to the same person.
      const emailKey = (channel === 'email' ? contact : (guest.email ?? '')).toLowerCase();
      const phoneKey = channel !== 'email' ? contact : (guest.phone ? normalisePhone(guest.phone) : '');

      // Keep the code valid until the day after the event (fallback: 30 days out).
      const eventStart = event.start_date ? new Date(event.start_date) : null;
      const expiresAt = (eventStart && eventStart.getTime() > Date.now()
        ? new Date(eventStart.getTime() + 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ).toISOString();

      const { data: eventCodes } = await supabase
        .from('invite_codes')
        .select('id, code, guest_email, guest_phone')
        .eq('event_id', eventId)
        .eq('is_active', true);

      const existing = (eventCodes ?? []).find((c) =>
        (emailKey && (c.guest_email ?? '').toLowerCase() === emailKey) ||
        (phoneKey && (c.guest_phone ?? '') === phoneKey)
      );

      let code: string;
      if (existing?.code) {
        // Same code — just refresh contact details and keep it alive until the event.
        code = existing.code;
        const { error: codeUpdateError } = await supabase.from('invite_codes').update({
          expires_at: expiresAt,
          guest_first_name: guest.firstName ?? null,
          guest_last_name: guest.lastName ?? null,
          guest_email: channel === 'email' ? contact : (guest.email ?? null),
          guest_phone: channel !== 'email' ? contact : (guest.phone ?? null),
        }).eq('id', existing.id);
        if (codeUpdateError) {
          console.error('[invite_codes] reuse update failed:', codeUpdateError.message, 'code=', code);
        }
      } else {
        code = generateCode();
        const { error: codeInsertError } = await supabase.from('invite_codes').insert({
          event_id: eventId,
          code,
          created_by: event.created_by,  // organizer's user id — required NOT NULL field
          max_uses: 1,
          expires_at: expiresAt,
          guest_first_name: guest.firstName ?? null,
          guest_last_name: guest.lastName ?? null,
          guest_email: channel === 'email' ? contact : (guest.email ?? null),
          guest_phone: channel !== 'email' ? contact : (guest.phone ?? null),
        });
        if (codeInsertError) {
          console.error('[invite_codes] insert failed:', codeInsertError.message, 'code=', code);
          // Non-critical for sending the message, but log clearly
        }
      }
      const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://game-over.app';
      const inviteUrl = `${appBaseUrl}/invite/${code}`;

      // 3. Build message body
      // Link-first: the tappable invite URL is the primary CTA on every channel
      // (same link the email uses). On a phone it opens the app directly via the
      // universal/app link and lands the guest on the invite wizard; in a browser
      // it shows the invite preview with an "Open in app" / store fallback.
      // The invite code is kept only as a manual fallback if the link can't be tapped.
      const guestName = guest.firstName ?? '';
      const greeting = guestName ? `${guestName}, you're` : `You're`;
      const messageBody =
        `🎉 ${greeting} invited to ${honoreeName}'s ${partyTypeLabel}!\n\n` +
        `${organizerName} is planning the celebration on Game Over 🥂\n\n` +
        `👉 Tap to join:\n${inviteUrl}\n\n` +
        `The link takes you straight to your invite — just create your account and you're in. ` +
        `Everything in one place: plans, group chat, polls & payments.\n\n` +
        `If you're asked for it, your invite code is: ${code}\n\n` +
        `Reply STOP to opt out.`;

      // 4. Send — only Email (SendGrid) and WhatsApp (Twilio) are supported channels.
      // Regular SMS has been intentionally removed as a channel; a failed WhatsApp send
      // is reported back so the organizer can retry or invite via email instead.
      let sendResult: { success: boolean; error?: string; twilioCode?: number };

      if (channel === 'email') {
        const html = getGuestInviteEmailHtml({
          organizerName,
          honoreeName,
          inviteUrl,
          guestFirstName: guest.firstName,
          inviteCode: code,
        });
        const subject = `You're invited to ${honoreeName}'s ${partyTypeLabel}! 🎉`;
        sendResult = await sendEmail({ to: contact, subject, html });

      } else {
        // WhatsApp
        sendResult = await sendWhatsApp(contact, messageBody);
      }

      // 5. Record result
      const status: SendStatus = sendResult.success ? 'sent' : 'failed';
      if (sendResult.success) sentCount++; else failedCount++;

      results.push({
        slotIndex: guest.slotIndex,
        status,
        recipient: channel === 'email' ? maskEmail(contact) : maskPhone(contact),
        error: sendResult.error,
      });

      // Non-blocking — record send result but don't crash if table is unavailable
      supabase.from('guest_invitations').insert({
        event_id: eventId,
        slot_index: guest.slotIndex,
        channel,
        recipient: contact,
        status,
        error: sendResult.error ?? null,
        invite_code: code,
      }).then(({ error }) => {
        if (error) console.warn('[guest_invitations] insert failed (sent):', error.message);
      });

      console.log(`[${channel}] slot=${guest.slotIndex} status=${status}`);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failedCount, invalid: invalidCount, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('send-guest-invitations error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
