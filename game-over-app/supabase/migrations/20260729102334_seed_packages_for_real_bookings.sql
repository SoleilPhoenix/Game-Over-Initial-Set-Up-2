-- Seed the packages table so real bookings can happen.
--
-- Why this matters far beyond "some missing rows":
-- `packages` was empty, so the app fell back to its hardcoded package list, whose ids are
-- slugs ("hamburg-classic") rather than UUIDs. app/booking/[eventId]/payment.tsx derives
--   isFallbackPackage   = !UUID_REGEX.test(activePkg.id)
--   useSimulatedPayment = isDraft || IS_E2E || !STRIPE_KEY || isFallbackPackage
-- so isFallbackPackage was ALWAYS true and every payment took the demo branch, regardless
-- of the Stripe key being set. The demo branch calls confirm-demo-booking, which only does
-- `update events set status = 'booked'` and never inserts into `bookings`.
--
-- Consequences that all trace back to this one empty table:
--   * no bookings row -> no reference_number, so the 24h briefing printed the GO-XXXXXX placeholder
--   * no package_id   -> the briefing fell back to "Classic (M)" for every event
--   * process-payment-reminders queries `bookings`; against an empty table it can never find
--     anything, so it could never remind and never auto-cancel. Its 200 OK was honest but hollow.
--
-- With real UUID packages the normal Stripe path engages and creates proper booking rows.
-- The project runs pk_test_/sk_test_ keys, so that path is Stripe TEST mode: real payment
-- sheet, test cards, no money moved, no fees. Switching to live keys is a separate,
-- deliberate step.
--
-- Values mirror src/constants/packageTiers.ts (TIER_PRICE_PER_PERSON_CENTS) and the
-- FALLBACK_PKG map in src/hooks/useBookingFlow.ts, so seeded and fallback pricing agree.
-- Prices are final all-in per person; there is no separate service fee, hence
-- base_price_cents = 0.
--
-- Ids are fixed rather than gen_random_uuid() so the migration is idempotent and every
-- environment ends up with the same ids. They continue the cities numbering
-- (...4401xx = cities, ...4402xx = packages).
--
-- Display names: the UI resolves the label from `tier` + active language
-- (app/create-event/packages.tsx: `getTierName(pkg.tier, language) || pkg.name`), so the
-- German names stored here are only a fallback label, not what users normally see.

insert into public.packages
  (id, name, tier, city_id, base_price_cents, price_per_person_cents, is_active)
values
  -- Berlin
  ('550e8400-e29b-41d4-a716-446655440201', 'Berlin Feier',     'essential', '550e8400-e29b-41d4-a716-446655440101', 0, 12900, true),
  ('550e8400-e29b-41d4-a716-446655440202', 'Berlin Rausch',    'classic',   '550e8400-e29b-41d4-a716-446655440101', 0, 17900, true),
  ('550e8400-e29b-41d4-a716-446655440203', 'Berlin Legende',   'grand',     '550e8400-e29b-41d4-a716-446655440101', 0, 22900, true),
  -- Hamburg
  ('550e8400-e29b-41d4-a716-446655440204', 'Hamburg Feier',    'essential', '550e8400-e29b-41d4-a716-446655440102', 0, 12900, true),
  ('550e8400-e29b-41d4-a716-446655440205', 'Hamburg Rausch',   'classic',   '550e8400-e29b-41d4-a716-446655440102', 0, 17900, true),
  ('550e8400-e29b-41d4-a716-446655440206', 'Hamburg Legende',  'grand',     '550e8400-e29b-41d4-a716-446655440102', 0, 22900, true),
  -- Hannover
  ('550e8400-e29b-41d4-a716-446655440207', 'Hannover Feier',   'essential', '550e8400-e29b-41d4-a716-446655440103', 0, 12900, true),
  ('550e8400-e29b-41d4-a716-446655440208', 'Hannover Rausch',  'classic',   '550e8400-e29b-41d4-a716-446655440103', 0, 17900, true),
  ('550e8400-e29b-41d4-a716-446655440209', 'Hannover Legende', 'grand',     '550e8400-e29b-41d4-a716-446655440103', 0, 22900, true)
on conflict (id) do update
  set name                   = excluded.name,
      tier                   = excluded.tier,
      city_id                = excluded.city_id,
      base_price_cents       = excluded.base_price_cents,
      price_per_person_cents = excluded.price_per_person_cents,
      is_active              = excluded.is_active,
      updated_at             = now();
