/**
 * Local Package Images
 * City x tier images for event hero images and package cards
 * Single source of truth — all local assets, no remote URLs
 */

import { ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';

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
    if (source.startsWith('http')) {
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
