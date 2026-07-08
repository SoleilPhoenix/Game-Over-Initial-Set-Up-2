-- =============================================================================
-- Notification content safety + profile email immutability
-- =============================================================================
-- Addresses:
--   H4  Guests/organizers could insert notifications with arbitrary title/body
--       and an arbitrary action_url (external phishing link). We now reject
--       non-internal action_urls and cap text length for client inserts.
--   L3  profiles.email was client-updatable, desyncing the auth email that
--       send-email resolves recipients by. Email is now immutable to clients.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- H4: constrain client-inserted notifications. The Stripe webhook and other
-- service-role callers are trusted and bypass these checks.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_notification_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    -- action_url must be an internal app route (relative path), never an
    -- external URL that could be used for phishing from a push/in-app tap.
    IF NEW.action_url IS NOT NULL AND NEW.action_url !~ '^/[A-Za-z0-9/_%.\-\?=&]*$' THEN
      RAISE EXCEPTION 'notification action_url must be an internal path';
    END IF;

    IF char_length(COALESCE(NEW.title, '')) > 120 THEN
      RAISE EXCEPTION 'notification title too long';
    END IF;

    IF char_length(COALESCE(NEW.body, '')) > 500 THEN
      RAISE EXCEPTION 'notification body too long';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_safety ON notifications;
CREATE TRIGGER trg_notification_safety
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_notification_safety();

-- -----------------------------------------------------------------------------
-- L3: profiles UPDATE gets a WITH CHECK (was missing) and email is frozen for
-- client writes so it cannot drift away from the auth.users email.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.enforce_profile_email_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email cannot be changed directly; update it through account settings';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_email_immutable ON profiles;
CREATE TRIGGER trg_profile_email_immutable
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_email_immutable();
