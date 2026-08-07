import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase/client';
import {
  localExpenseMigrationRepository,
  parseLegacyAmountCents,
} from '@/repositories/localExpenseMigration';

vi.mock('expo-crypto', () => ({ randomUUID: vi.fn() }));

const eventId = 'event-1';
const customKey = `gameover:custom_cats:${eventId}`;
const expensesKey = `gameover:expenses:${eventId}`;
const stateKey = `gameover:expense_migration:v1:${eventId}`;

describe('localExpenseMigrationRepository', () => {
  let storage: Map<string, string>;
  let expenseUpsert: ReturnType<typeof vi.fn>;
  let categoryUpsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = new Map();
    vi.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
    vi.mocked(Crypto.randomUUID).mockReset();
    vi.mocked(Crypto.randomUUID)
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000003');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as any);
    expenseUpsert = vi.fn().mockResolvedValue({ error: null });
    categoryUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockImplementation((table: string) => ({
      upsert: table === 'event_expenses' ? expenseUpsert : categoryUpsert,
    }) as any);
  });

  it('moves custom categories and expenses while preserving exact cents', async () => {
    const customPayload = JSON.stringify([
      { key: 'custom_1', labelKey: 'Party hats', icon: 'hat' },
      { title: 'Legacy entry', amount: '10,05', categoryKey: 'custom_1' },
    ]);
    const expensePayload = JSON.stringify([{
      description: 'Taxi',
      amount: '42.70',
      categoryKey: 'transport',
      paidBy: 'other',
      contributors: ['participant-2'],
    }]);
    storage.set(customKey, customPayload);
    storage.set(expensesKey, expensePayload);

    const result = await localExpenseMigrationRepository.migrateEvent(eventId);

    expect(expenseUpsert).toHaveBeenCalledWith([{
      id: '00000000-0000-4000-8000-000000000001',
      event_id: eventId,
      created_by: 'user-1',
      paid_by: 'user-1',
      title: 'Legacy entry',
      category_key: 'custom_1',
      amount_cents: 1005,
    }, {
      id: '00000000-0000-4000-8000-000000000002',
      event_id: eventId,
      created_by: 'user-1',
      paid_by: null,
      title: 'Taxi',
      category_key: 'transport',
      amount_cents: 4270,
    }], { onConflict: 'id', ignoreDuplicates: true });
    expect(categoryUpsert).toHaveBeenCalledWith([{
      id: '00000000-0000-4000-8000-000000000003',
      event_id: eventId,
      key: 'custom_1',
      label: 'Party hats',
      icon: 'hat',
      created_by: 'user-1',
    }], { onConflict: 'event_id,key', ignoreDuplicates: true });
    expect(result).toEqual({
      migratedExpenses: 2,
      migratedCategories: 1,
      alreadyCompleted: false,
    });
    expect(JSON.parse(storage.get(stateKey)!)).toMatchObject({
      completed: true,
      expensesCompleted: true,
      categoriesCompleted: true,
    });
    expect(storage.get(customKey)).toBe(customPayload);
    expect(storage.get(expensesKey)).toBe(expensePayload);
  });

  it('retries a failed write with the same IDs and never removes local data', async () => {
    const payload = JSON.stringify([{ description: 'Food', amount: '19.99' }]);
    storage.set(expensesKey, payload);
    expenseUpsert
      .mockResolvedValueOnce({ error: { message: 'network failed' } })
      .mockResolvedValueOnce({ error: null });

    await expect(localExpenseMigrationRepository.migrateEvent(eventId)).rejects.toEqual({
      message: 'network failed',
    });
    expect(storage.get(expensesKey)).toBe(payload);
    expect(JSON.parse(storage.get(stateKey)!)).toMatchObject({ completed: false });

    const retry = await localExpenseMigrationRepository.migrateEvent(eventId);
    const completed = await localExpenseMigrationRepository.migrateEvent(eventId);

    expect(retry).toEqual({
      migratedExpenses: 1,
      migratedCategories: 0,
      alreadyCompleted: false,
    });
    expect(completed).toEqual({
      migratedExpenses: 0,
      migratedCategories: 0,
      alreadyCompleted: true,
    });
    expect(expenseUpsert).toHaveBeenCalledTimes(2);
    expect(expenseUpsert.mock.calls[0][0][0].id)
      .toBe(expenseUpsert.mock.calls[1][0][0].id);
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
    expect(storage.get(expensesKey)).toBe(payload);
  });

  it('upgrades an already-completed expense migration by moving categories only', async () => {
    const categoryPayload = JSON.stringify([{
      key: 'custom_old',
      labelKey: 'Old category',
      icon: 'pricetag-outline',
    }]);
    storage.set(customKey, categoryPayload);
    storage.set(stateKey, JSON.stringify({
      version: 1,
      completed: true,
      items: [],
    }));

    const result = await localExpenseMigrationRepository.migrateEvent(eventId);

    expect(expenseUpsert).not.toHaveBeenCalled();
    expect(categoryUpsert).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      migratedExpenses: 0,
      migratedCategories: 1,
      alreadyCompleted: false,
    });
    expect(storage.get(customKey)).toBe(categoryPayload);
  });

  it('parses legacy euro input without losing cent precision', () => {
    expect(parseLegacyAmountCents('1')).toBe(100);
    expect(parseLegacyAmountCents('1,2')).toBe(120);
    expect(parseLegacyAmountCents('1.02')).toBe(102);
    expect(parseLegacyAmountCents('1.234')).toBeNull();
    expect(parseLegacyAmountCents('free')).toBeNull();
  });
});
