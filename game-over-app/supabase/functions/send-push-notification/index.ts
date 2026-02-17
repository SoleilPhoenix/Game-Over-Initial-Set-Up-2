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

    // Fetch push tokens for users who have notifications enabled
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('push_token, user_id')
      .in('user_id', userIds);

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
      .in('id', userIds);

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
