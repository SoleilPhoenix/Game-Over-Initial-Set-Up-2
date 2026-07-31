import { describe, expect, it } from 'vitest';
import { MILESTONES } from '../../supabase/functions/_shared/payment-reminder-milestones';

describe('live payment reminder milestone alwaysSend split', () => {
  it('forces 14, 9, 8, 7 and cancellation day 6 while keeping 18, 16, 12 and 10 optional', () => {
    const alwaysSentDays = MILESTONES
      .filter((milestone) => milestone.alwaysSend)
      .map((milestone) => milestone.daysBefore);
    const optionalDays = MILESTONES
      .filter((milestone) => !milestone.alwaysSend)
      .map((milestone) => milestone.daysBefore);

    expect(alwaysSentDays).toEqual([14, 9, 8, 7, 6]);
    expect(optionalDays).toEqual([18, 16, 12, 10]);
  });
});
