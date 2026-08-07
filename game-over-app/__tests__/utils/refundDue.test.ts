import { describe, expect, it } from 'vitest';
import { isRefundDueMeta } from '@/utils/refundDue';

describe('isRefundDueMeta', () => {
  it('accepts metadata written by notify_due_refunds', () => {
    expect(isRefundDueMeta({
      refundId: 'refund-1',
      description: 'Hotel deposit',
      amountCents: 15000,
      expectedBy: '2026-07-27',
    })).toBe(true);
  });

  it('rejects malformed metadata', () => {
    expect(isRefundDueMeta(null)).toBe(false);
    expect(isRefundDueMeta({
      refundId: 'refund-1',
      description: 'Hotel deposit',
      amountCents: '15000',
      expectedBy: '2026-07-27',
    })).toBe(false);
    expect(isRefundDueMeta({
      refundId: 'refund-1',
      description: 'Hotel deposit',
      amountCents: 15000,
      expectedBy: '27.07.2026',
    })).toBe(false);
  });
});
