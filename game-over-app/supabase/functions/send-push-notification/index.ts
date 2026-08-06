/**
 * Send Push Notification Edge Function
 * Sends push notifications via Expo Push API.
 * Reads tokens from user_push_tokens and respects profiles.push_notifications_enabled.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Same limits the `enforce_notification_safety` trigger applies to the
// notifications table for non-service-role writers. A push carries the very
// same attacker-controllable text, so it gets the very same ceiling.
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 500;

// The functions here run without generated database types, so the client is the
// same untyped shape `createClient(url, key)` returns at the call site.
type ServiceClient = ReturnType<typeof createClient<any, 'public', any>>;

/**
 * Returns the subset of `recipientIds` the caller is allowed to notify.
 *
 * Mirrors the two INSERT policies on public.notifications:
 *  - "Participants can notify event organizer": caller participates in an event,
 *    recipient created it.
 *  - "Organizers can notify event guests": caller created an event, recipient is
 *    a participant of it with role 'guest'.
 *
 * Runs on the service-role client, so it sees the real relationships rather than
 * the caller's RLS-filtered view.
 */
async function resolveAuthorizedRecipients(
  supabase: ServiceClient,
  callerId: string,
  recipientIds: string[],
): Promise<Set<string>> {
  const allowed = new Set<string>();

  // Participant -> organizer.
  const { data: participations, error: participationsError } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('user_id', callerId);

  if (participationsError) {
    console.error('Failed to load caller participations:', participationsError);
    throw new Error('Failed to verify notification permissions');
  }

  const callerEventIds = (participations ?? []).map((p) => p.event_id);
  if (callerEventIds.length) {
    const { data: organizedEvents, error: organizedError } = await supabase
      .from('events')
      .select('created_by')
      .in('id', callerEventIds)
      .in('created_by', recipientIds);

    if (organizedError) {
      console.error('Failed to load organizers of caller events:', organizedError);
      throw new Error('Failed to verify notification permissions');
    }

    for (const event of organizedEvents ?? []) {
      allowed.add(event.created_by);
    }
  }

  // Organizer -> guest.
  const { data: ownedEvents, error: ownedError } = await supabase
    .from('events')
    .select('id')
    .eq('created_by', callerId);

  if (ownedError) {
    console.error('Failed to load caller events:', ownedError);
    throw new Error('Failed to verify notification permissions');
  }

  const ownedEventIds = (ownedEvents ?? []).map((e) => e.id);
  if (ownedEventIds.length) {
    const { data: guests, error: guestsError } = await supabase
      .from('event_participants')
      .select('user_id')
      .in('event_id', ownedEventIds)
      .eq('role', 'guest')
      .in('user_id', recipientIds);

    if (guestsError) {
      console.error('Failed to load guests of caller events:', guestsError);
      throw new Error('Failed to verify notification permissions');
    }

    for (const guest of guests ?? []) {
      allowed.add(guest.user_id);
    }
  }

  return allowed;
}

interface PushPayload {
  userIds: string[];
  notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: string;
    badge?: number;
    channelId?: string;
  };
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  channelId?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // null => the service role called us; it may notify anyone (cron jobs, webhooks).
  // A user id => every recipient has to be authorized against that caller below.
  let callerId: string | null = null;

  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    const token = authHeader.replace('Bearer ', '');
    const { createClient: createUserClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    // Pass the JWT explicitly to getUser(). With supabase-js v2, getUser() WITHOUT
    // an argument looks for a stored session (absent in an edge function) and fails
    // with "Auth session missing!" even for a valid token.
    const userSupabase = createUserClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: authData, error: authError } = await userSupabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    callerId = authData.user.id;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { userIds, notification }: PushPayload = await req.json();

    if (!userIds?.length || !notification?.title || !notification?.body) {
      throw new Error('userIds, notification.title, and notification.body are required');
    }

    const recipientIds = [...new Set(userIds)];

    if (callerId) {
      if (
        notification.title.length > MAX_TITLE_LENGTH ||
        notification.body.length > MAX_BODY_LENGTH
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `notification.title must be at most ${MAX_TITLE_LENGTH} and notification.body at most ${MAX_BODY_LENGTH} characters`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const allowedRecipients = await resolveAuthorizedRecipients(supabase, callerId, recipientIds);
      const forbidden = recipientIds.filter((id) => !allowedRecipients.has(id));

      // Reject the whole request instead of silently dropping recipients: a caller
      // that ends up here is either buggy or probing, and both deserve a hard no.
      if (forbidden.length) {
        console.warn(
          `Caller ${callerId} is not allowed to notify ${forbidden.length} of ${recipientIds.length} recipients`
        );
        return new Response(
          JSON.stringify({ success: false, error: 'Not allowed to notify these recipients' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    // Fetch push tokens for users who have notifications enabled
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('push_token, user_id')
      .in('user_id', recipientIds);

    if (tokensError) {
      console.error('Failed to fetch push tokens:', tokensError);
      throw new Error('Failed to fetch push tokens');
    }

    if (!tokens?.length) {
      console.log('No push tokens found for specified users');
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'no_tokens' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check which users have push notifications enabled
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, push_notifications_enabled')
      .in('id', recipientIds);

    const enabledUserIds = new Set(
      (profiles ?? [])
        .filter(p => p.push_notifications_enabled !== false)
        .map(p => p.id)
    );

    // Build Expo push messages
    const messages: ExpoPushMessage[] = tokens
      .filter(t => enabledUserIds.has(t.user_id))
      .map(t => ({
        to: t.push_token,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: notification.sound ?? 'default',
        badge: notification.badge,
        channelId: notification.channelId ?? 'default',
      }));

    if (!messages.length) {
      console.log('All target users have notifications disabled');
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'notifications_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send via Expo Push API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (expoAccessToken) {
      headers['Authorization'] = `Bearer ${expoAccessToken}`;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Expo Push API error:', response.status, errorBody);
      throw new Error(`Expo Push API ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    console.log(`Push notifications sent: ${messages.length}`, result);

    return new Response(
      JSON.stringify({ success: true, sent: messages.length, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
