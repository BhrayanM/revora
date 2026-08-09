-- ============================================================================
-- AI Growth - Team management operations and audit foundation
-- Phase 14.4D.3
--
-- Membership records remain closed to direct authenticated writes. These
-- narrowly scoped RPCs are the only new team-management boundary and repeat
-- authorization from trusted membership data for every call.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- AUDIT FOUNDATION
-- ---------------------------------------------------------------------------
-- This records sensitive member administration performed through the RPCs in
-- this migration. Invitation lifecycle records remain intentionally governed
-- by the immutable Phase 14.4D.2 invitation functions.

create table public.team_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  subject_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (
    event_type in (
      'member_role_changed',
      'member_suspended',
      'member_removed'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index team_audit_events_organization_created_idx
  on public.team_audit_events(organization_id, created_at desc);

alter table public.team_audit_events enable row level security;

-- No direct table policies are intentionally created. Team data is exposed
-- only through the least-privilege functions below.

-- ---------------------------------------------------------------------------
-- ROLE TRANSITION HELPERS
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_organization_membership_role(
  p_actor_role text,
  p_target_role text,
  p_next_role text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_target_role in ('admin', 'manager', 'agent', 'viewer')
    and p_next_role in ('admin', 'manager', 'agent', 'viewer')
    and (
      p_actor_role = 'owner'
      or (
        p_actor_role = 'admin'
        and p_target_role in ('manager', 'agent', 'viewer')
        and p_next_role in ('manager', 'agent', 'viewer')
      )
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- READ MODELS
-- ---------------------------------------------------------------------------

create or replace function public.list_organization_team_members(
  p_organization_id uuid
)
returns table (
  membership_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  avatar_url text,
  role text,
  status text,
  joined_at timestamptz,
  suspended_at timestamptz,
  removed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.id,
    membership.profile_id,
    profile.full_name,
    profile.email,
    profile.avatar_url,
    membership.role,
    membership.status,
    membership.joined_at,
    membership.suspended_at,
    membership.removed_at
  from public.memberships as membership
  join public.profiles as profile on profile.id = membership.profile_id
  where membership.organization_id = p_organization_id
    and exists (
      select 1
      from public.memberships as actor_membership
      where actor_membership.organization_id = p_organization_id
        and actor_membership.profile_id = auth.uid()
        and actor_membership.status = 'active'
        and actor_membership.role in ('owner', 'admin', 'manager', 'viewer')
    )
  order by
    case membership.status
      when 'active' then 0
      when 'suspended' then 1
      else 2
    end,
    membership.joined_at asc;
$$;

create or replace function public.list_organization_pending_invitations(
  p_organization_id uuid
)
returns table (
  invitation_id uuid,
  email_normalized text,
  role text,
  expires_at timestamptz,
  created_at timestamptz,
  last_sent_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.id,
    invitation.email_normalized,
    invitation.role,
    invitation.expires_at,
    invitation.created_at,
    invitation.last_sent_at
  from public.organization_invitations as invitation
  join public.memberships as actor_membership
    on actor_membership.organization_id = invitation.organization_id
   and actor_membership.profile_id = auth.uid()
   and actor_membership.status = 'active'
  where invitation.organization_id = p_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and public.can_manage_organization_invitation_role(
      actor_membership.role,
      invitation.role
    )
  order by invitation.created_at desc;
$$;

create or replace function public.list_organization_team_audit_events(
  p_organization_id uuid,
  p_limit integer default 12
)
returns table (
  event_id uuid,
  event_type text,
  metadata jsonb,
  created_at timestamptz,
  actor_name text,
  subject_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    event.id,
    event.event_type,
    event.metadata,
    event.created_at,
    actor_profile.full_name,
    subject_profile.full_name
  from public.team_audit_events as event
  left join public.profiles as actor_profile on actor_profile.id = event.actor_profile_id
  left join public.profiles as subject_profile on subject_profile.id = event.subject_profile_id
  where event.organization_id = p_organization_id
    and exists (
      select 1
      from public.memberships as actor_membership
      where actor_membership.organization_id = p_organization_id
        and actor_membership.profile_id = auth.uid()
        and actor_membership.status = 'active'
        and actor_membership.role in ('owner', 'admin')
    )
  order by event.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

-- ---------------------------------------------------------------------------
-- MEMBER ADMINISTRATION
-- ---------------------------------------------------------------------------

create or replace function public.update_organization_membership_role(
  p_membership_id uuid,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_target public.memberships%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    raise exception 'MFA verification required';
  end if;

  if p_role not in ('admin', 'manager', 'agent', 'viewer') then
    raise exception 'Membership role is not permitted';
  end if;

  select *
    into v_target
  from public.memberships as membership
  where membership.id = p_membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  select membership.role
    into v_actor_role
  from public.memberships as membership
  where membership.organization_id = v_target.organization_id
    and membership.profile_id = v_actor_id
    and membership.status = 'active';

  if not public.can_manage_organization_membership_role(
    v_actor_role,
    v_target.role,
    p_role
  ) then
    raise exception 'Not authorized to change this membership role';
  end if;

  if v_target.status <> 'active' then
    raise exception 'Only active memberships can change role';
  end if;

  if v_target.role is distinct from p_role then
    update public.memberships
    set role = p_role
    where id = v_target.id;

    insert into public.team_audit_events (
      organization_id,
      actor_profile_id,
      subject_profile_id,
      event_type,
      metadata
    )
    values (
      v_target.organization_id,
      v_actor_id,
      v_target.profile_id,
      'member_role_changed',
      jsonb_build_object('from_role', v_target.role, 'to_role', p_role)
    );
  end if;

  return v_target.id;
end;
$$;

create or replace function public.set_organization_membership_status(
  p_membership_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_target public.memberships%rowtype;
  v_event_type text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    raise exception 'MFA verification required';
  end if;

  if p_status not in ('suspended', 'removed') then
    raise exception 'Membership status transition is not permitted';
  end if;

  select *
    into v_target
  from public.memberships as membership
  where membership.id = p_membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  select membership.role
    into v_actor_role
  from public.memberships as membership
  where membership.organization_id = v_target.organization_id
    and membership.profile_id = v_actor_id
    and membership.status = 'active';

  if not public.can_manage_organization_membership_role(
    v_actor_role,
    v_target.role,
    v_target.role
  ) then
    raise exception 'Not authorized to change this membership status';
  end if;

  if v_target.status = 'removed' then
    raise exception 'Removed memberships cannot be changed';
  end if;

  if v_target.status is distinct from p_status then
    update public.memberships
    set status = p_status
    where id = v_target.id;

    v_event_type := case p_status
      when 'suspended' then 'member_suspended'
      else 'member_removed'
    end;

    insert into public.team_audit_events (
      organization_id,
      actor_profile_id,
      subject_profile_id,
      event_type,
      metadata
    )
    values (
      v_target.organization_id,
      v_actor_id,
      v_target.profile_id,
      v_event_type,
      jsonb_build_object('role', v_target.role)
    );
  end if;

  return v_target.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- LEAST-PRIVILEGE GRANTS
-- ---------------------------------------------------------------------------

revoke all on table public.team_audit_events from public, anon, authenticated;

revoke execute on function public.can_manage_organization_membership_role(text, text, text)
  from public, anon, authenticated;
revoke execute on function public.list_organization_team_members(uuid)
  from public, anon;
revoke execute on function public.list_organization_pending_invitations(uuid)
  from public, anon;
revoke execute on function public.list_organization_team_audit_events(uuid, integer)
  from public, anon;
revoke execute on function public.update_organization_membership_role(uuid, text)
  from public, anon;
revoke execute on function public.set_organization_membership_status(uuid, text)
  from public, anon;

grant execute on function public.list_organization_team_members(uuid)
  to authenticated;
grant execute on function public.list_organization_pending_invitations(uuid)
  to authenticated;
grant execute on function public.list_organization_team_audit_events(uuid, integer)
  to authenticated;
grant execute on function public.update_organization_membership_role(uuid, text)
  to authenticated;
grant execute on function public.set_organization_membership_status(uuid, text)
  to authenticated;

commit;
