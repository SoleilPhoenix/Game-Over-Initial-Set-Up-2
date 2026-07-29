/**
 * send-final-briefing Edge Function
 *
 * Runs daily (via pg_cron or manual POST) to send a WhatsApp briefing to all
 * guests whose event starts the next calendar day and whose briefing has not yet
 * been sent. The job fires at 09:00 UTC, so "24h before" in practice means
 * between ~23h and ~38h ahead depending on the event's start time.
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
import { sendWhatsApp } from '../_shared/twilio.ts';
import { sendEmail } from '../_shared/email.ts';
import { getFinalBriefingEmailHtml } from '../_shared/email-templates.ts';
import {
  buildBriefingMessage, buildBriefingSubject, partyLabel, partyTerm,
  type BriefingDetails, type PartyType,
} from '../_shared/briefing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Build briefing message ───────────────────────────────────

// Briefing copy lives in _shared/briefing.ts so it can be rendered for review
// without importing this module (which would start the server).

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

  // ── Find events starting tomorrow whose briefing hasn't been sent ──
  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + 1);
  const targetDate = target.toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(`
      id, title, honoree_name, start_date, planning_checklist, created_by, party_type,
      city:cities(name),
      bookings(reference_number, id)
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

  const results: Array<{
    eventId: string; sent: number; failed: number; skipped: boolean; error?: string;
  }> = [];

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

    // invite_codes is the guest list: one row per guest, carrying the name and
    // both contact details. guest_invitations is only a per-attempt SEND LOG —
    // pressing "send invitations" twice appends a second row per guest, so
    // iterating it would brief everyone twice.
    const { data: guests, error: guestsError } = await supabase
      .from('invite_codes')
      .select('code, guest_first_name, guest_email, guest_phone, claimed_by')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .is('declined_at', null);

    // Never swallow this. A failed lookup used to read as "no guests", which then
    // satisfied the completion check below and flagged the briefing as done
    // without sending anything — permanently, because the flag is never reset.
    if (guestsError) {
      console.error(
        `[send-final-briefing] Guest lookup failed for event ${event.id}: ${guestsError.message}`
      );
      results.push({
        eventId: event.id, sent: 0, failed: 0, skipped: false, error: guestsError.message,
      });
      continue;
    }

    // Which channel each guest was actually invited on. Latest log row wins.
    const { data: sendLog } = await supabase
      .from('guest_invitations')
      .select('invite_code, channel, created_at')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true });

    const channelByCode = new Map<string, string>();
    for (const row of (sendLog ?? [])) {
      if (row.invite_code) channelByCode.set(row.invite_code as string, row.channel as string);
    }

    // Guests who redeemed their code have a real, verified address in their profile.
    // The organizer only ever typed a best guess into invite_codes.guest_email, and the
    // two can differ — so prefer the profile once we know who claimed the code.
    const claimedIds = (guests ?? [])
      .map((g) => g.claimed_by as string | null)
      .filter((id): id is string => !!id);

    const profileByUserId = new Map<string, { email: string | null; full_name: string | null }>();
    if (claimedIds.length > 0) {
      const { data: claimers } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', claimedIds);
      for (const c of (claimers ?? [])) {
        profileByUserId.set(c.id as string, {
          email: c.email as string | null,
          full_name: c.full_name as string | null,
        });
      }
    }

    // Organizer's app language drives the copy for the whole event; guests have
    // no language of their own. Same convention as the guest invite email.
    const { data: organizer } = await supabase
      .from('profiles')
      .select('language, email, full_name, email_notifications_enabled')
      .eq('id', event.created_by)
      .maybeSingle();
    const language: 'de' | 'en' = organizer?.language === 'de' ? 'de' : 'en';

    const honoree = event.honoree_name || 'the honoree';
    const type = event.party_type as PartyType;

    const briefing: BriefingDetails = {
      partyLabel: partyLabel(honoree, type, language),
      partyTerm: partyTerm(type, language),
      honoreeName: honoree,
      dateStr: new Date(event.start_date!).toLocaleDateString(
        language === 'de' ? 'de-DE' : 'en-US',
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
      ),
      cityName,
      packageTier: tierLabel,
      bookingReference: bookingRef,
      eventUrl: `https://game-over.app/event/${event.id}`,
      language,
    };

    let sent = 0;
    let failed = 0;

    for (const guest of (guests ?? [])) {
      const claimer = guest.claimed_by ? profileByUserId.get(guest.claimed_by as string) : undefined;

      // Names are typed by hand in the app, so they arrive with stray whitespace.
      const invitedFirstName = ((guest.guest_first_name as string | null) ?? '').trim();
      const profileFirstName = (claimer?.full_name ?? '').trim().split(/\s+/)[0] ?? '';
      const firstName = (profileFirstName || invitedFirstName) || undefined;

      // Verified profile address beats the address the organizer typed.
      const email = (claimer?.email ?? guest.guest_email as string | null)?.trim() || null;
      const phone = (guest.guest_phone as string | null)?.trim() || null;

      // Brief on the channel the guest was invited on; fall back to whatever
      // contact detail exists if this guest predates the send log.
      const invitedOn = channelByCode.get(guest.code as string);
      const useEmail = invitedOn === 'email' ? !!email : invitedOn === 'whatsapp' ? false : !!email;
      const target = useEmail ? email : phone;
      if (!target) continue;

      const result = useEmail
        ? await sendEmail({
            to: target,
            subject: buildBriefingSubject(briefing),
            html: getFinalBriefingEmailHtml({ ...briefing, guestFirstName: firstName }),
          })
        : await sendWhatsApp(target, buildBriefingMessage(briefing, firstName));

      if (result.success) {
        sent++;
      } else {
        failed++;
        console.error(
          `[send-final-briefing] ${useEmail ? 'email' : 'whatsapp'} send failed for code ${guest.code}: ${result.error}`
        );
      }
    }

    // The organizer gets the same briefing as a reminder. Counted separately so a
    // failure here cannot make it look like guests were reached, and vice versa.
    const organizerEmail = (organizer?.email as string | null)?.trim() || null;
    if (organizerEmail && organizer?.email_notifications_enabled !== false) {
      const organizerFirstName =
        ((organizer?.full_name as string | null) ?? '').trim().split(' ')[0] || undefined;

      const organizerResult = await sendEmail({
        to: organizerEmail,
        subject: buildBriefingSubject(briefing),
        html: getFinalBriefingEmailHtml({
          ...briefing, guestFirstName: organizerFirstName, isOrganizer: true,
        }),
      });
      if (!organizerResult.success) {
        console.error(`[send-final-briefing] Organizer reminder failed: ${organizerResult.error}`);
      }
    }

    // Only flag the briefing as done once something actually went out. If every
    // send failed, the flag stays open so the next daily run retries it and the
    // cron watchdog can still surface the failure.
    if (sent > 0) {
      await supabase
        .from('events')
        .update({ planning_checklist: { ...checklist, final_briefing: true } })
        .eq('id', event.id);

      // In-app notification for the organizer. events.created_by is the organizer
      // by definition; the previous lookup read `role` off a select that never
      // fetched it, so it silently picked whichever participant came back first.
      const organizerId = event.created_by as string | null;

      if (organizerId) {
        const { error: notifyError } = await supabase.from('notifications').insert({
          user_id: organizerId,
          event_id: event.id,
          type: 'briefing_sent',
          title: '📋 Final Briefing Sent',
          body: `The 24-hour briefing for "${briefing.partyLabel}" has been sent to ${sent} guest${sent !== 1 ? 's' : ''}.`,
          action_url: `/event/${event.id}`,
          // Column is `metadata`, not `data`. Writing to `data` failed on every
          // call, and the discarded result meant nobody ever found out.
          metadata: { eventId: event.id, sentCount: sent, failedCount: failed },
        });
        if (notifyError) {
          console.error(`[send-final-briefing] Organizer notification failed: ${notifyError.message}`);
        }
      }
    }

    results.push({ eventId: event.id, sent, failed, skipped: false });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[send-final-briefing] Unhandled error:', message);
    return new Response(JSON.stringify({ error: 'Internal server error', detail: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
