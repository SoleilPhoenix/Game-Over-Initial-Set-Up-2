-- Repairs notification rows written before the notification cleanup in ae6ece881.
--
-- Two defects, both invisible from the client code because they live in the data:
--
--  1. `action_url` was never set by any insert site, so every row in the table is
--     a dead tap. NotificationItem has always routed on that column.
--  2. `guest_profile_updated` was merged into `guest_data_changed`, so the old
--     type no longer resolves in NOTIFICATION_CONFIG and falls through to the
--     orange default bell, which wrongly reads as "you must act".
--
-- The client keeps a legacy alias for (2) as a belt-and-braces measure, so a row
-- that this migration misses still renders green rather than reverting to orange.

-- 1. Give the existing rows somewhere to go.
update public.notifications
set action_url = '/event/' || event_id || '/budget'
where action_url is null
  and event_id is not null
  and type in ('payment_claimed', 'payment_reminder', 'payment_failed', 'refund_due');

update public.notifications
set action_url = '/event/' || event_id || '/participants'
where action_url is null
  and event_id is not null
  and type in ('guest_joined', 'guest_data_changed', 'guest_profile_updated', 'new_participant', 'invite_accepted');

-- 2. `guest_joined` stored its text pre-formatted in English. Recover the guest
--    name out of that fixed English sentence into `metadata`, so the row renders
--    in the reader's own language from now on, exactly like guest_data_changed.
update public.notifications
set metadata = jsonb_build_object(
      'guestName',
      substring(body from '^(.*) has joined your event\.$')
    )
where type = 'guest_joined'
  and metadata is null
  and body ~ '^.+ has joined your event\.$';

-- Rows whose name could not be recovered keep their stored English text; there is
-- no reliable name to localize with, and inventing one would be worse than a
-- stale string on a handful of historic rows.
