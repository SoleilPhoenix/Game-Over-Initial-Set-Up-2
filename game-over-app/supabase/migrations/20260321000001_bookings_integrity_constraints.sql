-- supabase/migrations/20260321000001_bookings_integrity_constraints.sql
-- Financial integrity constraints for bookings table.
-- These enforce that the DB never holds internally inconsistent payment data.

-- Prevent duplicate payment intents (one PI → one booking).
-- NOT VALID defers validation of existing rows so the migration applies cleanly in production
-- even if legacy data has duplicates. New rows are still validated immediately.
-- After verifying no duplicates exist, run:
--   ALTER TABLE bookings VALIDATE CONSTRAINT bookings_stripe_pi_unique;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_stripe_pi_unique
  UNIQUE (stripe_payment_intent_id)
  NOT VALID
  DEFERRABLE INITIALLY DEFERRED;

-- Total must be positive when set
ALTER TABLE bookings
  ADD CONSTRAINT bookings_total_positive
  CHECK (total_amount_cents IS NULL OR total_amount_cents > 0);

-- Deposit cannot exceed total
ALTER TABLE bookings
  ADD CONSTRAINT bookings_deposit_lte_total
  CHECK (
    deposit_amount_cents IS NULL
    OR total_amount_cents IS NULL
    OR deposit_amount_cents <= total_amount_cents
  );

-- Remaining cannot be negative
ALTER TABLE bookings
  ADD CONSTRAINT bookings_remaining_non_negative
  CHECK (remaining_amount_cents IS NULL OR remaining_amount_cents >= 0);
