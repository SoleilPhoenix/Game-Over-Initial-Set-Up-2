/**
 * One-time migration of device-local extra costs into Supabase.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type EventExpenseInsert = Database['public']['Tables']['event_expenses']['Insert'];

const CUSTOM_CATEGORIES_KEY_PREFIX = 'gameover:custom_cats:';
const LEGACY_EXPENSES_KEY_PREFIX = 'gameover:expenses:';
const MIGRATION_STATE_KEY_PREFIX = 'gameover:expense_migration:v1:';

interface LegacyExpenseCandidate {
  amount?: unknown;
  amountCents?: unknown;
  categoryKey?: unknown;
  createdAt?: unknown;
  description?: unknown;
  occurredAt?: unknown;
  paidBy?: unknown;
  title?: unknown;
}

interface MigrationItemState {
  id: string;
  source: 'custom_cats' | 'expenses';
  sourceIndex: number;
}

interface ExpenseMigrationState {
  version: 1;
  completed: boolean;
  items: MigrationItemState[];
}

interface ParsedLegacyExpense {
  source: MigrationItemState['source'];
  sourceIndex: number;
  title: string;
  categoryKey: string | null;
  amountCents: number;
  paidByCurrentUser: boolean;
  occurredAt?: string;
}

export interface LocalExpenseMigrationResult {
  migratedExpenses: number;
  alreadyCompleted: boolean;
}

function emptyState(): ExpenseMigrationState {
  return { version: 1, completed: false, items: [] };
}

function parseArray(raw: string | null): unknown[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) {
    throw new Error('Legacy expense storage must contain an array');
  }
  return value;
}

/** Convert the legacy euro input into cents without floating-point arithmetic. */
export function parseLegacyAmountCents(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? parseLegacyAmountCents(String(value)) : null;
  }
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const euros = Number(match[1]);
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const cents = euros * 100 + Number(fraction || '0');
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function parseCandidate(
  value: unknown,
  source: ParsedLegacyExpense['source'],
  sourceIndex: number
): ParsedLegacyExpense | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as LegacyExpenseCandidate;
  const rawTitle = typeof candidate.title === 'string'
    ? candidate.title
    : candidate.description;
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!title) return null;

  const explicitCents = candidate.amountCents;
  const amountCents = typeof explicitCents === 'number'
    && Number.isSafeInteger(explicitCents)
    && explicitCents > 0
    ? explicitCents
    : parseLegacyAmountCents(candidate.amount);
  if (amountCents === null) return null;

  const occurredAt = typeof candidate.occurredAt === 'string'
    ? candidate.occurredAt
    : typeof candidate.createdAt === 'string'
      ? candidate.createdAt
      : undefined;

  return {
    source,
    sourceIndex,
    title,
    categoryKey: typeof candidate.categoryKey === 'string' ? candidate.categoryKey : null,
    amountCents,
    paidByCurrentUser: candidate.paidBy !== 'other',
    occurredAt,
  };
}

function getStateItem(
  state: ExpenseMigrationState,
  source: MigrationItemState['source'],
  sourceIndex: number
): MigrationItemState {
  const existing = state.items.find(
    item => item.source === source && item.sourceIndex === sourceIndex
  );
  if (existing) return existing;

  const item = { id: Crypto.randomUUID(), source, sourceIndex };
  state.items.push(item);
  return item;
}

async function migrateEventInternal(eventId: string): Promise<LocalExpenseMigrationResult> {
  const stateKey = `${MIGRATION_STATE_KEY_PREFIX}${eventId}`;
  const rawState = await AsyncStorage.getItem(stateKey);
  const state = rawState === null
    ? emptyState()
    : JSON.parse(rawState) as ExpenseMigrationState;

  if (state.version === 1 && state.completed) {
    return { migratedExpenses: 0, alreadyCompleted: true };
  }

  const [customCategoryValues, expenseValues] = await Promise.all([
    AsyncStorage.getItem(`${CUSTOM_CATEGORIES_KEY_PREFIX}${eventId}`).then(parseArray),
    AsyncStorage.getItem(`${LEGACY_EXPENSES_KEY_PREFIX}${eventId}`).then(parseArray),
  ]);
  const candidates = [
    ...customCategoryValues.map((value, index) => parseCandidate(value, 'custom_cats', index)),
    ...expenseValues.map((value, index) => parseCandidate(value, 'expenses', index)),
  ].filter((value): value is ParsedLegacyExpense => value !== null);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Authentication required for local expense migration');

  const rows: EventExpenseInsert[] = candidates.map(candidate => {
    const itemState = getStateItem(state, candidate.source, candidate.sourceIndex);
    const row: EventExpenseInsert = {
      id: itemState.id,
      event_id: eventId,
      created_by: authData.user!.id,
      paid_by: candidate.paidByCurrentUser ? authData.user!.id : null,
      title: candidate.title,
      category_key: candidate.categoryKey,
      amount_cents: candidate.amountCents,
    };
    if (candidate.occurredAt) row.occurred_at = candidate.occurredAt;
    return row;
  });

  // Save deterministic IDs before the remote write. A crash or retry then uses
  // the same primary keys, so upsert cannot create duplicates.
  await AsyncStorage.setItem(stateKey, JSON.stringify(state));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('event_expenses')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  }

  state.completed = true;
  await AsyncStorage.setItem(stateKey, JSON.stringify(state));

  return { migratedExpenses: rows.length, alreadyCompleted: false };
}

const inFlightByEvent = new Map<string, Promise<LocalExpenseMigrationResult>>();

export const localExpenseMigrationRepository = {
  migrateEvent(eventId: string): Promise<LocalExpenseMigrationResult> {
    const existing = inFlightByEvent.get(eventId);
    if (existing) return existing;

    const run = migrateEventInternal(eventId);
    inFlightByEvent.set(eventId, run);
    void run.finally(() => {
      if (inFlightByEvent.get(eventId) === run) inFlightByEvent.delete(eventId);
    }).catch(() => undefined);
    return run;
  },
};
