/**
 * Curated Package Images
 * City × tier images for event hero images and package cards
 * All images from Unsplash (free for commercial use)
 */

export interface PackageImageSet {
  hero: string;
  thumbnail: string;
}

const PACKAGE_IMAGES: Record<string, Record<string, PackageImageSet>> = {
  berlin: {
    essential: {
      hero: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&q=80',
    },
    classic: {
      hero: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400&q=80',
    },
    grand: {
      hero: 'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=400&q=80',
    },
  },
  hamburg: {
    essential: {
      // Speicherstadt canal view
      hero: 'https://images.unsplash.com/photo-1422360902398-0a91ff2c1a1f?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1422360902398-0a91ff2c1a1f?w=400&q=80',
    },
    classic: {
      // Elbe river + Elbphilharmonie
      hero: 'https://images.unsplash.com/photo-1452696193712-6cabf5103b63?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1452696193712-6cabf5103b63?w=400&q=80',
    },
    grand: {
      // Hamburg harbor architecture
      hero: 'https://images.unsplash.com/photo-1526455585196-c3b036b0d723?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1526455585196-c3b036b0d723?w=400&q=80',
    },
  },
  hannover: {
    essential: {
      // Hannover Rathaus + lake
      hero: 'https://images.unsplash.com/photo-1718001396969-17c05932deb5?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1718001396969-17c05932deb5?w=400&q=80',
    },
    classic: {
      // Hannover cityscape with clock tower
      hero: 'https://images.unsplash.com/photo-1715439008680-a02afc9afcca?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1715439008680-a02afc9afcca?w=400&q=80',
    },
    grand: {
      // Herrenhausen palace + fountain
      hero: 'https://images.unsplash.com/photo-1690138988740-410136b760a1?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1690138988740-410136b760a1?w=400&q=80',
    },
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
 * Get curated image set for a city + tier combination.
 * Falls back to city essential, then Berlin essential.
 */
export function getPackageImage(citySlug: string, tier: string): PackageImageSet {
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
export function getCityImage(citySlug: string): PackageImageSet {
  return getPackageImage(citySlug, 'essential');
}
