import { describe, expect, it } from 'vitest';
import { deriveDepositAmounts } from '../../supabase/functions/_shared/booking-payment';

describe('deriveDepositAmounts', () => {
  it('derives a 25% deposit and the exact remainder for odd cent totals', () => {
    const totalAmountCents = 10_003;
    const result = deriveDepositAmounts(totalAmountCents);

    expect(result.depositAmountCents).toBe(2_501);
    expect(result.remainingAmountCents).toBe(7_502);
    expect(result.depositAmountCents + result.remainingAmountCents).toBe(totalAmountCents);
  });
});
