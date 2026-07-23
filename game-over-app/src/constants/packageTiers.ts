/**
 * Package Tier Display Constants — Single Source of Truth
 *
 * Internal tier keys ("essential" | "classic" | "grand") are stable identifiers
 * used in DB, RLS, Stripe metadata, and fallback maps. They MUST NOT change.
 *
 * Display names are language-aware:
 *   DE: Feier / Rausch / Legende
 *   EN: Party / Hype / Legend
 *
 * Pricing: final all-in prices per person (no separate service fee).
 */

export type PackageTier = 'essential' | 'classic' | 'grand';
export type SupportedLanguage = 'de' | 'en';

/** Per-language tier display names. */
export const TIER_DISPLAY_NAME_BY_LANG: Record<SupportedLanguage, Record<PackageTier, string>> = {
  de: { essential: 'Feier',  classic: 'Rausch', grand: 'Legende' },
  en: { essential: 'Party',  classic: 'Hype',   grand: 'Legend' },
};

/** Backwards-compat default — German (preserved for module-scope fallbacks). */
export const TIER_DISPLAY_NAME: Record<PackageTier, string> = TIER_DISPLAY_NAME_BY_LANG.de;

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

/** Returns the tier name in the requested language ("Feier" / "Party"). */
export function getTierName(tier: string, language: SupportedLanguage = 'de'): string {
  return TIER_DISPLAY_NAME_BY_LANG[language]?.[tier as PackageTier] ?? tier;
}

/** "Feier (S)" / "Party (S)" — used in summary, payment, confirmation headers. */
export function getTierDisplayLabel(tier: string, language: SupportedLanguage = 'de'): string {
  const name = getTierName(tier, language);
  const size = TIER_SIZE_LABEL[tier as PackageTier];
  return size ? `${name} (${size})` : name;
}

/** "Berlin Feier" / "Berlin Party" — used to build fallback package names. */
export function getCityTierName(city: string, tier: string, language: SupportedLanguage = 'de'): string {
  const tierName = getTierName(tier, language);
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  return `${cityName} ${tierName}`;
}
