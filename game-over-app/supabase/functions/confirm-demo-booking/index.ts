/**
 * confirm-demo-booking Edge Function
 *
 * Marks an event as 'booked' using the service role so the
 * `enforce_event_status_integrity` DB trigger (which blocks clients from setting
 * status = 'booked') permits it. ONLY for the simulated/demo payment path — real
 * Stripe payments are confirmed by `stripe-webhook`.
 *
 * Guardrails: authenticated caller, must own the event, event must be
 * draft/planning, kill switch `DEMO_BOOKING_ENABLED='false'`. Idempotent.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
  try {
    const body = await req.json() as { eventId?: string };
    eventId = body.eventId;
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (!eventId) return json({ error: 'eventId is required' }, 400);

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

  const { error: updateError } = await supabase
    .from('events')
    .update({ status: 'booked' })
    .eq('id', eventId);

  if (updateError) {
    console.error('[confirm-demo-booking] update failed:', updateError.message);
    return json({ error: 'Failed to mark event as booked', detail: updateError.message }, 500);
  }

  console.log(`[confirm-demo-booking] event=${eventId} booked by user=${user.id}`);
  return json({ success: true, eventId, status: 'booked' }, 200);
});
