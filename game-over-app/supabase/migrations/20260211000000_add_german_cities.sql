-- Add German cities (Berlin, Hamburg, Hannover) used by the event wizard
-- These cities were referenced in the wizard UI but never existed in the database,
-- causing "City not found" errors during event creation.

INSERT INTO cities (id, name, country, is_active, hero_image_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', 'Berlin', 'Germany', true, 'https://images.unsplash.com/photo-1560969184-10fe8719e047'),
  ('550e8400-e29b-41d4-a716-446655440102', 'Hamburg', 'Germany', true, 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6'),
  ('550e8400-e29b-41d4-a716-446655440103', 'Hannover', 'Germany', true, 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205')
ON CONFLICT (id) DO NOTHING;

-- Remove US cities and their packages (no longer used)
DELETE FROM packages WHERE city_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006'
);

DELETE FROM cities WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006'
);
