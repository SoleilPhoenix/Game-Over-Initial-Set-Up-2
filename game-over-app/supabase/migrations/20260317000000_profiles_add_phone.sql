-- Add phone column to profiles table
-- Required for storing guest phone numbers collected during invite wizard onboarding

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
