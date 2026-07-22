-- Rename package tiers: Essential → Feier, Classic → Rausch, Grand → Legende
-- Internal tier keys (essential/classic/grand) are unchanged — only display names are updated.
UPDATE packages
  SET name = REPLACE(name, 'Essential', 'Feier')
  WHERE tier = 'essential';

UPDATE packages
  SET name = REPLACE(name, 'Classic', 'Rausch')
  WHERE tier = 'classic';

UPDATE packages
  SET name = REPLACE(name, 'Grand', 'Legende')
  WHERE tier = 'grand';
