import { describe, expect, it } from 'vitest';
import {
  mapCreateEventExpense,
  mapEventExpenseReportRow,
  mapEventExpenseRow,
} from '@/repositories/expenses';

describe('event expenses repository mapping', () => {
  it('maps an expense, its shares, and open report count without changing cents', () => {
    expect(mapEventExpenseRow({
      id: 'expense-1',
      event_id: 'event-1',
      created_by: 'user-1',
      paid_by: 'user-2',
      title: 'Taxi',
      category_key: 'transport',
      amount_cents: 12345,
      occurred_at: '2026-08-05T19:00:00Z',
      created_at: '2026-08-05T20:00:00Z',
      updated_at: '2026-08-05T20:00:00Z',
    }, [{
      id: 'share-1',
      expense_id: 'expense-1',
      user_id: 'user-3',
      amount_cents: 4115,
      settled_at: null,
      created_at: '2026-08-05T20:00:00Z',
    }], 2)).toEqual({
      id: 'expense-1',
      eventId: 'event-1',
      createdBy: 'user-1',
      paidBy: 'user-2',
      title: 'Taxi',
      categoryKey: 'transport',
      amountCents: 12345,
      occurredAt: '2026-08-05T19:00:00Z',
      createdAt: '2026-08-05T20:00:00Z',
      updatedAt: '2026-08-05T20:00:00Z',
      shares: [{
        id: 'share-1',
        expenseId: 'expense-1',
        userId: 'user-3',
        amountCents: 4115,
        settledAt: null,
        createdAt: '2026-08-05T20:00:00Z',
      }],
      openReportCount: 2,
    });
  });

  it('maps create input to the exact database columns', () => {
    expect(mapCreateEventExpense({
      id: 'expense-1',
      eventId: 'event-1',
      createdBy: 'user-1',
      paidBy: 'user-1',
      title: 'Snacks',
      categoryKey: 'food',
      amountCents: 9900,
      occurredAt: '2026-08-05T18:00:00Z',
    })).toEqual({
      id: 'expense-1',
      event_id: 'event-1',
      created_by: 'user-1',
      paid_by: 'user-1',
      title: 'Snacks',
      category_key: 'food',
      amount_cents: 9900,
      occurred_at: '2026-08-05T18:00:00Z',
    });
  });

  it('maps reports and rejects non-integer cent amounts', () => {
    expect(mapEventExpenseReportRow({
      id: 'report-1',
      expense_id: 'expense-1',
      reported_by: 'user-2',
      reason: 'Duplicate',
      created_at: '2026-08-05T21:00:00Z',
      resolved_at: null,
      resolved_by: null,
    })).toMatchObject({
      id: 'report-1',
      expenseId: 'expense-1',
      reportedBy: 'user-2',
      reason: 'Duplicate',
      resolvedAt: null,
    });

    expect(() => mapCreateEventExpense({
      eventId: 'event-1',
      createdBy: 'user-1',
      title: 'Invalid',
      amountCents: 12.5,
    })).toThrow('positive integer cents');
  });
});
