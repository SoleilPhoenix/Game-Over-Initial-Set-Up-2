-- Service fee removed from product — package prices are now final all-in.
-- The bookings.service_fee_cents column is kept (NOT NULL) for historical
-- bookings that paid the legacy 10% fee, but new bookings always send 0.
-- This migration sets a DEFAULT of 0 so future inserts can omit the field
-- without violating the NOT NULL constraint.

ALTER TABLE bookings
  ALTER COLUMN service_fee_cents SET DEFAULT 0;
