/**
 * useBookingFlow Hook
 * Derives pricing from server state - no separate store needed
 */

import { useState, useMemo } from 'react';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useBooking } from '@/hooks/queries/useBookings';
import { usePackage } from '@/hooks/queries/usePackages';
import { calculateBookingPricing } from '@/utils/pricing';
import type { EventWithDetails } from '@/repositories/events';
import type { ParticipantWithProfile } from '@/repositories/participants';
import type { BookingWithDetails } from '@/repositories/bookings';
import type { Database } from '@/lib/supabase/types';

import { getCityTierName, TIER_PRICE_PER_PERSON_CENTS } from '@/constants/packageTiers';

type Package = Database['public']['Tables']['packages']['Row'];

export interface FallbackPackage {
  id: string;
  name: string;
  tier: string;
  price_per_person_cents: number;
  base_price_cents: 0;
  slug?: string;
  [key: string]: unknown;
}

export interface BookingPricing {
  packagePriceCents: number;
  serviceFeeCents: number;
  totalCents: number;
  perPersonCents: number;
  payingParticipantCount: number;
}

export interface UseBookingFlowResult {
  event: EventWithDetails | null | undefined;
  participants: ParticipantWithProfile[];
  booking: BookingWithDetails | null | undefined;
  package: Package | FallbackPackage | null | undefined;
  excludeHonoree: boolean;
  setExcludeHonoree: (value: boolean) => void;
  pricing: BookingPricing | null;
  isLoading: boolean;
  error: Error | null;
}

// Fallback packages for local IDs that don't exist in DB — names + prices from packageTiers
const FALLBACK_PKG: Record<string, FallbackPackage> = {
  'berlin-essential':   { id: 'berlin-essential',   name: getCityTierName('berlin',   'essential'), tier: 'essential', price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.essential, base_price_cents: 0 },
  'berlin-classic':     { id: 'berlin-classic',     name: getCityTierName('berlin',   'classic'),   tier: 'classic',   price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.classic,   base_price_cents: 0 },
  'berlin-grand':       { id: 'berlin-grand',       name: getCityTierName('berlin',   'grand'),     tier: 'grand',     price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.grand,     base_price_cents: 0 },
  'hamburg-essential':  { id: 'hamburg-essential',  name: getCityTierName('hamburg',  'essential'), tier: 'essential', price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.essential, base_price_cents: 0 },
  'hamburg-classic':    { id: 'hamburg-classic',    name: getCityTierName('hamburg',  'classic'),   tier: 'classic',   price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.classic,   base_price_cents: 0 },
  'hamburg-grand':      { id: 'hamburg-grand',      name: getCityTierName('hamburg',  'grand'),     tier: 'grand',     price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.grand,     base_price_cents: 0 },
  'hannover-essential': { id: 'hannover-essential', name: getCityTierName('hannover', 'essential'), tier: 'essential', price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.essential, base_price_cents: 0 },
  'hannover-classic':   { id: 'hannover-classic',   name: getCityTierName('hannover', 'classic'),   tier: 'classic',   price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.classic,   base_price_cents: 0 },
  'hannover-grand':     { id: 'hannover-grand',     name: getCityTierName('hannover', 'grand'),     tier: 'grand',     price_per_person_cents: TIER_PRICE_PER_PERSON_CENTS.grand,     base_price_cents: 0 },
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
      ((participants && participants.length > 0) ? participants.length : 1);

    const result = calculateBookingPricing({
      pricePerPersonCents: pkg.price_per_person_cents,
      baseFeeCents: (pkg as FallbackPackage).base_price_cents ?? 0,
      totalParticipants,
      excludeHonoree,
    });

    return {
      packagePriceCents: result.packageBaseCents,
      serviceFeeCents: result.serviceFeeCents,
      totalCents: result.totalCents,
      perPersonCents: result.perPersonCents,
      payingParticipantCount: result.payingCount,
    };
  }, [pkg, participants, excludeHonoree, participantCountOverride]);

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
