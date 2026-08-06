/**
 * Local Package Images
 * City x tier images for event hero images and package cards
 * Single source of truth — all local assets, no remote URLs
 */

import { ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';
import { CITY_UUID_TO_SLUG } from './citySlugMap';

const PACKAGE_IMAGES: Record<string, Record<string, ImageSourcePropType>> = {
  berlin: {
    essential: require('./Package_Visuals/Berlin/Berlin - Paket S.jpeg'),
    classic: require('./Package_Visuals/Berlin/Berlin - Paket M.jpeg'),
    grand: require('./Package_Visuals/Berlin/Berlin - Paket L.jpeg'),
  },
  hamburg: {
    essential: require('./Package_Visuals/Hamburg/Hamburg - Paket S.jpeg'),
    classic: require('./Package_Visuals/Hamburg/Hamburg - Paket M.jpeg'),
    grand: require('./Package_Visuals/Hamburg/Hamburg - Paket L.jpeg'),
  },
  hannover: {
    essential: require('./Package_Visuals/Hannover/Hannover - Paket S.jpeg'),
    classic: require('./Package_Visuals/Hannover/Hannover - Paket M.jpg'),
    grand: require('./Package_Visuals/Hannover/Hannover - Paket L.jpeg'),
  },
};

/**
 * Map package tier names to image keys
 */
const TIER_MAP: Record<string, string> = {
  essential: 'essential',
  classic: 'classic',
  grand: 'grand',
  s: 'essential',
  m: 'classic',
  l: 'grand',
};

/**
 * Get local image asset for a city + tier combination.
 * Falls back to city essential, then Berlin essential.
 */
export function getPackageImage(citySlug: string, tier: string): ImageSourcePropType {
  const city = citySlug.toLowerCase();
  const tierKey = TIER_MAP[tier.toLowerCase()] || 'essential';

  return (
    PACKAGE_IMAGES[city]?.[tierKey] ||
    PACKAGE_IMAGES[city]?.essential ||
    PACKAGE_IMAGES.berlin.essential
  );
}

export const PACKAGE_IMAGE_FALLBACK = {
  citySlug: 'berlin',
  tier: 'essential',
} as const;

interface PackageImageFallback {
  citySlug: string;
  tier: string;
}

export interface PackageImageHints {
  heroImageUrl?: string | ImageSourcePropType | null;
  cityId?: string | null;
  citySlug?: string | null;
  tier?: string | null;
  packageId?: string | null;
  fallback?: PackageImageFallback;
}

/** Only values with an explicit image URL scheme may override derived images. */
export function isImageUrl(value: unknown): boolean {
  return typeof value === 'string' && /^(?:https?:\/\/|data:)/i.test(value);
}

/**
 * Resolve the image for a package from the strongest available package data.
 * Only package IDs shaped like "<city>-<tier>" are treated as fallback slugs.
 */
export function resolvePackageImage({
  heroImageUrl,
  cityId,
  citySlug,
  tier,
  packageId,
  fallback = PACKAGE_IMAGE_FALLBACK,
}: PackageImageHints): ImageSourcePropType {
  if (typeof heroImageUrl === 'string' && isImageUrl(heroImageUrl)) {
    return resolveImageSource(heroImageUrl) as ImageSourcePropType;
  }

  const resolvedCitySlug = citySlug || (cityId ? CITY_UUID_TO_SLUG[cityId] : undefined);
  if (resolvedCitySlug && tier) {
    return getPackageImage(resolvedCitySlug, tier);
  }

  const slugMatch = packageId?.match(/^(.+)-(essential|classic|grand)$/i);
  if (slugMatch) {
    return getPackageImage(slugMatch[1], slugMatch[2]);
  }

  return getPackageImage(fallback.citySlug, fallback.tier);
}

/**
 * Get city image (defaults to essential tier)
 */
export function getCityImage(citySlug: string): ImageSourcePropType {
  return getPackageImage(citySlug, 'essential');
}

/**
 * Extract tier from a package slug like "hamburg-classic" → "classic"
 */
export function getTierFromSlug(slug: string | null | undefined): string {
  if (!slug) return 'essential';
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];
  if (lastPart && TIER_MAP[lastPart.toLowerCase()]) {
    return lastPart.toLowerCase();
  }
  return 'essential';
}

/**
 * Get the correct tier-aware image for an event.
 * Extracts city slug and tier from booking/event data.
 */
export function getEventImage(
  citySlug: string,
  packageSlug?: string | null,
): ImageSourcePropType {
  const tier = getTierFromSlug(packageSlug);
  return getPackageImage(citySlug, tier);
}

/**
 * Resolve an image source that may be a DB URL (string), a package slug, or a local asset (number).
 * Package slugs (e.g. "hamburg-classic") are resolved to local assets via getEventImage().
 * Returns the correct source prop for <Image>, <ImageBackground>, or <OptimizedImage>.
 */
export function resolveImageSource(source: string | number | ImageSourcePropType): { uri: string } | number {
  if (typeof source === 'string') {
    // Remote URL — use as-is
    if (isImageUrl(source)) {
      return { uri: source };
    }
    // Package slug (e.g. "hamburg-classic") — resolve to local asset
    const parts = source.split('-');
    if (parts.length >= 2) {
      const city = parts.slice(0, -1).join('-');
      const tier = parts[parts.length - 1];
      return getPackageImage(city, tier) as number;
    }
    // Single word — treat as city slug, essential tier
    return getPackageImage(source, 'essential') as number;
  }
  // number (require result) or already an object — pass through
  return source as { uri: string } | number;
}

/**
 * Preload all package images into memory.
 * In Expo Go, require() images are fetched from Metro over HTTP —
 * preloading during splash screen eliminates visible loading delays.
 */
export async function preloadPackageImages(): Promise<void> {
  const allImages: number[] = [];
  for (const city of Object.values(PACKAGE_IMAGES)) {
    for (const img of Object.values(city)) {
      if (typeof img === 'number') allImages.push(img);
    }
  }
  await Asset.loadAsync(allImages);
}
