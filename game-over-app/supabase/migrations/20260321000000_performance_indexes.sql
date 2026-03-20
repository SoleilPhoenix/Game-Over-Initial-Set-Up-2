-- supabase/migrations/20260321000000_performance_indexes.sql
-- Performance indexes identified by Database Optimizer analysis.
-- All use CONCURRENTLY to avoid locking production tables during apply.
-- Apply via: supabase db push OR Supabase SQL Editor.
-- NOTE: CONCURRENTLY cannot run inside a transaction block — run each statement individually in SQL Editor.

-- 1. Events by owner — hit on every app start (getByUser query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_created_by_created_at
  ON events (created_by, created_at DESC)
  WHERE deleted_at IS NULL;

-- 2. Event participants by user + role — used by guest filter and invite acceptance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_participants_user_role
  ON event_participants (user_id, role);

-- 3. Messages by channel — hit on every chat open
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_created_at
  ON messages (channel_id, created_at DESC);

-- 4. Unread notifications — hit on every bell counter render
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- 5. Bookings by event — used by useBooking hook on every event detail open
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_event_id
  ON bookings (event_id);
