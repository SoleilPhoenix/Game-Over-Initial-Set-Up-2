/**
 * check-invite-delivery Edge Function
 *
 * Polls Resend for recent email invitation delivery events. Successful and
 * delivered messages remain "sent"; only bounces and complaints are marked as
 * "bounced" so the organizer UI can surface a delivery failure.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_LOOKUPS = 25;
const LOOKUP_CONCURRENCY = 5;

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
    const { eventId } = await req.json() as { eventId: string };
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'eventId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .single();

    if (eventError || !event || event.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ checked: 0, bounced: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: invitations, error: invitationsError } = await supabase
      .from('guest_invitations')
      .select('id, provider_message_id')
      .eq('event_id', eventId)
      .eq('channel', 'email')
      .eq('status', 'sent')
      .not('provider_message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(MAX_LOOKUPS);

    if (invitationsError) {
      console.warn('[check-invite-delivery] invitation lookup failed:', invitationsError.message);
      return new Response(JSON.stringify({ checked: 0, bounced: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let checked = 0;
    let bounced = 0;
    let nextIndex = 0;
    const rows = invitations ?? [];

    const checkNext = async () => {
      while (nextIndex < rows.length) {
        const invitation = rows[nextIndex++];
        const providerMessageId = invitation.provider_message_id as string | null;
        if (!providerMessageId) continue;

        try {
          const response = await fetch(
            `https://api.resend.com/emails/${encodeURIComponent(providerMessageId)}`,
            {
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
              },
            },
          );
          if (!response.ok) continue;

          const data = await response.json() as { last_event?: string };
          checked++;
          if (data.last_event !== 'bounced' && data.last_event !== 'complained') continue;

          const { error: updateError } = await supabase
            .from('guest_invitations')
            .update({ status: 'bounced', error: data.last_event })
            .eq('id', invitation.id)
            .eq('status', 'sent');
          if (!updateError) bounced++;
        } catch {
          // Best effort: one Resend or database failure must not block other rows.
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(LOOKUP_CONCURRENCY, rows.length) },
        () => checkNext(),
      ),
    );

    return new Response(JSON.stringify({ checked, bounced }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('check-invite-delivery error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
