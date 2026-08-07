-- Remove notifications referencing soft-deleted (cancelled) events
DELETE FROM notifications
WHERE event_id IN (SELECT id FROM events WHERE status = 'cancelled');

-- Trigger: also auto-cleanup notifications when an event transitions to 'cancelled'.
-- This keeps the inbox clean without relying on client-side filtering.
CREATE OR REPLACE FUNCTION delete_notifications_on_event_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    DELETE FROM notifications WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_notifications_on_event_cancel ON events;
CREATE TRIGGER trg_delete_notifications_on_event_cancel
AFTER UPDATE OF status ON events
FOR EACH ROW
EXECUTE FUNCTION delete_notifications_on_event_cancel();
