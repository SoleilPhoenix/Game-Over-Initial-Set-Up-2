/**
 * useBookingFlow Hook
 * Derives pricing from server state - no separate store needed
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useBooking } from '@/hooks/queries/useBookings';
import { usePackage } from '@/hooks/queries/usePackages';
import { calculateBookingPricing } from '@/utils/pricing';
import { loadDesiredParticipants } from '@/lib/participantCountCache';
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
  isParticipantCountLoading: boolean;
  isParticipantCountUnavailable: boolean;
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

type RecordedBookingHeadcount = Pick<BookingWithDetails, 'paying_participants' | 'exclude_honoree'>;

interface PricingParticipantCountSources {
  participantCountOverride?: number;
  booking?: RecordedBookingHeadcount | null;
  cachedParticipantCount?: number;
}

interface ResolveBookingPricingInput extends PricingParticipantCountSources {
  pkg: Package | FallbackPackage | null | undefined;
  excludeHonoree: boolean;
}

/** Resolve only from user decisions or the headcount recorded on an existing booking. */
export function resolvePricingParticipantCount({
  participantCountOverride,
  booking,
  cachedParticipantCount,
}: PricingParticipantCountSources): number | undefined {
  if (participantCountOverride !== undefined) return participantCountOverride;
  if (booking) {
    return booking.paying_participants + (booking.exclude_honoree === true ? 1 : 0);
  }
  return cachedParticipantCount;
}

/** Pure pricing adapter kept exportable so the charge-source chain has a regression net. */
export function resolveBookingPricing({
  pkg,
  excludeHonoree,
  ...participantCountSources
}: ResolveBookingPricingInput): BookingPricing | null {
  if (!pkg) return null;

  const totalParticipants = resolvePricingParticipantCount(participantCountSources);
  if (totalParticipants === undefined) return null;

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
}

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

  const [participantCountCacheResult, setParticipantCountCacheResult] = useState<{
    eventId: string;
    count: number | undefined;
  } | null>(null);
  const loggedMissingParticipantCount = useRef(new Set<string>());

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;
    loadDesiredParticipants(eventId).then((count) => {
      if (!cancelled) setParticipantCountCacheResult({ eventId, count });
    });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const cachedParticipantCount = participantCountCacheResult && participantCountCacheResult.eventId === eventId
    ? participantCountCacheResult.count
    : undefined;
  const isParticipantCountCacheLoading = Boolean(
    eventId && participantCountCacheResult?.eventId !== eventId
  );
  const isParticipantCountLoading = participantCountOverride === undefined && (
    bookingLoading || (!booking && isParticipantCountCacheLoading)
  );
  const resolvedParticipantCount = isParticipantCountLoading
    ? undefined
    : resolvePricingParticipantCount({
        participantCountOverride,
        booking,
        cachedParticipantCount,
      });
  const isParticipantCountUnavailable = Boolean(
    eventId && !isParticipantCountLoading && resolvedParticipantCount === undefined
  );

  useEffect(() => {
    if (!eventId || !isParticipantCountUnavailable || loggedMissingParticipantCount.current.has(eventId)) return;
    loggedMissingParticipantCount.current.add(eventId);
    console.error(`[useBookingFlow] Cannot determine participant count for event ${eventId}; pricing refused.`);
  }, [eventId, isParticipantCountUnavailable]);

  // Calculate pricing based on current state
  const pricing = useMemo((): BookingPricing | null => {
    if (isParticipantCountLoading) return null;

    return resolveBookingPricing({
      pkg,
      excludeHonoree,
      participantCountOverride,
      booking,
      cachedParticipantCount,
    });
  }, [pkg, excludeHonoree, participantCountOverride, booking, cachedParticipantCount, isParticipantCountLoading]);

  const isLoading = eventLoading || participantsLoading || bookingLoading || isParticipantCountLoading || (packageLoading && !pkg);

  return {
    event,
    participants: participants || [],
    booking,
    package: pkg,
    excludeHonoree,
    setExcludeHonoree,
    pricing,
    isParticipantCountLoading,
    isParticipantCountUnavailable,
    isLoading,
    error: eventError as Error | null,
  };
}

export default useBookingFlow;
