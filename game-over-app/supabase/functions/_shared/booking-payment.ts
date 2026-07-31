export interface DepositAmounts {
  depositAmountCents: number;
  remainingAmountCents: number;
}

/**
 * Derive the 25% booking deposit without independently rounding the remainder.
 */
export function deriveDepositAmounts(totalAmountCents: number): DepositAmounts {
  if (!Number.isSafeInteger(totalAmountCents) || totalAmountCents <= 0) {
    throw new Error('totalAmountCents must be a positive integer');
  }

  const depositAmountCents = Math.ceil(totalAmountCents / 4);

  return {
    depositAmountCents,
    remainingAmountCents: totalAmountCents - depositAmountCents,
  };
}
