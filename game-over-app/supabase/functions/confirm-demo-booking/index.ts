/**
 * confirm-demo-booking Edge Function
 *
 * Settles the booking and marks its event as 'booked' using the service role so the
 * `enforce_event_status_integrity` DB trigger (which blocks clients from setting
 * status = 'booked') permits it. ONLY for the simulated/demo payment path — real
 * Stripe payments are confirmed by `stripe-webhook`.
 *
 * Guardrails: authenticated caller, must own the event, event must be
 * draft/planning, kill switch `DEMO_BOOKING_ENABLED='false'`. Idempotent.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { deriveDepositAmounts } from '../_shared/booking-payment.ts';

type PaymentKind = 'deposit' | 'full';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (Deno.env.get('DEMO_BOOKING_ENABLED') === 'false') {
    return json({ error: 'Demo booking is disabled. Complete a real payment to book this event.' }, 403);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization header' }, 401);
  }
  const token = authHeader.replace('Bearer ', '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // IMPORTANT: pass the JWT explicitly to getUser(). Calling getUser() with no
  // argument makes supabase-js look for a STORED session (which doesn't exist
  // server-side) and fail with "Auth session missing!" even for a valid token.
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return json({ error: 'Unauthorized. Please log out and log back in.', detail: authError?.message }, 401);
  }

  let eventId: string | undefined;
  let paymentKind: PaymentKind | undefined;
  try {
    const body = await req.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'Invalid request body' }, 400);
    }

    const requestBody = body as Record<string, unknown>;
    const unexpectedFields = Object.keys(requestBody).filter(
      (key) => key !== 'eventId' && key !== 'paymentKind',
    );
    if (unexpectedFields.length > 0) {
      return json({ error: `Unexpected request field '${unexpectedFields[0]}'` }, 400);
    }

    eventId = typeof requestBody.eventId === 'string' ? requestBody.eventId : undefined;
    paymentKind = requestBody.paymentKind === 'deposit' || requestBody.paymentKind === 'full'
      ? requestBody.paymentKind
      : undefined;
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (!eventId) return json({ error: 'eventId is required' }, 400);
  if (!paymentKind) return json({ error: "paymentKind must be 'deposit' or 'full'" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, created_by, status')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    return json({ error: 'Event not found' }, 404);
  }
  if (event.created_by !== user.id) {
    return json({ error: 'Forbidden' }, 403);
  }
  if (event.status === 'booked') {
    return json({ success: true, eventId, status: 'booked', alreadyBooked: true }, 200);
  }
  if (event.status !== 'draft' && event.status !== 'planning') {
    return json({ error: `Cannot book an event with status '${event.status}'.` }, 409);
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, total_amount_cents, deposit_paid_at, fully_paid_at')
    .eq('event_id', eventId)
    .single();

  if (bookingError || !booking) {
    return json({ error: 'Booking not found for event' }, 409);
  }

  const paidAt = booking.deposit_paid_at ?? new Date().toISOString();
  const paymentFields = paymentKind === 'deposit'
    ? {
        ...deriveDepositAmounts(booking.total_amount_cents),
        paymentStatus: 'processing' as const,
        fullyPaidAt: booking.fully_paid_at,
      }
    : {
        depositAmountCents: booking.total_amount_cents,
        remainingAmountCents: 0,
        paymentStatus: 'completed' as const,
        fullyPaidAt: booking.fully_paid_at ?? paidAt,
      };

  const { error: bookingUpdateError } = await supabase
    .from('bookings')
    .update({
      deposit_amount_cents: paymentFields.depositAmountCents,
      remaining_amount_cents: paymentFields.remainingAmountCents,
      deposit_paid_at: paidAt,
      fully_paid_at: paymentFields.fullyPaidAt,
      payment_status: paymentFields.paymentStatus,
    })
    .eq('id', booking.id);

  if (bookingUpdateError) {
    console.error('[confirm-demo-booking] booking update failed:', bookingUpdateError.message);
    return json({ error: 'Failed to settle booking', detail: bookingUpdateError.message }, 500);
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({ status: 'booked' })
    .eq('id', eventId);

  if (updateError) {
    console.error('[confirm-demo-booking] update failed:', updateError.message);
    return json({ error: 'Failed to mark event as booked', detail: updateError.message }, 500);
  }

  console.log(`[confirm-demo-booking] event=${eventId} booked by user=${user.id} payment=${paymentKind}`);
  return json({ success: true, eventId, status: 'booked', paymentKind }, 200);
});
