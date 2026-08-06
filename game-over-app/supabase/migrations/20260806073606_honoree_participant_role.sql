alter table public.invite_codes
  add column if not exists is_honoree boolean not null default false;

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
  VALUES (
    v_invite.event_id,
    v_uid,
    CASE
      WHEN v_invite.is_honoree THEN 'honoree'::participant_role
      ELSE 'guest'::participant_role
    END,
    'link',
    NOW()
  );

  UPDATE invite_codes
    SET use_count  = use_count + 1,
        claimed_by = COALESCE(claimed_by, v_uid)
    WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_invite.event_id, NULL::text;
END;
$function$;

drop policy if exists "Event participants can view bookings" on public.bookings;

create policy "Event participants can view bookings"
  on public.bookings for select
  using (
    exists (
      select 1
      from public.event_participants ep
      where ep.event_id = bookings.event_id
        and ep.user_id = auth.uid()
        and ep.role <> 'honoree'::participant_role
    )
  );

create or replace function public.get_my_event_share(p_event_id uuid)
returns table(pays boolean, share_cents integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_role                participant_role;
  v_total_amount_cents  integer;
  v_paying_participants integer;
  v_exclude_honoree     boolean;
BEGIN
  SELECT ep.role
    INTO v_role
    FROM public.event_participants ep
   WHERE ep.event_id = p_event_id
     AND ep.user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  SELECT b.total_amount_cents, b.paying_participants, b.exclude_honoree
    INTO v_total_amount_cents, v_paying_participants, v_exclude_honoree
    FROM public.bookings b
   WHERE b.event_id = p_event_id;

  IF NOT FOUND OR v_paying_participants IS NULL OR v_paying_participants <= 0 THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF v_role = 'honoree'::participant_role AND v_exclude_honoree IS TRUE THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    true,
    CASE
      WHEN v_role = 'organizer'::participant_role THEN
        (
          round(v_total_amount_cents::numeric / 100)
          - floor(v_total_amount_cents::numeric / v_paying_participants / 100)
            * (v_paying_participants - 1)
        )::integer * 100
      ELSE
        (floor(v_total_amount_cents::numeric / v_paying_participants / 100) * 100)::integer
    END;
END;
$function$;

revoke all on function public.get_my_event_share(uuid) from public;
revoke all on function public.get_my_event_share(uuid) from anon;
grant execute on function public.get_my_event_share(uuid) to authenticated;

comment on function public.get_my_event_share(uuid) is
  'Rounding deliberately mirrors splitPerPerson in game-over-app/src/utils/money.ts; both must change together.';
