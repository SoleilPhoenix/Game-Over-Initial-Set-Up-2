/**
 * Canonical Pricing Utility
 * Single source of truth for all booking pricing calculations.
 * Replaces duplicated logic in bookingsRepository and useBookingFlow.
 */

export const SERVICE_FEE_PERCENTAGE = 0.10; // 10%
export const MIN_SERVICE_FEE_CENTS = 5000;  // €50 minimum

export interface PackagePricingInput {
  pricePerPersonCents: number;
  baseFeeCents?: number;
  totalParticipants: number;
  excludeHonoree?: boolean;
}

export interface BookingPricing {
  packageBaseCents: number;
  serviceFeeCents: number;
  totalCents: number;
  perPersonCents: number;
  payingCount: number;
  depositCents: number;
  remainingCents: number;
}

/**
 * Calculate all pricing values for a booking.
 *
 * Business rules (per MEMORY):
 * - Package base = pricePerPerson × ALL participants (fixed regardless of honoree exclusion)
 * - Honoree exclusion only changes the per-person split, not the total
 * - Service fee = max(10% of package base, €50)
 * - Per person = ceil(total / payingCount)
 * - Deposit = 25% of total
 */
export function calculateBookingPricing(input: PackagePricingInput): BookingPricing {
  const {
    pricePerPersonCents,
    baseFeeCents = 0,
    totalParticipants,
    excludeHonoree = false,
  } = input;

  // Package base always uses ALL participants
  const packageBaseCents = pricePerPersonCents * totalParticipants + baseFeeCents;

  const serviceFeeCents = Math.max(
    Math.round(packageBaseCents * SERVICE_FEE_PERCENTAGE),
    MIN_SERVICE_FEE_CENTS,
  );

  const totalCents = packageBaseCents + serviceFeeCents;

  // Paying count drives the per-person split only
  const payingCount = excludeHonoree ? Math.max(totalParticipants - 1, 1) : totalParticipants;
  const perPersonCents = Math.ceil(totalCents / payingCount);

  // 25% deposit — must match Math.ceil(bookingTotalCents * 0.25) in create-payment-intent
  const depositCents = Math.ceil(totalCents * 0.25);
  const remainingCents = totalCents - depositCents;

  return {
    packageBaseCents,
    serviceFeeCents,
    totalCents,
    perPersonCents,
    payingCount,
    depositCents,
    remainingCents,
  };
}
