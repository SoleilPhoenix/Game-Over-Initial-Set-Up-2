import { describe, expect, it } from 'vitest';
import { resolveBookingPricing } from '@/hooks/useBookingFlow';

const pkg = {
  id: 'test-package',
  name: 'Test package',
  tier: 'classic',
  price_per_person_cents: 10_000,
  base_price_cents: 0 as const,
};

describe('useBookingFlow pricing participant-count source chain', () => {
  it('uses the explicit override before the existing booking and cache', () => {
    const pricing = resolveBookingPricing({
      pkg,
      excludeHonoree: true,
      participantCountOverride: 5,
      booking: { paying_participants: 3, exclude_honoree: true },
      cachedParticipantCount: 2,
    });

    expect(pricing?.packagePriceCents).toBe(50_000);
    expect(pricing?.payingParticipantCount).toBe(4);
  });

  it('reconstructs the existing booking headcount before using cache', () => {
    const pricing = resolveBookingPricing({
      pkg,
      excludeHonoree: true,
      booking: { paying_participants: 3, exclude_honoree: true },
      cachedParticipantCount: 2,
    });

    expect(pricing?.packagePriceCents).toBe(40_000);
    expect(pricing?.payingParticipantCount).toBe(3);
  });

  it('uses the cached desired count when no override or booking exists', () => {
    const pricing = resolveBookingPricing({
      pkg,
      excludeHonoree: true,
      booking: null,
      cachedParticipantCount: 3,
    });

    expect(pricing?.packagePriceCents).toBe(30_000);
    expect(pricing?.payingParticipantCount).toBe(2);
  });

  it('returns no price when every participant-count source is absent', () => {
    const pricing = resolveBookingPricing({
      pkg,
      excludeHonoree: true,
      booking: null,
    });

    expect(pricing).toBeNull();
  });
});
