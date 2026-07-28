import { describe, expect, it } from 'vitest';
import { mapCreateEventRefund, mapEventRefundRow } from '@/repositories/refunds';

describe('event refund repository mapping', () => {
  it('maps database rows to the app model without changing cents or dates', () => {
    expect(mapEventRefundRow({
      id: 'refund-1',
      event_id: 'event-1',
      created_by: 'user-1',
      template_key: 'hotel_deposit',
      description: 'Hotel deposit',
      amount_cents: 12550,
      status: 'received',
      expected_by: '2026-08-01',
      received_at: '2026-07-30T12:00:00Z',
      last_reminder_at: null,
      created_at: '2026-07-28T09:00:00Z',
      updated_at: '2026-07-30T12:00:00Z',
    })).toEqual({
      id: 'refund-1',
      eventId: 'event-1',
      createdBy: 'user-1',
      templateKey: 'hotel_deposit',
      description: 'Hotel deposit',
      amountCents: 12550,
      status: 'received',
      expectedBy: '2026-08-01',
      receivedAt: '2026-07-30T12:00:00Z',
      lastReminderAt: null,
      createdAt: '2026-07-28T09:00:00Z',
      updatedAt: '2026-07-30T12:00:00Z',
    });
  });

  it('maps create input to the exact database column names', () => {
    expect(mapCreateEventRefund({
      eventId: 'event-1',
      createdBy: 'user-1',
      description: 'Taxi prepayment',
      amountCents: 4200,
      expectedBy: null,
    })).toEqual({
      event_id: 'event-1',
      created_by: 'user-1',
      template_key: null,
      description: 'Taxi prepayment',
      amount_cents: 4200,
      status: 'pending',
      expected_by: null,
      received_at: null,
    });
  });
});
