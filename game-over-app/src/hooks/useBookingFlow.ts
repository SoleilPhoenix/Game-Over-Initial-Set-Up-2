/**
 * useBookingFlow Hook
 * Derives pricing from server state - no separate store needed
 */

import { useState, useMemo } from 'react';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useBooking } from '@/hooks/queries/useBookings';
import { usePackage } from '@/hooks/queries/usePackages';

export interface BookingPricing {
  packagePriceCents: number;
  serviceFeeCents: number;
  totalCents: number;
  perPersonCents: number;
  payingParticipantCount: number;
}

export interface UseBookingFlowResult {
  event: any;
  participants: any[];
  booking: any;
  package: any;
  excludeHonoree: boolean;
  setExcludeHonoree: (value: boolean) => void;
  pricing: BookingPricing | null;
  isLoading: boolean;
  error: Error | null;
}

const MIN_SERVICE_FEE_CENTS = 5000; // €50 minimum
const SERVICE_FEE_RATE = 0.10; // 10%

export function useBookingFlow(eventId: string | undefined): UseBookingFlowResult {
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);
  const { data: participants, isLoading: participantsLoading } = useParticipants(eventId);
  const { data: booking, isLoading: bookingLoading } = useBooking(eventId);

  // Get package from event's preferences or booking
  const packageId = event?.preferences?.selected_package_id || booking?.package_id;
  const { data: pkg, isLoading: packageLoading } = usePackage(packageId || '');

  // Local UI state for excludeHonoree toggle
  const [excludeHonoree, setExcludeHonoree] = useState(
    booking?.exclude_honoree ?? true
  );

  // Calculate pricing based on current state
  const pricing = useMemo((): BookingPricing | null => {
    if (!pkg || !participants) return null;

    const totalParticipants = participants.length;
    const honoreeCount = excludeHonoree ? 1 : 0;
    const payingCount = Math.max(1, totalParticipants - honoreeCount);

    const packagePrice = pkg.base_price_cents;
    const serviceFee = Math.max(
      Math.round(packagePrice * SERVICE_FEE_RATE),
      MIN_SERVICE_FEE_CENTS
    );
    const total = packagePrice + serviceFee;
    const perPerson = Math.ceil(total / payingCount);

    return {
      packagePriceCents: packagePrice,
      serviceFeeCents: serviceFee,
      totalCents: total,
      perPersonCents: perPerson,
      payingParticipantCount: payingCount,
    };
  }, [pkg, participants, excludeHonoree]);

  const isLoading = eventLoading || participantsLoading || bookingLoading || packageLoading;

  return {
    event,
    participants: participants || [],
    booking,
    package: pkg,
    excludeHonoree,
    setExcludeHonoree,
    pricing,
    isLoading,
    error: eventError as Error | null,
  };
}

export default useBookingFlow;
