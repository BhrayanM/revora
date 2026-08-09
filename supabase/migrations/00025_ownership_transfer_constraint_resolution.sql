-- ============================================================================
-- AI Growth - Ownership transfer deferred constraint resolution
-- Phase 14.4D.5 follow-up
--
-- 00024 deliberately gives SECURITY DEFINER functions an empty search_path.
-- Qualify the deferred unique constraint inside the acceptance function so its
-- lookup remains compatible with that hardened search-path posture.
-- ============================================================================

begin;

create or replace function public.accept_organization_ownership_transfer(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_transfer public.organization_ownership_transfers%rowtype;
  v_initiator public.memberships%rowtype;
  v_target public.memberships%rowtype;
  v_active_owner_count integer;
  v_current_owner_id uuid;
begin
  if v_actor_id is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select *
    into v_transfer
  from public.organization_ownership_transfers as transfer
  where transfer.token_hash = p_token_hash
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_transfer.accepted_at is not null then
    return jsonb_build_object('status', 'already_accepted');
  end if;

  if v_transfer.rejected_at is not null then
    return jsonb_build_object('status', 'rejected');
  end if;

  if v_transfer.cancelled_at is not null then
    return jsonb_build_object('status', 'cancelled');
  end if;

  select *
    into v_target
  from public.memberships as membership
  where membership.id = v_transfer.target_membership_id
  for update;

  if not found then
    return jsonb_build_object('status', 'target_unavailable');
  end if;

  if v_transfer.expired_at is not null or v_transfer.expires_at <= now() then
    if v_transfer.expired_at is null then
      update public.organization_ownership_transfers
      set expired_at = now()
      where id = v_transfer.id;

      insert into public.team_audit_events (
        organization_id,
        subject_profile_id,
        event_type,
        metadata
      )
      values (
        v_transfer.organization_id,
        v_target.profile_id,
        'ownership_transfer_expired',
        jsonb_build_object('transfer_id', v_transfer.id)
      );
    end if;

    return jsonb_build_object('status', 'expired');
  end if;

  if not public.current_user_has_current_legal_consent() then
    return jsonb_build_object('status', 'legal_required');
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    return jsonb_build_object('status', 'mfa_required');
  end if;

  if v_target.profile_id <> v_actor_id then
    return jsonb_build_object('status', 'wrong_account');
  end if;

  perform 1
  from public.organizations as organization_row
  where organization_row.id = v_transfer.organization_id
  for update;

  if not found then
    return jsonb_build_object('status', 'organization_unavailable');
  end if;

  select *
    into v_initiator
  from public.memberships as membership
  where membership.id = v_transfer.initiator_membership_id
  for update;

  if not found
    or v_initiator.organization_id <> v_transfer.organization_id
    or v_initiator.role <> 'owner'
    or v_initiator.status <> 'active' then
    return jsonb_build_object('status', 'initiator_unavailable');
  end if;

  if v_target.organization_id <> v_transfer.organization_id
    or v_target.status <> 'active'
    or v_target.role = 'owner' then
    return jsonb_build_object('status', 'target_unavailable');
  end if;

  select count(*)::integer
    into v_active_owner_count
  from public.memberships as membership
  where membership.organization_id = v_transfer.organization_id
    and membership.role = 'owner'
    and membership.status = 'active';

  select membership.id
    into v_current_owner_id
  from public.memberships as membership
  where membership.organization_id = v_transfer.organization_id
    and membership.role = 'owner'
    and membership.status = 'active';

  if v_active_owner_count <> 1 or v_current_owner_id <> v_initiator.id then
    return jsonb_build_object('status', 'owner_state_invalid');
  end if;

  update public.organization_ownership_transfers
  set accepted_at = now(),
      accepted_by = v_actor_id
  where id = v_transfer.id;

  perform set_config('app.ownership_transfer_id', v_transfer.id::text, true);
  set constraints public.memberships_one_active_owner_per_organization deferred;

  update public.memberships
  set role = case
    when id = v_target.id then 'owner'
    when id = v_initiator.id then 'admin'
    else role
  end
  where id in (v_target.id, v_initiator.id);

  select count(*)::integer
    into v_active_owner_count
  from public.memberships as membership
  where membership.organization_id = v_transfer.organization_id
    and membership.role = 'owner'
    and membership.status = 'active';

  select membership.id
    into v_current_owner_id
  from public.memberships as membership
  where membership.organization_id = v_transfer.organization_id
    and membership.role = 'owner'
    and membership.status = 'active';

  if v_active_owner_count <> 1 or v_current_owner_id <> v_target.id then
    raise exception 'Ownership transfer did not preserve exactly one active owner';
  end if;

  insert into public.team_audit_events (
    organization_id,
    actor_profile_id,
    subject_profile_id,
    event_type,
    metadata
  )
  values (
    v_transfer.organization_id,
    v_actor_id,
    v_initiator.profile_id,
    'ownership_transferred',
    jsonb_build_object(
      'transfer_id', v_transfer.id,
      'previous_owner_new_role', 'admin',
      'new_owner_previous_role', v_target.role
    )
  );

  return jsonb_build_object(
    'status', 'transferred',
    'organization_id', v_transfer.organization_id
  );
end;
$$;

revoke execute on function public.accept_organization_ownership_transfer(text)
  from public, anon;
grant execute on function public.accept_organization_ownership_transfer(text)
  to authenticated;

commit;
