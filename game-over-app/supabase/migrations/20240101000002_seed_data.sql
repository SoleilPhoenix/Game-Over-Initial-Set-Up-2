-- Game-Over App Seed Data
-- Initial cities and sample packages for MVP

-- =============================================================================
-- SEED CITIES
-- =============================================================================
INSERT INTO cities (id, name, country, is_active, hero_image_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Las Vegas', 'USA', true, 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Miami', 'USA', true, 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Nashville', 'USA', true, 'https://images.unsplash.com/photo-1587162146766-e06b1189b907'),
  ('550e8400-e29b-41d4-a716-446655440004', 'New Orleans', 'USA', true, 'https://images.unsplash.com/photo-1568402102990-bc541580b59f'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Austin', 'USA', true, 'https://images.unsplash.com/photo-1588993608022-e366fbcb3652'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Scottsdale', 'USA', true, 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED PACKAGES - Las Vegas
-- =============================================================================
INSERT INTO packages (id, name, tier, city_id, base_price_cents, price_per_person_cents, description, features, premium_highlights, hero_image_url, rating, review_count, ideal_gathering_size, ideal_energy_level, ideal_vibe) VALUES
-- Las Vegas Essential
('660e8400-e29b-41d4-a716-446655440001', 'Vegas Starter', 'essential', '550e8400-e29b-41d4-a716-446655440001',
 49900, 7500, 'Perfect introduction to Vegas nightlife',
 '["Club entry for group", "One bottle service", "Party bus pickup", "Professional photographer (1 hr)"]'::jsonb,
 '["Skip-the-line entry", "Dedicated host"]'::jsonb,
 NULL,
 4.5, 128, ARRAY['intimate', 'small_group'], ARRAY['moderate', 'high_energy'], ARRAY['party', 'nightlife']),

-- Las Vegas Classic
('660e8400-e29b-41d4-a716-446655440002', 'Vegas VIP Experience', 'classic', '550e8400-e29b-41d4-a716-446655440001',
 129900, 12500, 'The ultimate Vegas party package',
 '["VIP club entry", "Premium bottle service", "Luxury limo service", "Professional photographer (3 hrs)", "Pool party access", "Dinner reservation"]'::jsonb,
 '["Private cabana", "Meet & greet with DJ", "Custom party favors"]'::jsonb,
 NULL,
 4.8, 256, ARRAY['small_group', 'party'], ARRAY['high_energy'], ARRAY['luxury', 'party', 'nightlife']),

-- Las Vegas Grand
('660e8400-e29b-41d4-a716-446655440003', 'Vegas Grand Celebration', 'grand', '550e8400-e29b-41d4-a716-446655440001',
 249900, 20000, 'No-limits Vegas experience',
 '["Presidential suite access", "Unlimited bottle service", "Private jet arrival", "24/7 concierge", "VIP everywhere", "Private chef dinner", "Spa day package"]'::jsonb,
 '["Celebrity meet & greet", "Private pool party", "Custom itinerary planning"]'::jsonb,
 NULL,
 4.9, 64, ARRAY['party'], ARRAY['high_energy'], ARRAY['luxury', 'exclusive', 'party']),

-- =============================================================================
-- SEED PACKAGES - Miami
-- =============================================================================
-- Miami Essential
('660e8400-e29b-41d4-a716-446655440004', 'South Beach Basics', 'essential', '550e8400-e29b-41d4-a716-446655440002',
 44900, 6500, 'Classic South Beach experience',
 '["Beach day setup", "Club entry", "Welcome drinks", "Group dinner"]'::jsonb,
 '["Beachside service", "Local guide"]'::jsonb,
 NULL,
 4.4, 96, ARRAY['intimate', 'small_group'], ARRAY['moderate'], ARRAY['beach', 'relaxed', 'nightlife']),

-- Miami Classic
('660e8400-e29b-41d4-a716-446655440005', 'Miami Heat Package', 'classic', '550e8400-e29b-41d4-a716-446655440002',
 119900, 11500, 'Full Miami experience',
 '["Yacht charter (4 hrs)", "VIP club access", "Cabana at day club", "Professional photography", "Group brunch", "Spa treatments"]'::jsonb,
 '["Private yacht DJ", "Chef on board", "Water toys included"]'::jsonb,
 NULL,
 4.7, 184, ARRAY['small_group', 'party'], ARRAY['high_energy'], ARRAY['luxury', 'beach', 'party']),

-- =============================================================================
-- SEED PACKAGES - Nashville
-- =============================================================================
-- Nashville Essential
('660e8400-e29b-41d4-a716-446655440006', 'Broadway Bound', 'essential', '550e8400-e29b-41d4-a716-446655440003',
 39900, 5500, 'Nashville honky-tonk adventure',
 '["Bar crawl guide", "VIP bar access", "Cowboy boots rental", "Group photo session"]'::jsonb,
 '["Local insider tips", "Custom playlist"]'::jsonb,
 NULL,
 4.6, 112, ARRAY['intimate', 'small_group'], ARRAY['moderate', 'high_energy'], ARRAY['country', 'party', 'music']),

-- Nashville Classic
('660e8400-e29b-41d4-a716-446655440007', 'Nashville Nights', 'classic', '550e8400-e29b-41d4-a716-446655440003',
 99900, 10000, 'Premium Nashville experience',
 '["Party bus tour", "Private songwriter session", "VIP at top venues", "BBQ dinner", "Professional photos", "Matching outfits"]'::jsonb,
 '["Recording studio session", "Meet local artists", "Custom song written"]'::jsonb,
 NULL,
 4.8, 156, ARRAY['small_group', 'party'], ARRAY['high_energy'], ARRAY['country', 'music', 'party'])

ON CONFLICT (id) DO NOTHING;
