-- Security hardening: financial integrity + invite-code enumeration

DROP POLICY IF EXISTS "Anyone can lookup active invite codes" ON invite_codes;

CREATE OR REPLACE FUNCTION public.enforce_booking_financial_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ppp                integer;
  v_base               integer;
  v_total_participants integer;
  v_expected_total     integer;
  v_is_service_role    boolean := (auth.role() = 'service_role');
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT price_per_person_cents, COALESCE(base_price_cents, 0)
      INTO v_ppp, v_base
      FROM packages
      WHERE id = NEW.package_id;

    IF v_ppp IS NULL THEN
      RAISE EXCEPTION 'Unknown package_id % — cannot price booking', NEW.package_id;
    END IF;

    IF NEW.paying_participants IS NULL OR NEW.paying_participants < 1 THEN
      RAISE EXCEPTION 'Invalid paying_participants % for booking', NEW.paying_participants;
    END IF;

    v_total_participants := CASE
      WHEN COALESCE(NEW.exclude_honoree, false) THEN NEW.paying_participants + 1
      ELSE NEW.paying_participants
    END;

    v_expected_total := v_ppp * v_total_participants + v_base;

    NEW.package_base_cents := v_expected_total;
    NEW.service_fee_cents  := 0;
    NEW.total_amount_cents := v_expected_total;
    NEW.per_person_cents   := CEIL(v_expected_total::numeric / GREATEST(NEW.paying_participants, 1));

    NEW.payment_status          := 'pending';
    NEW.stripe_payment_intent_id := NULL;
    NEW.deposit_paid_at         := NULL;
    NEW.fully_paid_at           := NULL;
    NEW.deposit_amount_cents    := NULL;
    NEW.remaining_amount_cents  := NULL;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT v_is_service_role THEN
    IF NEW.total_amount_cents      IS DISTINCT FROM OLD.total_amount_cents
       OR NEW.package_base_cents      IS DISTINCT FROM OLD.package_base_cents
       OR NEW.service_fee_cents       IS DISTINCT FROM OLD.service_fee_cents
       OR NEW.per_person_cents        IS DISTINCT FROM OLD.per_person_cents
       OR NEW.paying_participants     IS DISTINCT FROM OLD.paying_participants
       OR NEW.exclude_honoree         IS DISTINCT FROM OLD.exclude_honoree
       OR NEW.payment_status          IS DISTINCT FROM OLD.payment_status
       OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
       OR NEW.deposit_paid_at         IS DISTINCT FROM OLD.deposit_paid_at
       OR NEW.fully_paid_at           IS DISTINCT FROM OLD.fully_paid_at
       OR NEW.deposit_amount_cents    IS DISTINCT FROM OLD.deposit_amount_cents
       OR NEW.remaining_amount_cents  IS DISTINCT FROM OLD.remaining_amount_cents
    THEN
      RAISE EXCEPTION 'Booking financial fields can only be modified by the payment service';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_financial_integrity ON bookings;
CREATE TRIGGER trg_booking_financial_integrity
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_financial_integrity();

CREATE OR REPLACE FUNCTION public.enforce_event_status_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status = 'booked'
     AND auth.role() <> 'service_role'
  THEN
    RAISE EXCEPTION 'Event can only be marked booked by the payment service';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_status_integrity ON events;
CREATE TRIGGER trg_event_status_integrity
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_status_integrity();
