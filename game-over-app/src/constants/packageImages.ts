/**
 * Local Package Images
 * City x tier images for event hero images and package cards
 * Single source of truth — all local assets, no remote URLs
 */

import { ImageSourcePropType } from 'react-native';

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
 * Resolve an image source that may be a DB URL (string) or a local asset (number).
 * Returns the correct source prop for <Image>, <ImageBackground>, or <OptimizedImage>.
 */
export function resolveImageSource(source: string | number | ImageSourcePropType): { uri: string } | number {
  if (typeof source === 'string') {
    return { uri: source };
  }
  // number (require result) or already an object — pass through
  return source as { uri: string } | number;
}
