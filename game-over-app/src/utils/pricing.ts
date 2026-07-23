/**
 * Canonical Pricing Utility
 * Single source of truth for all booking pricing calculations.
 * Replaces duplicated logic in bookingsRepository and useBookingFlow.
 */

// Service fee was removed — package prices are now final all-in prices.
// Constants kept at 0 for backwards compatibility with existing imports/bookings.
export const SERVICE_FEE_PERCENTAGE = 0;
export const MIN_SERVICE_FEE_CENTS = 0;

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
 * Business rules:
 * - Package base = pricePerPerson × ALL participants (fixed regardless of honoree exclusion)
 * - Honoree exclusion only changes the per-person split, not the total
 * - No service fee — package prices are final all-in prices
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

  // Service fee removed — prices are final all-in. Kept as 0 for shape compatibility.
  const serviceFeeCents = 0;
  const totalCents = packageBaseCents;

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
