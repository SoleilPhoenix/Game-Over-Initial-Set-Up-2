import { afterAll, vi } from 'vitest';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
const originalJpegLoader = nodeRequire.extensions['.jpeg'];
const originalJpgLoader = nodeRequire.extensions['.jpg'];
const imageLoader: NodeJS.RequireExtensions[string] = (module, filename) => {
  module.exports = filename;
};

nodeRequire.extensions['.jpeg'] = imageLoader;
nodeRequire.extensions['.jpg'] = imageLoader;

vi.unmock('@/constants/packageImages');

const {
  getPackageImage,
  PACKAGE_IMAGE_FALLBACK,
  resolvePackageImage,
} = await import('@/constants/packageImages');

afterAll(() => {
  if (originalJpegLoader) nodeRequire.extensions['.jpeg'] = originalJpegLoader;
  else delete nodeRequire.extensions['.jpeg'];
  if (originalJpgLoader) nodeRequire.extensions['.jpg'] = originalJpgLoader;
  else delete nodeRequire.extensions['.jpg'];
});

describe('resolvePackageImage', () => {
  it('prefers a configured hero image URL', () => {
    const heroImageUrl = 'https://example.com/package.jpg';

    expect(resolvePackageImage({
      heroImageUrl,
      citySlug: 'hamburg',
      tier: 'grand',
      packageId: 'hannover-essential',
    })).toEqual({ uri: heroImageUrl });
  });

  it('resolves a city UUID and tier to the local package image', () => {
    expect(resolvePackageImage({
      cityId: '550e8400-e29b-41d4-a716-446655440102',
      tier: 'grand',
    })).toBe(getPackageImage('hamburg', 'grand'));
  });

  it('ignores a UUID hero value and derives the image from city and tier', () => {
    expect(resolvePackageImage({
      heroImageUrl: '550e8400-e29b-41d4-a716-446655440205',
      cityId: '550e8400-e29b-41d4-a716-446655440102',
      tier: 'classic',
    })).toBe(getPackageImage('hamburg', 'classic'));
  });

  it('ignores a slug hero value and derives the image from city and tier', () => {
    expect(resolvePackageImage({
      heroImageUrl: 'berlin-grand',
      cityId: '550e8400-e29b-41d4-a716-446655440102',
      tier: 'classic',
    })).toBe(getPackageImage('hamburg', 'classic'));
  });

  it('ignores an empty hero value and derives the image from city and tier', () => {
    expect(resolvePackageImage({
      heroImageUrl: '',
      cityId: '550e8400-e29b-41d4-a716-446655440102',
      tier: 'classic',
    })).toBe(getPackageImage('hamburg', 'classic'));
  });

  it('resolves a fallback package slug ID', () => {
    expect(resolvePackageImage({ packageId: 'hannover-classic' }))
      .toBe(getPackageImage('hannover', 'classic'));
  });

  it('uses the named final fallback for unknown input', () => {
    expect(resolvePackageImage({ packageId: 'unknown' })).toBe(
      getPackageImage(PACKAGE_IMAGE_FALLBACK.citySlug, PACKAGE_IMAGE_FALLBACK.tier),
    );
  });
});
