-- Guest-writable "I claim I paid" signal. Sets event_participants.payment_claimed_at
-- for the calling user only. The organizer still confirms the real payment_status
-- (enforced by enforce_participant_update_integrity). Guests cannot touch
-- payment_status/contribution_amount via this path.
--
-- Context: the payment_claimed_at column already existed (security_followups
-- migration) but was unused. The integrity trigger locks role/payment_status/
-- contribution_amount_cents for non-organizers but intentionally leaves
-- payment_claimed_at writable, so this is the correct home for the guest claim.
CREATE OR REPLACE FUNCTION public.mark_payment_claimed(p_event_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.event_participants
     SET payment_claimed_at = COALESCE(payment_claimed_at, NOW())
   WHERE event_id = p_event_id
     AND user_id  = v_uid
     AND payment_status <> 'paid';  -- no-op once the organizer has confirmed

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_payment_claimed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_payment_claimed(uuid) TO authenticated;
