-- Payment Reminders System
-- Adds deposit/payment tracking to bookings, creates payment_reminders table,
-- and creates user_push_tokens table (referenced by usePushNotifications.ts)

-- =============================================================================
-- ADD DEPOSIT/PAYMENT COLUMNS TO BOOKINGS
-- =============================================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fully_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS remaining_amount_cents INTEGER;

-- =============================================================================
-- PAYMENT REMINDERS TABLE
-- Tracks which reminders have been sent to prevent duplicates
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days_before_event INTEGER NOT NULL,
  reminder_type TEXT NOT NULL, -- 'normal', 'moderate', 'urgent', 'final'
  sent_at TIMESTAMPTZ DEFAULT now(),
  push_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  notification_id UUID REFERENCES notifications(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, days_before_event)
);

CREATE INDEX idx_payment_reminders_booking_id ON payment_reminders(booking_id);
CREATE INDEX idx_payment_reminders_user_id ON payment_reminders(user_id);
CREATE INDEX idx_payment_reminders_event_id ON payment_reminders(event_id);

-- =============================================================================
-- USER PUSH TOKENS TABLE
-- Referenced by usePushNotifications.ts but was missing from schema
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios', 'android'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Payment Reminders: users can view their own, service role manages all
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment reminders"
  ON payment_reminders FOR SELECT
  USING (user_id = auth.uid());

-- User Push Tokens: users can manage their own tokens
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push tokens"
  ON user_push_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own push tokens"
  ON user_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push tokens"
  ON user_push_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own push tokens"
  ON user_push_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Updated_at trigger for user_push_tokens
CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
