-- Game-Over App Seed Data
-- German cities and fallback packages for MVP

-- =============================================================================
-- SEED CITIES (Germany)
-- =============================================================================
INSERT INTO cities (id, name, country, is_active, hero_image_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', 'Berlin', 'Germany', true, 'https://images.unsplash.com/photo-1560969184-10fe8719e047'),
  ('550e8400-e29b-41d4-a716-446655440102', 'Hamburg', 'Germany', true, 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6'),
  ('550e8400-e29b-41d4-a716-446655440103', 'Hannover', 'Germany', true, 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205')
ON CONFLICT (id) DO NOTHING;
