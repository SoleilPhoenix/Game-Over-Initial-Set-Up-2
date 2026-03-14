/**
 * Maps city UUIDs to slugs for image lookup.
 * NOTE: Add new city UUIDs here whenever new cities are seeded to the database.
 * The fallback in invite/[code].tsx uses cityName.toLowerCase() if a UUID is not found.
 */
export const CITY_UUID_TO_SLUG: Record<string, string> = {
  '550e8400-e29b-41d4-a716-446655440101': 'berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'hannover',
};
