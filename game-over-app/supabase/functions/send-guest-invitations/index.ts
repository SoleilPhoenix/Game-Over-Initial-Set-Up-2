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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ───────────────────────────────────────────────────

type Channel = 'email' | 'sms' | 'whatsapp';
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

/** Normalise to E.164: keep leading + and digits only, strip spaces/dashes/parens */
function normalisePhone(phone: string): string {
  const stripped = phone.replace(/[^\d+]/g, '');
  // Ensure only one leading + (in case input had none, assume international)
  return stripped.startsWith('+') ? stripped : `+${stripped}`;
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

// ─── Sending ──────────────────────────────────────────────────

async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_SMS_FROM') ?? 'GameOver';

  if (!sid || !token) return { success: false, error: 'Twilio not configured' };

  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (res.ok) return { success: true };
  const err = await res.json();
  return { success: false, error: err.message ?? `Twilio error ${res.status}` };
}

async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; error?: string; twilioCode?: number }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM');

  if (!sid || !token || !from) {
    return { success: false, error: 'WhatsApp not configured — TWILIO_WHATSAPP_FROM missing' };
  }

  // Normalise recipient to whatsapp: prefix
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const params = new URLSearchParams({ To: toFormatted, From: from, Body: body });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (res.ok) return { success: true };
  const err = await res.json();
  // Return Twilio error code so callers can handle specific cases (e.g. 63016 = outside 24h window)
  return { success: false, error: err.message ?? `Twilio WhatsApp error ${res.status}`, twilioCode: err.code };
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
  const { createClient: createUserClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
  const userSupabase = createUserClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${userToken}` } } }
  );
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
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
    if (!['email', 'sms', 'whatsapp'].includes(channel)) {
      return new Response(
        JSON.stringify({ error: 'channel must be email, sms, or whatsapp' }),
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
      .select('id, title, honoree_name, created_by, party_type')
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

      // 2. Generate unique invite code and store it (non-blocking)
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      supabase.from('invite_codes').insert({
        event_id: eventId,
        code,
        max_uses: 1,
        expires_at: expiresAt,
      }).then(({ error }) => {
        if (error) console.warn('[invite_codes] insert failed:', error.message);
      });
      const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://game-over.app';
      const inviteUrl = `${appBaseUrl}/invite/${code}`;

      // 3. Build message body
      const guestName = guest.firstName ?? '';
      const greeting = guestName ? `${guestName}, you're` : `You're`;
      const smsBody =
        `🎉 ${greeting} invited to ${honoreeName}'s ${partyTypeLabel}!\n\n` +
        `${organizerName} is organizing the ultimate celebration on "Game-Over.app" 🥂\n\n` +
        `Why join instead of endless back-and-forth coordination?\n` +
        `✅ Eliminates planning stress — simple, guided & stress-free\n` +
        `💰 Full budget transparency — zero hidden costs or awkward money talk\n` +
        `🤖 AI-curated experiences matched to what YOUR group actually wants\n` +
        `⚡ Everything in one place — plans, chat & payments, ready in minutes\n` +
        `🤝 Preserves your friendships — no coordination chaos after the event\n\n` +
        `Join & RSVP here:\n${inviteUrl}\n\n` +
        `Reply STOP to opt out.`;

      // 4. Send
      let sendResult: { success: boolean; error?: string; twilioCode?: number };
      let actualChannel: Channel = channel;

      if (channel === 'email') {
        const html = getGuestInviteEmailHtml({
          organizerName,
          honoreeName,
          inviteUrl,
          guestFirstName: guest.firstName,
        });
        const subject = `You're invited to ${honoreeName}'s ${partyTypeLabel}! 🎉`;
        sendResult = await sendEmail({ to: contact, subject, html });

      } else if (channel === 'sms') {
        sendResult = await sendSMS(contact, smsBody);

      } else {
        // WhatsApp
        sendResult = await sendWhatsApp(contact, smsBody);

        // Error 63016 = outside 24-hour session window (recipient hasn't messaged us recently).
        // Error 63007 = WhatsApp number not registered (common in sandbox testing).
        // Both are permanent WhatsApp failures — fall back to SMS automatically.
        if (!sendResult.success && (sendResult.twilioCode === 63016 || sendResult.twilioCode === 63007)) {
          console.log(`[whatsapp] code=${sendResult.twilioCode} — falling back to SMS for slot=${guest.slotIndex}`);
          sendResult = await sendSMS(contact, smsBody);
          actualChannel = 'sms';
        }
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
        channel: actualChannel,
        recipient: contact,
        status,
        error: sendResult.error ?? null,
        invite_code: code,
      }).then(({ error }) => {
        if (error) console.warn('[guest_invitations] insert failed (sent):', error.message);
      });

      console.log(`[${actualChannel}] slot=${guest.slotIndex} status=${status}`);
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
