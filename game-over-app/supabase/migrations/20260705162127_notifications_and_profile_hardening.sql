-- Notification content safety + profile email immutability

CREATE OR REPLACE FUNCTION public.enforce_notification_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
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
