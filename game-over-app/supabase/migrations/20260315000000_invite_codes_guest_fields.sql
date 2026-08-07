-- Migration: Add guest contact fields to invite_codes
-- These allow pre-filling the signup form when a guest enters their invite code.

ALTER TABLE invite_codes
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_last_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_email      TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone      TEXT;
