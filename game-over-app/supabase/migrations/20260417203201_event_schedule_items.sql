-- supabase/migrations/20260418000000_event_schedule_items.sql
-- Day-of-event schedule: ordered timeline of activities for the event date.
-- Generated from package features at booking time, editable by organizer.

CREATE TABLE IF NOT EXISTS event_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120 CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  title TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_schedule_items_event_id_idx
  ON event_schedule_items(event_id, sort_order);

-- updated_at trigger (reuse existing helper)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'event_schedule_items_updated_at') THEN
    CREATE TRIGGER event_schedule_items_updated_at
      BEFORE UPDATE ON event_schedule_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE event_schedule_items ENABLE ROW LEVEL SECURITY;

-- SELECT: any participant of the event can read the schedule
DROP POLICY IF EXISTS "Schedule readable by participants" ON event_schedule_items;
CREATE POLICY "Schedule readable by participants" ON event_schedule_items
  FOR SELECT USING (
    is_event_creator(event_id) OR is_event_participant(event_id)
  );

-- INSERT/UPDATE/DELETE: only the event creator (organizer) can mutate
DROP POLICY IF EXISTS "Schedule mutable by organizer" ON event_schedule_items;
CREATE POLICY "Schedule mutable by organizer" ON event_schedule_items
  FOR ALL USING (is_event_creator(event_id))
  WITH CHECK (is_event_creator(event_id));
