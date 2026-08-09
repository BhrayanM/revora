-- ============================================================================
-- AI Growth - Secure organization ownership transfers
-- Phase 14.4D.5 (Option B: prospective enforcement)
--
-- Existing historical ownerless organizations are deliberately not assigned an
-- owner here. This migration prevents multiple active owners prospectively and
-- permits an ownership change only through the narrowly scoped acceptance RPC.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- PROSPECTIVE SINGLE-OWNER INVARIANT
-- ---------------------------------------------------------------------------
-- NULLs are distinct in a unique constraint. A generated value therefore
-- enforces at most one active owner per organization while allowing the known
-- historical ownerless records to remain untouched for manual remediation.
alter table public.memberships
  add column active_owner_organization_id uuid
    generated always as (
      case
        when role = 'owner' and status = 'active' then organization_id
        else null
      end
    ) stored;

alter table public.memberships
  add constraint memberships_one_active_owner_per_organization
    unique (active_owner_organization_id)
    deferrable initially immediate;

-- ---------------------------------------------------------------------------
-- OWNERSHIP-TRANSFER LIFECYCLE
-- ---------------------------------------------------------------------------
create table public.organization_ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  initiator_membership_id uuid not null references public.memberships(id) on delete cascade,
  target_membership_id uuid not null references public.memberships(id) on delete cascade,
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  expired_at timestamptz,
  check (initiator_membership_id <> target_membership_id),
  check (expires_at > created_at),
  check (accepted_at is null or accepted_at >= created_at),
  check (rejected_at is null or rejected_at >= created_at),
  check (cancelled_at is null or cancelled_at >= created_at),
  check (expired_at is null or expired_at >= created_at),
  check ((accepted_at is null) = (accepted_by is null)),
  check ((rejected_at is null) = (rejected_by is null)),
  check ((cancelled_at is null) = (cancelled_by is null)),
  check (
    ((accepted_at is not null)::integer
      + (rejected_at is not null)::integer
      + (cancelled_at is not null)::integer
      + (expired_at is not null)::integer) <= 1
  )
);

-- Only one unresolved request may exist for an organization. An expired row
-- becomes terminal when any lifecycle RPC observes it, allowing a fresh,
-- independently generated token to be issued.
create unique index organization_ownership_transfers_one_open_idx
  on public.organization_ownership_transfers(organization_id)
  where accepted_at is null
    and rejected_at is null
    and cancelled_at is null
    and expired_at is null;

create index organization_ownership_transfers_target_lifecycle_idx
  on public.organization_ownership_transfers(target_membership_id, created_at desc);

create index organization_ownership_transfers_expiry_idx
  on public.organization_ownership_transfers(expires_at)
  where accepted_at is null
    and rejected_at is null
    and cancelled_at is null
    and expired_at is null;

alter table public.organization_ownership_transfers enable row level security;

-- Transfer rows contain token hashes and sensitive succession intent. There
-- are deliberately no direct table policies; all access is via narrow RPCs or
-- the server-only token-context lookup used only to capture a link safely.

-- ---------------------------------------------------------------------------
-- AUDIT EVENT EXTENSION
-- ---------------------------------------------------------------------------
alter table public.team_audit_events
  drop constraint if exists team_audit_events_event_type_check;

alter table public.team_audit_events
  add constraint team_audit_events_event_type_check check (
    event_type in (
      'member_role_changed',
      'member_suspended',
      'member_removed',
      'ownership_transfer_requested',
      'ownership_transfer_cancelled',
      'ownership_transfer_rejected',
      'ownership_transfer_expired',
      'ownership_transferred'
    )
  );

-- ---------------------------------------------------------------------------
-- OWNER-PROTECTION TRIGGER CONTEXT
-- ---------------------------------------------------------------------------
-- A custom setting is not an authorization decision by itself. It is only
-- accepted when it points at an already-accepted transfer row created by this
-- SECURITY DEFINER RPC for the authenticated target member. Direct membership
-- writes remain unavailable to authenticated clients through RLS.
create or replace function public.ownership_transfer_transition_matches(
  p_organization_id uuid,
  p_initiator_membership_id uuid default null,
  p_target_membership_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and current_setting('app.ownership_transfer_id', true) is not null
    and exists (
      select 1
      from public.organization_ownership_transfers as transfer
      where transfer.id::text = current_setting('app.ownership_transfer_id', true)
        and transfer.organization_id = p_organization_id
        and transfer.accepted_at is not null
        and transfer.accepted_by = auth.uid()
        and (
          p_initiator_membership_id is null
          or transfer.initiator_membership_id = p_initiator_membership_id
        )
        and (
          p_target_membership_id is null
          or transfer.target_membership_id = p_target_membership_id
        )
    );
$$;

create or replace function public.protect_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    -- A direct membership delete (including an auth/profile cascade) must not
    -- orphan a live organization. During organizations.id ON DELETE CASCADE,
    -- the parent organization row is already gone, so this is the narrow
    -- legitimate path that may remove an owner membership.
    if exists (
      select 1
      from public.organizations as organization_row
      where organization_row.id = old.organization_id
    ) then
      raise exception
        'Owner memberships cannot be deleted while their organization exists';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and (
    new.profile_id is distinct from old.profile_id
    or new.organization_id is distinct from old.organization_id
    or new.role is distinct from 'owner'
    or new.status is distinct from 'active'
  ) then
    -- The sole allowed owner downgrade is the former owner becoming an active
    -- admin while a validated transfer accepts its selected target.
    if new.profile_id is distinct from old.profile_id
      or new.organization_id is distinct from old.organization_id
      or new.role is distinct from 'admin'
      or new.status is distinct from 'active'
      or not public.ownership_transfer_transition_matches(
        old.organization_id,
        old.id,
        null
      ) then
      raise exception
        'Owner memberships require the dedicated ownership transfer workflow';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role <> 'owner' and new.role = 'owner' then
    -- Generic Team RPCs already reject owner as a role. Keep the database as
    -- the final boundary so a direct or future code path cannot promote a
    -- second owner without an accepted, target-bound transfer.
    if new.profile_id is distinct from old.profile_id
      or new.organization_id is distinct from old.organization_id
      or new.status is distinct from 'active'
      or not public.ownership_transfer_transition_matches(
        old.organization_id,
        null,
        old.id
      ) then
      raise exception
        'Owner memberships require the dedicated ownership transfer workflow';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- OWNERSHIP-TRANSFER RPCS
-- ---------------------------------------------------------------------------
create or replace function public.create_organization_ownership_transfer(
  p_target_membership_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor public.memberships%rowtype;
  v_target public.memberships%rowtype;
  v_existing public.organization_ownership_transfers%rowtype;
  v_existing_target public.memberships%rowtype;
  v_active_owner_count integer;
  v_transfer_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_has_current_legal_consent() then
    raise exception 'Current legal consent required';
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    raise exception 'MFA verification required';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid ownership transfer token';
  end if;

  if p_expires_at <= now() + interval '5 minutes'
    or p_expires_at > now() + interval '8 days' then
    raise exception 'Invalid ownership transfer expiration';
  end if;

  select *
    into v_target
  from public.memberships as membership
  where membership.id = p_target_membership_id;

  if not found then
    raise exception 'Transfer target not found';
  end if;

  -- Serialize lifecycle changes for this organization before locking the two
  -- memberships. This prevents competing requests from producing two open
  -- transfer tokens or racing a pending acceptance.
  perform 1
  from public.organizations as organization_row
  where organization_row.id = v_target.organization_id
  for update;

  if not found then
    raise exception 'Organization not found';
  end if;

  select *
    into v_target
  from public.memberships as membership
  where membership.id = p_target_membership_id
  for update;

  select *
    into v_actor
  from public.memberships as membership
  where membership.organization_id = v_target.organization_id
    and membership.profile_id = v_actor_id
    and membership.role = 'owner'
    and membership.status = 'active'
  for update;

  if not found then
    raise exception 'Only the active organization owner can transfer ownership';
  end if;

  if v_target.organization_id <> v_actor.organization_id
    or v_target.status <> 'active'
    or v_target.role = 'owner'
    or v_target.profile_id = v_actor_id then
    raise exception 'Transfer target must be a different active member of this organization';
  end if;

  select count(*)::integer
    into v_active_owner_count
  from public.memberships as membership
  where membership.organization_id = v_actor.organization_id
    and membership.role = 'owner'
    and membership.status = 'active';

  if v_active_owner_count <> 1 then
    raise exception 'Ownership transfer requires exactly one active owner';
  end if;

  select *
    into v_existing
  from public.organization_ownership_transfers as transfer
  where transfer.organization_id = v_actor.organization_id
    and transfer.accepted_at is null
    and transfer.rejected_at is null
    and transfer.cancelled_at is null
    and transfer.expired_at is null
  for update;

  if found then
    if v_existing.expires_at > now() then
      raise exception 'An ownership transfer is already pending';
    end if;

    update public.organization_ownership_transfers
    set expired_at = now()
    where id = v_existing.id;

    select *
      into v_existing_target
    from public.memberships as membership
    where membership.id = v_existing.target_membership_id;

    insert into public.team_audit_events (
      organization_id,
      subject_profile_id,
      event_type,
      metadata
    )
    values (
      v_existing.organization_id,
      v_existing_target.profile_id,
      'ownership_transfer_expired',
      jsonb_build_object('transfer_id', v_existing.id)
    );
  end if;

  insert into public.organization_ownership_transfers (
    organization_id,
    initiator_membership_id,
    target_membership_id,
    token_hash,
    expires_at
  )
  values (
    v_actor.organization_id,
    v_actor.id,
    v_target.id,
    p_token_hash,
    p_expires_at
  )
  returning id into v_transfer_id;

  insert into public.team_audit_events (
    organization_id,
    actor_profile_id,
    subject_profile_id,
    event_type,
    metadata
  )
  values (
    v_actor.organization_id,
    v_actor_id,
    v_target.profile_id,
    'ownership_transfer_requested',
    jsonb_build_object('transfer_id', v_transfer_id, 'expires_at', p_expires_at)
  );

  return v_transfer_id;
end;
$$;

create or replace function public.cancel_organization_ownership_transfer(
  p_transfer_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor public.memberships%rowtype;
  v_transfer public.organization_ownership_transfers%rowtype;
  v_target public.memberships%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_has_current_legal_consent() then
    raise exception 'Current legal consent required';
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    raise exception 'MFA verification required';
  end if;

  select *
    into v_transfer
  from public.organization_ownership_transfers as transfer
  where transfer.id = p_transfer_id
  for update;

  if not found then
    return 'invalid';
  end if;

  select *
    into v_actor
  from public.memberships as membership
  where membership.organization_id = v_transfer.organization_id
    and membership.profile_id = v_actor_id
    and membership.role = 'owner'
    and membership.status = 'active';

  if not found then
    raise exception 'Only the active organization owner can cancel this transfer';
  end if;

  select *
    into v_target
  from public.memberships as membership
  where membership.id = v_transfer.target_membership_id;

  if v_transfer.accepted_at is not null then
    return 'accepted';
  end if;

  if v_transfer.rejected_at is not null then
    return 'rejected';
  end if;

  if v_transfer.cancelled_at is not null then
    return 'cancelled';
  end if;

  if v_transfer.expired_at is not null or v_transfer.expires_at <= now() then
    if v_transfer.expired_at is null then
      update public.organization_ownership_transfers
      set expired_at = now()
      where id = v_transfer.id;

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
        v_target.profile_id,
        'ownership_transfer_expired',
        jsonb_build_object('transfer_id', v_transfer.id)
      );
    end if;

    return 'expired';
  end if;

  update public.organization_ownership_transfers
  set cancelled_at = now(),
      cancelled_by = v_actor_id
  where id = v_transfer.id;

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
    v_target.profile_id,
    'ownership_transfer_cancelled',
    jsonb_build_object('transfer_id', v_transfer.id)
  );

  return 'cancelled';
end;
$$;

create or replace function public.reject_organization_ownership_transfer(
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
  v_target public.memberships%rowtype;
  v_initiator public.memberships%rowtype;
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

  if v_target.organization_id <> v_transfer.organization_id
    or v_target.status <> 'active'
    or v_target.role = 'owner' then
    return jsonb_build_object('status', 'target_unavailable');
  end if;

  select *
    into v_initiator
  from public.memberships as membership
  where membership.id = v_transfer.initiator_membership_id;

  update public.organization_ownership_transfers
  set rejected_at = now(),
      rejected_by = v_actor_id
  where id = v_transfer.id;

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
    'ownership_transfer_rejected',
    jsonb_build_object('transfer_id', v_transfer.id)
  );

  return jsonb_build_object('status', 'rejected');
end;
$$;

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

  -- Serialize acceptance with cancellation and any successor request before
  -- checking current owner state. A pending request must not revive a stale or
  -- ownerless organization.
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

  -- The transfer row is marked accepted in the same transaction before the
  -- owner trigger observes the two membership changes. A later failure rolls
  -- back both the lifecycle state and the membership updates together.
  update public.organization_ownership_transfers
  set accepted_at = now(),
      accepted_by = v_actor_id
  where id = v_transfer.id;

  perform set_config('app.ownership_transfer_id', v_transfer.id::text, true);
  set constraints memberships_one_active_owner_per_organization deferred;

  -- One SQL statement changes both roles. The deferred owner-slot constraint
  -- validates the resulting state at transaction commit, so no other session
  -- can observe zero or two active owners.
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

create or replace function public.list_organization_pending_ownership_transfers(
  p_organization_id uuid
)
returns table (
  transfer_id uuid,
  target_membership_id uuid,
  target_full_name text,
  target_email text,
  created_at timestamptz,
  expires_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    transfer.id,
    transfer.target_membership_id,
    target_profile.full_name,
    target_profile.email,
    transfer.created_at,
    transfer.expires_at,
    case
      when transfer.expired_at is not null or transfer.expires_at <= now()
        then 'expired'
      else 'pending'
    end
  from public.organization_ownership_transfers as transfer
  join public.memberships as actor_membership
    on actor_membership.organization_id = transfer.organization_id
   and actor_membership.profile_id = auth.uid()
   and actor_membership.role = 'owner'
   and actor_membership.status = 'active'
  join public.memberships as target_membership
    on target_membership.id = transfer.target_membership_id
  join public.profiles as target_profile
    on target_profile.id = target_membership.profile_id
  where transfer.organization_id = p_organization_id
    and transfer.accepted_at is null
    and transfer.rejected_at is null
    and transfer.cancelled_at is null
    and transfer.expired_at is null
    and public.current_user_has_current_legal_consent()
  order by transfer.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- LEAST-PRIVILEGE GRANTS
-- ---------------------------------------------------------------------------
revoke all on table public.organization_ownership_transfers
  from public, anon, authenticated;

revoke execute on function public.ownership_transfer_transition_matches(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.protect_owner_membership()
  from public, anon, authenticated;
revoke execute on function public.create_organization_ownership_transfer(uuid, text, timestamptz)
  from public, anon;
revoke execute on function public.cancel_organization_ownership_transfer(uuid)
  from public, anon;
revoke execute on function public.reject_organization_ownership_transfer(text)
  from public, anon;
revoke execute on function public.accept_organization_ownership_transfer(text)
  from public, anon;
revoke execute on function public.list_organization_pending_ownership_transfers(uuid)
  from public, anon;

grant execute on function public.create_organization_ownership_transfer(uuid, text, timestamptz)
  to authenticated;
grant execute on function public.cancel_organization_ownership_transfer(uuid)
  to authenticated;
grant execute on function public.reject_organization_ownership_transfer(text)
  to authenticated;
grant execute on function public.accept_organization_ownership_transfer(text)
  to authenticated;
grant execute on function public.list_organization_pending_ownership_transfers(uuid)
  to authenticated;

commit;
