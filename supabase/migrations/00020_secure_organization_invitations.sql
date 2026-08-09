-- ============================================================================
-- AI Growth - Secure organization invitations
-- Phase 14.4D.2
--
-- Invitation secrets are generated and hashed by trusted server code. This
-- migration stores only SHA-256 hashes and exposes narrowly scoped RPCs for
-- lifecycle operations; direct invitation-table access is intentionally absent.
-- ============================================================================

begin;

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_normalized text not null
    check (
      email_normalized = lower(btrim(email_normalized))
      and char_length(email_normalized) between 3 and 320
      and position('@' in email_normalized) > 1
    ),
  role text not null
    check (role in ('admin', 'manager', 'agent', 'viewer')),
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  last_sent_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (accepted_at is null or accepted_at >= created_at),
  check (revoked_at is null or revoked_at >= created_at)
);

-- Expiration is evaluated by the lifecycle functions, rather than an index
-- predicate, because PostgreSQL index predicates must be immutable.
create unique index organization_invitations_one_open_email_idx
  on public.organization_invitations(organization_id, email_normalized)
  where accepted_at is null and revoked_at is null;

create index organization_invitations_org_lifecycle_idx
  on public.organization_invitations(organization_id, created_at desc);

create index organization_invitations_expiry_idx
  on public.organization_invitations(expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.organization_invitations enable row level security;

-- Invitation records contain invitee email addresses and token hashes. There
-- are deliberately no direct authenticated SELECT/INSERT/UPDATE/DELETE
-- policies; all lifecycle access goes through the audited RPCs below.

create or replace function public.can_manage_organization_invitation_role(
  p_actor_role text,
  p_target_role text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_target_role in ('admin', 'manager', 'agent', 'viewer')
    and (
      p_actor_role = 'owner'
      or (
        p_actor_role = 'admin'
        and p_target_role in ('manager', 'agent', 'viewer')
      )
    );
$$;

-- Sensitive invitation operations must retain the current application's MFA
-- assurance rule even when an authenticated caller invokes an RPC directly.
create or replace function public.current_user_satisfies_mfa_requirement()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      not exists (
        select 1
        from auth.mfa_factors as factor
        where factor.user_id = auth.uid()
          and factor.status = 'verified'
      )
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    );
$$;

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
  p_email_normalized text,
  p_role text,
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
  v_actor_role text;
  v_email_normalized text := lower(btrim(coalesce(p_email_normalized, '')));
  v_invitation_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    raise exception 'MFA verification required';
  end if;

  if p_email_normalized is distinct from v_email_normalized
    or char_length(v_email_normalized) not between 3 and 320
    or position('@' in v_email_normalized) <= 1 then
    raise exception 'Invalid invitation email';
  end if;

  if p_role not in ('admin', 'manager', 'agent', 'viewer') then
    raise exception 'Invitation role is not permitted';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invitation token';
  end if;

  if p_expires_at <= now() + interval '1 minute'
    or p_expires_at > now() + interval '8 days' then
    raise exception 'Invalid invitation expiration';
  end if;

  select membership.role
    into v_actor_role
  from public.memberships as membership
  where membership.organization_id = p_organization_id
    and membership.profile_id = v_actor_id
    and membership.status = 'active';

  if not public.can_manage_organization_invitation_role(v_actor_role, p_role) then
    raise exception 'Not authorized to invite this role';
  end if;

  -- Serialize the open-invitation lookup so concurrent requests rotate one
  -- record rather than race the partial unique index.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_organization_id::text || ':' || v_email_normalized,
      0
    )
  );

  select invitation.id
    into v_invitation_id
  from public.organization_invitations as invitation
  where invitation.organization_id = p_organization_id
    and invitation.email_normalized = v_email_normalized
    and invitation.accepted_at is null
    and invitation.revoked_at is null
  for update;

  if v_invitation_id is null then
    insert into public.organization_invitations (
      organization_id,
      email_normalized,
      role,
      token_hash,
      invited_by,
      expires_at,
      last_sent_at
    )
    values (
      p_organization_id,
      v_email_normalized,
      p_role,
      p_token_hash,
      v_actor_id,
      p_expires_at,
      now()
    )
    returning id into v_invitation_id;
  else
    -- Reuse a structurally open invitation, including an expired one. The old
    -- token hash is replaced atomically and becomes invalid immediately.
    update public.organization_invitations
    set role = p_role,
        token_hash = p_token_hash,
        invited_by = v_actor_id,
        expires_at = p_expires_at,
        updated_at = now(),
        last_sent_at = now()
    where id = v_invitation_id;
  end if;

  return v_invitation_id;
end;
$$;

create or replace function public.rotate_organization_invitation(
  p_invitation_id uuid,
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
  v_actor_role text;
  v_invitation public.organization_invitations%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    raise exception 'MFA verification required';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invitation token';
  end if;

  if p_expires_at <= now() + interval '1 minute'
    or p_expires_at > now() + interval '8 days' then
    raise exception 'Invalid invitation expiration';
  end if;

  select *
    into v_invitation
  from public.organization_invitations as invitation
  where invitation.id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  select membership.role
    into v_actor_role
  from public.memberships as membership
  where membership.organization_id = v_invitation.organization_id
    and membership.profile_id = v_actor_id
    and membership.status = 'active';

  if not public.can_manage_organization_invitation_role(v_actor_role, v_invitation.role) then
    raise exception 'Not authorized to manage this invitation';
  end if;

  if v_invitation.accepted_at is not null or v_invitation.revoked_at is not null then
    raise exception 'Invitation can no longer be resent';
  end if;

  update public.organization_invitations
  set token_hash = p_token_hash,
      expires_at = p_expires_at,
      updated_at = now(),
      last_sent_at = now()
  where id = v_invitation.id;

  return v_invitation.id;
end;
$$;

create or replace function public.revoke_organization_invitation(
  p_invitation_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_invitation public.organization_invitations%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_satisfies_mfa_requirement() then
    raise exception 'MFA verification required';
  end if;

  select *
    into v_invitation
  from public.organization_invitations as invitation
  where invitation.id = p_invitation_id
  for update;

  if not found then
    return 'invalid';
  end if;

  select membership.role
    into v_actor_role
  from public.memberships as membership
  where membership.organization_id = v_invitation.organization_id
    and membership.profile_id = v_actor_id
    and membership.status = 'active';

  if not public.can_manage_organization_invitation_role(v_actor_role, v_invitation.role) then
    raise exception 'Not authorized to manage this invitation';
  end if;

  if v_invitation.accepted_at is not null then
    return 'accepted';
  end if;

  if v_invitation.revoked_at is not null then
    return 'revoked';
  end if;

  update public.organization_invitations
  set revoked_at = now(),
      revoked_by = v_actor_id,
      updated_at = now()
  where id = v_invitation.id;

  return 'revoked';
end;
$$;

create or replace function public.accept_organization_invitation(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.organization_invitations%rowtype;
  v_membership public.memberships%rowtype;
  v_result text;
  v_required_legal_document_count integer;
begin
  if v_user_id is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select *
    into v_invitation
  from public.organization_invitations as invitation
  where invitation.token_hash = p_token_hash
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_invitation.accepted_at is not null then
    return jsonb_build_object('status', 'already_accepted');
  end if;

  if v_invitation.revoked_at is not null then
    return jsonb_build_object('status', 'revoked');
  end if;

  if v_invitation.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select user_row.email, user_row.email_confirmed_at
    into v_email, v_email_confirmed_at
  from auth.users as user_row
  where user_row.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    return jsonb_build_object('status', 'email_unverified');
  end if;

  -- Server actions also enforce legal consent, but acceptance is callable as
  -- an authenticated RPC. Retain the existing versioned-consent boundary here
  -- so a direct client RPC cannot bypass the legal gate.
  select count(*)
    into v_required_legal_document_count
  from public.legal_document_versions as document
  where document.document_type in ('terms', 'privacy')
    and document.effective_at <= now()
    and document.effective_at = (
      select max(current_document.effective_at)
      from public.legal_document_versions as current_document
      where current_document.document_type = document.document_type
        and current_document.effective_at <= now()
    );

  if v_required_legal_document_count <> 2
    or exists (
      select 1
      from public.legal_document_versions as document
      where document.document_type in ('terms', 'privacy')
        and document.effective_at <= now()
        and document.effective_at = (
          select max(current_document.effective_at)
          from public.legal_document_versions as current_document
          where current_document.document_type = document.document_type
            and current_document.effective_at <= now()
        )
        and not exists (
          select 1
          from public.user_legal_consents as consent
          where consent.user_id = v_user_id
            and consent.document_id = document.id
        )
    ) then
    return jsonb_build_object('status', 'legal_required');
  end if;

  -- A direct RPC must not bypass the application's AAL2 gate for accounts
  -- with a verified factor. auth.jwt() reflects the request's access token.
  if not public.current_user_satisfies_mfa_requirement() then
    return jsonb_build_object('status', 'mfa_required');
  end if;

  if lower(btrim(v_email)) <> v_invitation.email_normalized then
    return jsonb_build_object('status', 'wrong_account');
  end if;

  if not exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id = v_user_id
  ) then
    return jsonb_build_object('status', 'profile_unavailable');
  end if;

  -- The FK normally guarantees this, but it documents the desired result if
  -- an administrator deletes an organization concurrently with acceptance.
  if not exists (
    select 1
    from public.organizations as organization_row
    where organization_row.id = v_invitation.organization_id
  ) then
    return jsonb_build_object('status', 'organization_unavailable');
  end if;

  select *
    into v_membership
  from public.memberships as membership
  where membership.organization_id = v_invitation.organization_id
    and membership.profile_id = v_user_id
  for update;

  if not found then
    insert into public.memberships (
      profile_id,
      organization_id,
      role,
      status,
      joined_at
    )
    values (
      v_user_id,
      v_invitation.organization_id,
      v_invitation.role,
      'active',
      now()
    );
    v_result := 'accepted';
  elsif v_membership.status = 'active' then
    -- Idempotent for an already-active member. Never use an invite to alter
    -- their existing role.
    v_result := 'membership_exists';
  elsif v_membership.status = 'removed' then
    update public.memberships
    set role = v_invitation.role,
        status = 'active',
        joined_at = now(),
        suspended_at = null,
        removed_at = null
    where id = v_membership.id;
    v_result := 'reactivated';
  else
    -- A suspension is an administrative decision and must be resolved by an
    -- organization administrator; the invitation remains unconsumed.
    return jsonb_build_object('status', 'suspended_membership');
  end if;

  update public.organization_invitations
  set accepted_at = now(),
      accepted_by = v_user_id,
      updated_at = now()
  where id = v_invitation.id;

  return jsonb_build_object(
    'status', v_result,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role
  );
end;
$$;

revoke all on table public.organization_invitations from public, anon, authenticated;

revoke execute on function public.can_manage_organization_invitation_role(text, text)
  from public, anon, authenticated;
revoke execute on function public.current_user_satisfies_mfa_requirement()
  from public, anon, authenticated;
revoke execute on function public.create_organization_invitation(uuid, text, text, text, timestamptz)
  from public, anon;
revoke execute on function public.rotate_organization_invitation(uuid, text, timestamptz)
  from public, anon;
revoke execute on function public.revoke_organization_invitation(uuid)
  from public, anon;
revoke execute on function public.accept_organization_invitation(text)
  from public, anon;

grant execute on function public.create_organization_invitation(uuid, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.rotate_organization_invitation(uuid, text, timestamptz)
  to authenticated;
grant execute on function public.revoke_organization_invitation(uuid)
  to authenticated;
grant execute on function public.accept_organization_invitation(text)
  to authenticated;

commit;
