import { describe, expect, it } from 'vitest';
import { PAYMENT_REMINDER_MILESTONES } from '../../supabase/functions/_shared/payment-reminder-milestones';

describe('payment reminder milestone email classification', () => {
  it('bypasses the email preference only at 14, 9, 8 and 7 days', () => {
    const alwaysSentDays = PAYMENT_REMINDER_MILESTONES
      .filter((milestone) => milestone.alwaysSend)
      .map((milestone) => milestone.daysBefore);
    const optionalDays = PAYMENT_REMINDER_MILESTONES
      .filter((milestone) => !milestone.alwaysSend)
      .map((milestone) => milestone.daysBefore);

    expect(alwaysSentDays).toEqual([14, 9, 8, 7]);
    expect(optionalDays).toEqual([18, 16, 12, 10]);
  });
});
