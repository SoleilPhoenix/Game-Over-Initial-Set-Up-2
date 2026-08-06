/**
 * Data access for the event's extra-cost ledger.
 *
 * Extra costs intentionally stay separate from bookings and package pricing.
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type EventExpenseRow = Database['public']['Tables']['event_expenses']['Row'];
type EventExpenseInsert = Database['public']['Tables']['event_expenses']['Insert'];
type EventExpenseUpdate = Database['public']['Tables']['event_expenses']['Update'];
type EventExpenseShareRow = Database['public']['Tables']['event_expense_shares']['Row'];
type EventExpenseShareInsert = Database['public']['Tables']['event_expense_shares']['Insert'];
type EventExpenseReportRow = Database['public']['Tables']['event_expense_reports']['Row'];
type EventExpenseReportInsert = Database['public']['Tables']['event_expense_reports']['Insert'];

export interface EventExpenseShare {
  id: string;
  expenseId: string;
  userId: string;
  amountCents: number;
  settledAt: string | null;
  createdAt: string;
}

export interface EventExpense {
  id: string;
  eventId: string;
  createdBy: string | null;
  paidBy: string | null;
  title: string;
  categoryKey: string | null;
  amountCents: number;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  shares: EventExpenseShare[];
  openReportCount: number;
}

export interface EventExpenseReport {
  id: string;
  expenseId: string;
  reportedBy: string;
  reason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface CreateEventExpense {
  id?: string;
  eventId: string;
  createdBy: string;
  paidBy?: string | null;
  title: string;
  categoryKey?: string | null;
  amountCents: number;
  occurredAt?: string;
}

export interface UpdateEventExpense {
  paidBy?: string | null;
  title?: string;
  categoryKey?: string | null;
  amountCents?: number;
  occurredAt?: string;
}

export interface ExpenseShareInput {
  userId: string;
  amountCents: number;
}

export interface ReportEventExpense {
  expenseId: string;
  reportedBy: string;
  reason?: string | null;
}

interface ExpenseRowWithShares extends EventExpenseRow {
  shares: EventExpenseShareRow[] | null;
}

function assertPositiveCents(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Expense amounts must be positive integer cents');
  }
}

export function mapEventExpenseShareRow(row: EventExpenseShareRow): EventExpenseShare {
  return {
    id: row.id,
    expenseId: row.expense_id,
    userId: row.user_id,
    amountCents: row.amount_cents,
    settledAt: row.settled_at,
    createdAt: row.created_at,
  };
}

export function mapEventExpenseReportRow(row: EventExpenseReportRow): EventExpenseReport {
  return {
    id: row.id,
    expenseId: row.expense_id,
    reportedBy: row.reported_by,
    reason: row.reason,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

export function mapEventExpenseRow(
  row: EventExpenseRow,
  shares: EventExpenseShareRow[] = [],
  openReportCount = 0
): EventExpense {
  return {
    id: row.id,
    eventId: row.event_id,
    createdBy: row.created_by,
    paidBy: row.paid_by,
    title: row.title,
    categoryKey: row.category_key,
    amountCents: row.amount_cents,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shares: shares.map(mapEventExpenseShareRow),
    openReportCount,
  };
}

export function mapCreateEventExpense(expense: CreateEventExpense): EventExpenseInsert {
  assertPositiveCents(expense.amountCents);
  const row: EventExpenseInsert = {
    event_id: expense.eventId,
    created_by: expense.createdBy,
    paid_by: expense.paidBy ?? null,
    title: expense.title,
    category_key: expense.categoryKey ?? null,
    amount_cents: expense.amountCents,
  };
  if (expense.id) row.id = expense.id;
  if (expense.occurredAt) row.occurred_at = expense.occurredAt;
  return row;
}

function mapUpdateEventExpense(patch: UpdateEventExpense): EventExpenseUpdate {
  const update: EventExpenseUpdate = {};
  if ('paidBy' in patch) update.paid_by = patch.paidBy ?? null;
  if ('title' in patch) update.title = patch.title;
  if ('categoryKey' in patch) update.category_key = patch.categoryKey ?? null;
  if ('amountCents' in patch && patch.amountCents !== undefined) {
    assertPositiveCents(patch.amountCents);
    update.amount_cents = patch.amountCents;
  }
  if ('occurredAt' in patch) update.occurred_at = patch.occurredAt;
  return update;
}

async function getShareRowsByExpenseId(expenseId: string): Promise<EventExpenseShareRow[]> {
  const { data, error } = await supabase
    .from('event_expense_shares')
    .select('*')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function getSharesByExpenseId(expenseId: string): Promise<EventExpenseShare[]> {
  return (await getShareRowsByExpenseId(expenseId)).map(mapEventExpenseShareRow);
}

export const expensesRepository = {
  async getByEventId(eventId: string): Promise<EventExpense[]> {
    const { data, error } = await supabase
      .from('event_expenses')
      .select('*, shares:event_expense_shares(*)')
      .eq('event_id', eventId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;

    const expenses = (data ?? []) as ExpenseRowWithShares[];
    if (expenses.length === 0) return [];

    const expenseIds = expenses.map(expense => expense.id);
    const { data: openReports, error: reportsError } = await supabase
      .from('event_expense_reports')
      .select('expense_id')
      .in('expense_id', expenseIds)
      .is('resolved_at', null);

    if (reportsError) throw reportsError;

    const reportCounts = new Map<string, number>();
    for (const report of openReports ?? []) {
      reportCounts.set(report.expense_id, (reportCounts.get(report.expense_id) ?? 0) + 1);
    }

    return expenses.map(expense =>
      mapEventExpenseRow(
        expense,
        expense.shares ?? [],
        reportCounts.get(expense.id) ?? 0
      )
    );
  },

  async create(expense: CreateEventExpense): Promise<EventExpense> {
    const { data, error } = await supabase
      .from('event_expenses')
      .insert(mapCreateEventExpense(expense))
      .select()
      .single();

    if (error) throw error;
    return mapEventExpenseRow(data);
  },

  async update(id: string, patch: UpdateEventExpense): Promise<EventExpense> {
    const { data, error } = await supabase
      .from('event_expenses')
      .update(mapUpdateEventExpense(patch))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const shares = await getShareRowsByExpenseId(id);
    return mapEventExpenseRow(data, shares);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('event_expenses').delete().eq('id', id);
    if (error) throw error;
  },

  async setShares(expenseId: string, shares: ExpenseShareInput[]): Promise<EventExpenseShare[]> {
    const desiredByUser = new Map<string, ExpenseShareInput>();
    for (const share of shares) {
      assertPositiveCents(share.amountCents);
      desiredByUser.set(share.userId, share);
    }
    const desired = [...desiredByUser.values()];

    const { data: current, error: currentError } = await supabase
      .from('event_expense_shares')
      .select('user_id')
      .eq('expense_id', expenseId);
    if (currentError) throw currentError;

    if (desired.length > 0) {
      const rows: EventExpenseShareInsert[] = desired.map(share => ({
        expense_id: expenseId,
        user_id: share.userId,
        amount_cents: share.amountCents,
      }));
      const { error: upsertError } = await supabase
        .from('event_expense_shares')
        .upsert(rows, { onConflict: 'expense_id,user_id' });
      if (upsertError) throw upsertError;
    }

    const desiredUserIds = new Set(desired.map(share => share.userId));
    const removedUserIds = (current ?? [])
      .map(share => share.user_id)
      .filter(userId => !desiredUserIds.has(userId));
    if (removedUserIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('event_expense_shares')
        .delete()
        .eq('expense_id', expenseId)
        .in('user_id', removedUserIds);
      if (deleteError) throw deleteError;
    }

    return getSharesByExpenseId(expenseId);
  },

  async markOwnShareSettled(
    shareId: string,
    userId: string,
    settledAt = new Date().toISOString()
  ): Promise<EventExpenseShare> {
    const { data, error } = await supabase
      .from('event_expense_shares')
      .update({ settled_at: settledAt })
      .eq('id', shareId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapEventExpenseShareRow(data);
  },

  async reportExpense(report: ReportEventExpense): Promise<EventExpenseReport> {
    const row: EventExpenseReportInsert = {
      expense_id: report.expenseId,
      reported_by: report.reportedBy,
      reason: report.reason ?? null,
    };
    const { data, error } = await supabase
      .from('event_expense_reports')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return mapEventExpenseReportRow(data);
  },

  async resolveReport(
    reportId: string,
    resolvedBy: string,
    resolvedAt = new Date().toISOString()
  ): Promise<EventExpenseReport> {
    const { data, error } = await supabase
      .from('event_expense_reports')
      .update({ resolved_at: resolvedAt, resolved_by: resolvedBy })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return mapEventExpenseReportRow(data);
  },
};
