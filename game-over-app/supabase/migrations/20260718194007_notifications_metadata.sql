-- Add a structured metadata column to notifications so notification text can be
-- rendered in the viewer's language at display time (rather than being frozen in
-- the language of whoever created the notification).
--
-- First consumer: guest_data_changed notifications, which are created on the
-- guest's device (guest's language) but shown to the organizer (possibly a
-- different language). The metadata carries the structured diff; NotificationItem
-- localizes it. Additive + nullable — safe, non-breaking.
alter table public.notifications
  add column if not exists metadata jsonb;
