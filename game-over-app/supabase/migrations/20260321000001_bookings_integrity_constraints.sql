-- supabase/migrations/20260321000001_bookings_integrity_constraints.sql
-- Financial integrity constraints for bookings table.
-- All wrapped in existence checks so the migration is idempotent (safe to re-run).

DO $$
BEGIN
  -- Prevent duplicate payment intents (one PI → one booking).
  -- Only adds the constraint if it doesn't exist AND there are no existing duplicates.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_stripe_pi_unique'
      AND conrelid = 'bookings'::regclass
  ) THEN
    IF NOT EXISTS (
      SELECT stripe_payment_intent_id FROM bookings
      WHERE stripe_payment_intent_id IS NOT NULL
      GROUP BY stripe_payment_intent_id HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_stripe_pi_unique
        UNIQUE (stripe_payment_intent_id)
        DEFERRABLE INITIALLY DEFERRED;
    ELSE
      RAISE WARNING 'bookings_stripe_pi_unique NOT added: duplicate stripe_payment_intent_id values exist.';
    END IF;
  END IF;

  -- Total must be positive when set
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_total_positive'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_total_positive
      CHECK (total_amount_cents IS NULL OR total_amount_cents > 0);
  END IF;

  -- Deposit cannot exceed total
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_deposit_lte_total'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_deposit_lte_total
      CHECK (
        deposit_amount_cents IS NULL
        OR total_amount_cents IS NULL
        OR deposit_amount_cents <= total_amount_cents
      );
  END IF;

  -- Remaining cannot be negative
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_remaining_non_negative'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_remaining_non_negative
      CHECK (remaining_amount_cents IS NULL OR remaining_amount_cents >= 0);
  END IF;
END $$;
