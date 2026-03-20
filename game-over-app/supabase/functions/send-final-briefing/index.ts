/**
 * send-final-briefing Edge Function
 *
 * Runs daily (via pg_cron or manual POST) to send a WhatsApp briefing to all
 * guests whose event is exactly 3 days away and whose briefing has not yet been sent.
 *
 * What it sends:
 *   - Event date, city, package tier, honoree name, booking reference
 *   - Sent to every guest_invitation row with a phone number for the event
 *   - Creates an in-app notification for the organizer afterward
 *   - Sets planning_checklist.final_briefing = true to prevent re-sending
 *
 * Required secrets (same as send-guest-invitations):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM  — e.g. "whatsapp:+14155238886"
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── WhatsApp sender (mirrors send-guest-invitations) ─────────

async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; error?: string; twilioCode?: number }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM');
  if (!sid || !token || !from) return { success: false, error: 'Twilio not configured' };

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
  return { success: false, error: err.message ?? `HTTP ${res.status}`, twilioCode: err.code };
}

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
  return { success: false, error: err.message ?? `HTTP ${res.status}` };
}

// ─── Build briefing message ───────────────────────────────────

function buildBriefingMessage(params: {
  guestFirstName: string;
  eventTitle: string;
  honoreeName: string;
  startDate: string;
  cityName: string;
  packageTier: string;
  bookingReference: string;
}): string {
  const { guestFirstName, eventTitle, honoreeName, startDate, cityName, packageTier, bookingReference } = params;
  const dateStr = new Date(startDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return [
    `🎉 *Final Briefing – ${eventTitle}*`,
    '',
    `Hey ${guestFirstName || 'there'}! In just *3 days* the party starts. Here are the most important details:`,
    '',
    `📅 *Date:* ${dateStr}`,
    `📍 *City:* ${cityName}`,
    `🎁 *Package:* ${packageTier}`,
    `🎊 *Celebrating:* ${honoreeName}`,
    `📋 *Booking ref:* ${bookingReference}`,
    '',
    `Be on time and get ready for an unforgettable experience! 🖤`,
    '',
    `– Game Over`,
  ].join('\n');
}

// ─── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // ── Find events starting in exactly 3 days whose briefing hasn't been sent ──
  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + 3);
  const targetDate = target.toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(`
      id, title, honoree_name, start_date, planning_checklist,
      city:cities(name),
      bookings(reference_number, id),
      event_participants(id, profile:profiles(id, full_name))
    `)
    .eq('status', 'booked')
    .gte('start_date', `${targetDate}T00:00:00`)
    .lt('start_date', `${targetDate}T23:59:59`);

  if (eventsError) {
    console.error('Error fetching events:', eventsError.message);
    return new Response(JSON.stringify({ error: eventsError.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ eventId: string; sent: number; failed: number; skipped: boolean }> = [];

  for (const event of (events ?? [])) {
    const checklist = (event.planning_checklist as Record<string, boolean> | null) ?? {};

    // Skip if already sent
    if (checklist.final_briefing === true) {
      results.push({ eventId: event.id, sent: 0, failed: 0, skipped: true });
      continue;
    }

    // Get booking reference
    const booking = Array.isArray(event.bookings) ? event.bookings[0] : event.bookings;
    const bookingRef = (booking as any)?.reference_number ?? 'GO-XXXXXX';

    // Derive package tier from booking or default
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('package:packages(tier, name)')
      .eq('event_id', event.id)
      .maybeSingle();
    const tier = (bookingData?.package as any)?.tier ?? 'classic';
    const tierLabel = tier === 'essential' ? 'Essential (S)' : tier === 'grand' ? 'Grand (L)' : 'Classic (M)';
    const cityName = (event.city as any)?.name ?? 'your city';

    // Fetch guests with phone numbers from guest_invitations table
    const { data: invitations } = await supabase
      .from('guest_invitations')
      .select('recipient_phone, recipient_name, recipient_first_name')
      .eq('event_id', event.id)
      .not('recipient_phone', 'is', null);

    let sent = 0;
    let failed = 0;

    for (const inv of (invitations ?? [])) {
      const phone = inv.recipient_phone as string | null;
      if (!phone) continue;

      const firstName = (inv.recipient_first_name || inv.recipient_name || '').split(' ')[0] || 'there';
      const message = buildBriefingMessage({
        guestFirstName: firstName,
        eventTitle: event.title || `${event.honoree_name}'s Party`,
        honoreeName: event.honoree_name || 'the honoree',
        startDate: event.start_date!,
        cityName,
        packageTier: tierLabel,
        bookingReference: bookingRef,
      });

      let result = await sendWhatsApp(phone, message);
      // 63016 = outside 24h session window, 63007 = number not registered on WhatsApp
      // Both are permanent WhatsApp failures — fall back to SMS automatically
      if (!result.success && (result.twilioCode === 63016 || result.twilioCode === 63007)) {
        console.log(`WhatsApp code=${result.twilioCode} for ${phone} — falling back to SMS`);
        result = await sendSMS(phone, message);
      }
      if (result.success) {
        sent++;
      } else {
        failed++;
        console.error(`Send failed for ${phone}: ${result.error}`);
      }
    }

    // Mark briefing as sent in planning_checklist
    if (sent > 0 || (invitations?.length ?? 0) === 0) {
      await supabase
        .from('events')
        .update({ planning_checklist: { ...checklist, final_briefing: true } })
        .eq('id', event.id);

      // Create in-app notification for the organizer
      const organizerParticipant = Array.isArray(event.event_participants)
        ? event.event_participants.find((p: any) => p.role === 'organizer' || !p.role)
        : null;
      const organizerProfileId = (organizerParticipant as any)?.profile?.id;

      if (organizerProfileId) {
        await supabase.from('notifications').insert({
          user_id: organizerProfileId,
          type: 'briefing_sent',
          title: '📋 Final Briefing Sent',
          body: `The 3-day briefing for "${event.title || `${event.honoree_name}'s Party`}" has been sent to ${sent} guest${sent !== 1 ? 's' : ''} via WhatsApp.`,
          data: { eventId: event.id },
        }).catch(() => {/* notifications table may not exist */});
      }
    }

    results.push({ eventId: event.id, sent, failed, skipped: false });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  } catch (error) {
    console.error('[send-final-briefing] Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
