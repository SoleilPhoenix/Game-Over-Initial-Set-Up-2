/**
 * Event refund repository.
 *
 * Database rows stay snake_case at the Supabase boundary while the rest of the
 * app consumes a small camelCase domain model.
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type EventRefundRow = Database['public']['Tables']['event_refunds']['Row'];
type EventRefundInsert = Database['public']['Tables']['event_refunds']['Insert'];
type EventRefundUpdate = Database['public']['Tables']['event_refunds']['Update'];

export type RefundStatus = 'pending' | 'received';

export interface EventRefund {
  id: string;
  eventId: string;
  createdBy: string;
  templateKey: string | null;
  description: string;
  amountCents: number;
  status: RefundStatus;
  expectedBy: string | null;
  receivedAt: string | null;
  lastReminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRefund {
  eventId: string;
  createdBy: string;
  templateKey?: string | null;
  description: string;
  amountCents: number;
  status?: RefundStatus;
  expectedBy?: string | null;
  receivedAt?: string | null;
}

export interface UpdateEventRefund {
  templateKey?: string | null;
  description?: string;
  amountCents?: number;
  status?: RefundStatus;
  expectedBy?: string | null;
  receivedAt?: string | null;
}

export function mapEventRefundRow(row: EventRefundRow): EventRefund {
  return {
    id: row.id,
    eventId: row.event_id,
    createdBy: row.created_by,
    templateKey: row.template_key,
    description: row.description,
    amountCents: row.amount_cents,
    status: row.status as RefundStatus,
    expectedBy: row.expected_by,
    receivedAt: row.received_at,
    lastReminderAt: row.last_reminder_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCreateEventRefund(refund: CreateEventRefund): EventRefundInsert {
  return {
    event_id: refund.eventId,
    created_by: refund.createdBy,
    template_key: refund.templateKey ?? null,
    description: refund.description,
    amount_cents: refund.amountCents,
    status: refund.status ?? 'pending',
    expected_by: refund.expectedBy ?? null,
    received_at: refund.receivedAt ?? null,
  };
}

function mapUpdateEventRefund(patch: UpdateEventRefund): EventRefundUpdate {
  const update: EventRefundUpdate = {};
  if ('templateKey' in patch) update.template_key = patch.templateKey ?? null;
  if ('description' in patch) update.description = patch.description;
  if ('amountCents' in patch) update.amount_cents = patch.amountCents;
  if ('status' in patch) update.status = patch.status;
  if ('expectedBy' in patch) update.expected_by = patch.expectedBy ?? null;
  if ('receivedAt' in patch) update.received_at = patch.receivedAt ?? null;
  return update;
}

export const refundsRepository = {
  async getByEventId(eventId: string): Promise<EventRefund[]> {
    const { data, error } = await supabase
      .from('event_refunds')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapEventRefundRow);
  },

  async create(refund: CreateEventRefund): Promise<EventRefund> {
    const { data, error } = await supabase
      .from('event_refunds')
      .insert(mapCreateEventRefund(refund))
      .select()
      .single();

    if (error) throw error;
    return mapEventRefundRow(data);
  },

  async createMany(refunds: CreateEventRefund[]): Promise<EventRefund[]> {
    if (refunds.length === 0) return [];
    const { data, error } = await supabase
      .from('event_refunds')
      .insert(refunds.map(mapCreateEventRefund))
      .select();

    if (error) throw error;
    return (data ?? []).map(mapEventRefundRow);
  },

  async update(id: string, patch: UpdateEventRefund): Promise<EventRefund> {
    const { data, error } = await supabase
      .from('event_refunds')
      .update(mapUpdateEventRefund(patch))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapEventRefundRow(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('event_refunds')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
