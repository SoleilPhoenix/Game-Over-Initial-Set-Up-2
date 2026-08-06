import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  canNotifyExpenseShares,
  deliverPendingExpenseShareNotifications,
  markMetadataPushed,
  type ExpenseShareNotification,
} from '../_shared/expense-share-push.ts';
import { jsonResponse, optionsResponse } from '../_shared/http.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseExpenseId(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'expenseId')) return null;

  return typeof record.expenseId === 'string' && UUID_PATTERN.test(record.expenseId)
    ? record.expenseId
    : null;
}

function asMetadata(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse(req, { success: false, error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(req, { success: false, error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Supabase configuration is missing');
    return jsonResponse(req, { success: false, error: 'Server configuration error' }, 500);
  }

  const token = authHeader.slice('Bearer '.length);
  const authClient = createClient(supabaseUrl, anonKey);
  // The token argument is required in edge functions: there is no stored auth
  // session for the no-argument getUser() overload to read.
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonResponse(req, { success: false, error: 'Unauthorized' }, 401);
  }

  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return jsonResponse(req, { success: false, error: 'expenseId is required' }, 400);
  }

  const expenseId = parseExpenseId(requestBody);
  if (!expenseId) {
    return jsonResponse(req, { success: false, error: 'expenseId is required' }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: expense, error: expenseError } = await serviceClient
      .from('event_expenses')
      .select('created_by, event_id')
      .eq('id', expenseId)
      .maybeSingle();

    if (expenseError) throw expenseError;
    if (!expense) {
      return jsonResponse(req, { success: false, error: 'Expense not found' }, 404);
    }

    const { data: event, error: eventError } = await serviceClient
      .from('events')
      .select('created_by')
      .eq('id', expense.event_id)
      .single();

    if (eventError) throw eventError;
    if (!canNotifyExpenseShares(authData.user.id, expense.created_by, event.created_by)) {
      return jsonResponse(req, { success: false, error: 'Forbidden' }, 403);
    }

    const pushed = await deliverPendingExpenseShareNotifications(
      async () => {
        const { data, error } = await serviceClient
          .from('notifications')
          .select('id, user_id, event_id, type, title, body, action_url, metadata')
          .eq('type', 'expense_share_assigned')
          .eq('event_id', expense.event_id)
          .eq('metadata->>expense_id', expenseId)
          .or('metadata->>pushed.is.null,metadata->>pushed.neq.true');

        if (error) throw error;
        return (data ?? []).map((notification) => ({
          ...notification,
          metadata: asMetadata(notification.metadata),
        })) as ExpenseShareNotification[];
      },
      async (notification) => {
        const pushResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userIds: [notification.user_id],
              notification: {
                title: notification.title,
                body: notification.body,
                data: {
                  ...(notification.metadata ?? {}),
                  action_url: notification.action_url,
                  event_id: notification.event_id,
                  type: notification.type,
                },
              },
            }),
          },
        );

        if (!pushResponse.ok) {
          const responseBody = await pushResponse.text();
          throw new Error(`send-push-notification failed (${pushResponse.status}): ${responseBody}`);
        }
      },
      async (notification) => {
        const { error } = await serviceClient
          .from('notifications')
          .update({ metadata: markMetadataPushed(notification.metadata) })
          .eq('id', notification.id);

        if (error) throw error;
      },
    );

    return jsonResponse(req, { success: true, pushed }, 200);
  } catch (error) {
    console.error('Expense share push failed:', error);
    return jsonResponse(req, { success: false, error: 'Failed to notify expense shares' }, 500);
  }
});
