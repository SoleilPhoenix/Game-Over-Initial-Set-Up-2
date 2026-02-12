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

// Fallback packages for local IDs that don't exist in DB
const FALLBACK_PKG: Record<string, { id: string; name: string; tier: string; price_per_person_cents: number }> = {
  'berlin-classic': { id: 'berlin-classic', name: 'Berlin Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'berlin-essential': { id: 'berlin-essential', name: 'Berlin Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'berlin-grand': { id: 'berlin-grand', name: 'Berlin Grand', tier: 'grand', price_per_person_cents: 199_00 },
  'hamburg-classic': { id: 'hamburg-classic', name: 'Hamburg Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'hamburg-essential': { id: 'hamburg-essential', name: 'Hamburg Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'hamburg-grand': { id: 'hamburg-grand', name: 'Hamburg Grand', tier: 'grand', price_per_person_cents: 199_00 },
  'hannover-classic': { id: 'hannover-classic', name: 'Hannover Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'hannover-essential': { id: 'hannover-essential', name: 'Hannover Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'hannover-grand': { id: 'hannover-grand', name: 'Hannover Grand', tier: 'grand', price_per_person_cents: 199_00 },
};

export function useBookingFlow(eventId: string | undefined, packageIdOverride?: string, participantCountOverride?: number): UseBookingFlowResult {
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(eventId);
  const { data: participants, isLoading: participantsLoading } = useParticipants(eventId);
  const { data: booking, isLoading: bookingLoading } = useBooking(eventId);

  // Get package from: explicit override > event preferences > booking
  const packageId = packageIdOverride || (event?.preferences as { selected_package_id?: string } | null)?.selected_package_id || booking?.package_id;
  const { data: dbPkg, isLoading: packageLoading } = usePackage(packageId || '');
  // Use DB package or fallback for local IDs
  const pkg = dbPkg || (packageId ? FALLBACK_PKG[packageId] : null);

  // Local UI state for excludeHonoree toggle
  const [excludeHonoree, setExcludeHonoree] = useState(
    booking?.exclude_honoree ?? true
  );

  // Calculate pricing based on current state
  const pricing = useMemo((): BookingPricing | null => {
    if (!pkg) return null;

    // Use override (from URL params) > participant list > event count > fallback to 1
    const totalParticipants = participantCountOverride ||
      ((participants && participants.length > 0) ? participants.length : (event?.participant_count || 1));
    const honoreeCount = excludeHonoree ? 1 : 0;
    const payingCount = Math.max(1, totalParticipants - honoreeCount);

    const perPersonPrice = pkg.price_per_person_cents || (pkg as any).base_price_cents || 0;
    // Package Base is ALWAYS price × total participants (fixed amount)
    const packagePrice = perPersonPrice * totalParticipants;
    const serviceFee = Math.max(
      Math.round(packagePrice * SERVICE_FEE_RATE),
      MIN_SERVICE_FEE_CENTS
    );
    const total = packagePrice + serviceFee;
    // Only per-person cost changes based on exclude honoree toggle
    const perPerson = Math.ceil(total / payingCount);

    return {
      packagePriceCents: packagePrice,
      serviceFeeCents: serviceFee,
      totalCents: total,
      perPersonCents: perPerson,
      payingParticipantCount: payingCount,
    };
  }, [pkg, participants, excludeHonoree, event, participantCountOverride]);

  const isLoading = eventLoading || participantsLoading || bookingLoading || (packageLoading && !pkg);

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
