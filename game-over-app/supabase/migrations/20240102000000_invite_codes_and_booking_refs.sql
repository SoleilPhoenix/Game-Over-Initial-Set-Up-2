-- Migration: Add invite_codes table and booking reference numbers
-- Created: 2024-01-02

-- ============================================================================
-- INVITE CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for code lookups
CREATE INDEX idx_invite_codes_code ON invite_codes(code) WHERE is_active = true;
CREATE INDEX idx_invite_codes_event_id ON invite_codes(event_id);

-- RLS Policies for invite_codes
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Event organizers can create and manage invite codes
CREATE POLICY "Event organizers can create invite codes"
  ON invite_codes FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Event organizers can view their invite codes"
  ON invite_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Event organizers can update their invite codes"
  ON invite_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Anyone can look up an active invite code (for joining)
CREATE POLICY "Anyone can lookup active invite codes"
  ON invite_codes FOR SELECT
  USING (
    is_active = true AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    (max_uses IS NULL OR use_count < max_uses)
  );

-- ============================================================================
-- BOOKING REFERENCE NUMBERS
-- ============================================================================

-- Add reference_number column to bookings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'reference_number'
  ) THEN
    ALTER TABLE bookings ADD COLUMN reference_number TEXT UNIQUE;
  END IF;
END $$;

-- Create index for reference number lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reference_number ON bookings(reference_number) WHERE reference_number IS NOT NULL;

-- Function to generate booking reference number
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate reference: GO-XXXXXX (6 alphanumeric chars)
    ref := 'GO-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM bookings WHERE reference_number = ref) INTO exists_already;

    -- Exit loop if unique
    EXIT WHEN NOT exists_already;
  END LOOP;

  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate reference number on booking creation
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_booking_reference ON bookings;
CREATE TRIGGER trigger_set_booking_reference
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_reference();

-- ============================================================================
-- UPDATE TIMESTAMPS TRIGGER FOR INVITE_CODES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_invite_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invite_codes_timestamp
  BEFORE UPDATE ON invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_invite_codes_updated_at();
