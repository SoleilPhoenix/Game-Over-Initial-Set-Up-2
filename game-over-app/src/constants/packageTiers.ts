/**
 * Package Tier Display Constants — Single Source of Truth
 *
 * Internal tier keys ("essential" | "classic" | "grand") are stable identifiers
 * used in DB, RLS, Stripe metadata, and fallback maps. They MUST NOT change.
 *
 * Display names ("Feier" | "Rausch" | "Legende") are user-facing labels and
 * may evolve. Every screen should read from here, not hardcode.
 *
 * Pricing: final all-in prices per person (no separate service fee).
 */

export type PackageTier = 'essential' | 'classic' | 'grand';

export const TIER_DISPLAY_NAME: Record<PackageTier, string> = {
  essential: 'Feier',
  classic: 'Rausch',
  grand: 'Legende',
};

export const TIER_SIZE_LABEL: Record<PackageTier, string> = {
  essential: 'S',
  classic: 'M',
  grand: 'L',
};

export const TIER_PRICE_PER_PERSON_CENTS: Record<PackageTier, number> = {
  essential: 129_00,
  classic: 179_00,
  grand: 229_00,
};

/** "Feier (S)" — used in summary, payment, confirmation headers. */
export function getTierDisplayLabel(tier: string): string {
  const name = TIER_DISPLAY_NAME[tier as PackageTier] ?? tier;
  const size = TIER_SIZE_LABEL[tier as PackageTier];
  return size ? `${name} (${size})` : name;
}

/** "Berlin Feier" — used to build fallback package names from city + tier. */
export function getCityTierName(city: string, tier: string): string {
  const tierName = TIER_DISPLAY_NAME[tier as PackageTier] ?? tier;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  return `${cityName} ${tierName}`;
}
