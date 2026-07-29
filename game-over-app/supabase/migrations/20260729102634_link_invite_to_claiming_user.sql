-- Record WHO redeemed an invite code.
--
-- Until now accept_invite() inserted the participant and bumped use_count, but stored no
-- link back to the person. That gap matters for outbound mail: the organizer types an
-- address into invite_codes.guest_email, but the guest may well have signed up with a
-- different one. Without a link, the 24h briefing can only reach the typed address - the
-- one the guest may never read - and matching the two by email is circular, because it
-- only succeeds in exactly the case that needs no fixing.
--
-- With claimed_by, send-final-briefing can prefer the address the guest actually
-- registered with and fall back to the invited address for anyone who has not joined yet.
--
-- Authorization logic is deliberately untouched: same guards, same order, same FOR UPDATE
-- lock. The only change inside the function is one extra column in the existing UPDATE.

alter table public.invite_codes
  add column if not exists claimed_by uuid references public.profiles(id) on delete set null;

comment on column public.invite_codes.claimed_by is
  'Profile that redeemed this code via accept_invite(). NULL while unredeemed.';

create index if not exists invite_codes_claimed_by_idx
  on public.invite_codes (claimed_by) where claimed_by is not null;

-- Backfill what can be established safely: a participant of the same event whose profile
-- email equals the invited address. Anyone who signed up under a different address stays
-- NULL, which is correct - we genuinely do not know, and guessing would mail a stranger.
update public.invite_codes ic
   set claimed_by = ep.user_id
  from public.event_participants ep
  join public.profiles pr on pr.id = ep.user_id
 where ep.event_id = ic.event_id
   and ic.claimed_by is null
   and ic.guest_email is not null
   and lower(pr.email) = lower(ic.guest_email);

create or replace function public.accept_invite(p_code text)
returns table(success boolean, event_id uuid, reason text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_invite invite_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'unauthenticated'::text;
    RETURN;
  END IF;

  SELECT * INTO v_invite
    FROM invite_codes
    WHERE code = upper(p_code)
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'not_found'::text;
    RETURN;
  END IF;

  IF NOT v_invite.is_active THEN
    RETURN QUERY SELECT false, v_invite.event_id, 'inactive'::text;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= NOW() THEN
    RETURN QUERY SELECT false, v_invite.event_id, 'expired'::text;
    RETURN;
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN QUERY SELECT false, v_invite.event_id, 'max_uses_reached'::text;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = v_invite.event_id AND ep.user_id = v_uid
  ) THEN
    -- Already a participant, but the code may still be unclaimed if they joined by
    -- another route. Record it so the briefing can reach their real address.
    UPDATE invite_codes
      SET claimed_by = COALESCE(claimed_by, v_uid)
      WHERE id = v_invite.id;
    RETURN QUERY SELECT true, v_invite.event_id, 'already_participant'::text;
    RETURN;
  END IF;

  INSERT INTO event_participants (event_id, user_id, role, invited_via, confirmed_at)
  VALUES (v_invite.event_id, v_uid, 'guest', 'link', NOW());

  UPDATE invite_codes
    SET use_count  = use_count + 1,
        claimed_by = COALESCE(claimed_by, v_uid)
    WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_invite.event_id, NULL::text;
END;
$function$;
