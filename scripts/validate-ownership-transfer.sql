-- Phase 14.4D.5 live authenticated SQL/RLS validation.
--
-- Run only through the linked database's approved administrative test path.
-- All random fixtures and every assertion are enclosed in one transaction and
-- rolled back. The ownership RPCs themselves run under ROLE authenticated with
-- request.jwt.claim.sub; they are never evaluated as postgres or service_role.

begin;

create temp table ownership_transfer_audit_fixture (
  fixture_key text primary key,
  id uuid not null default gen_random_uuid()
);

insert into ownership_transfer_audit_fixture (fixture_key)
values
  ('user.owner'),
  ('user.success_target'),
  ('user.reject_target'),
  ('user.expired_target'),
  ('user.admin'),
  ('user.foreign_owner'),
  ('user.foreign_target'),
  ('org.success'),
  ('org.reject'),
  ('org.expired'),
  ('org.protected'),
  ('org.a'),
  ('org.b'),
  ('membership.success.owner'),
  ('membership.success.target'),
  ('membership.success.admin'),
  ('membership.reject.owner'),
  ('membership.reject.target'),
  ('membership.expired.owner'),
  ('membership.expired.target'),
  ('membership.protected.owner'),
  ('membership.a.owner'),
  ('membership.b.owner'),
  ('membership.b.target');

grant select on ownership_transfer_audit_fixture to authenticated;

create temp table ownership_transfer_audit_baseline as
select count(*) filter (where active_owner_count = 0)::integer as ownerless_count
from (
  select
    organization.id,
    count(membership.id) filter (
      where membership.role = 'owner' and membership.status = 'active'
    ) as active_owner_count
  from public.organizations as organization
  left join public.memberships as membership
    on membership.organization_id = organization.id
  group by organization.id
) as owner_counts;

-- The auth trigger creates matching profiles. These database-only fixtures do
-- not sign in or weaken Turnstile; JWT claims are simulated below solely for
-- authenticated RLS/RPC assertions.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  fixture.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  value.email,
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', value.full_name),
  now(),
  now()
from (
  values
    ('user.owner', 'ownership-audit-owner@example.invalid', 'Ownership Audit Owner'),
    ('user.success_target', 'ownership-audit-success@example.invalid', 'Ownership Audit Success Target'),
    ('user.reject_target', 'ownership-audit-reject@example.invalid', 'Ownership Audit Reject Target'),
    ('user.expired_target', 'ownership-audit-expire@example.invalid', 'Ownership Audit Expiry Target'),
    ('user.admin', 'ownership-audit-admin@example.invalid', 'Ownership Audit Admin'),
    ('user.foreign_owner', 'ownership-audit-foreign-owner@example.invalid', 'Ownership Audit Foreign Owner'),
    ('user.foreign_target', 'ownership-audit-foreign-target@example.invalid', 'Ownership Audit Foreign Target')
) as value(fixture_key, email, full_name)
join ownership_transfer_audit_fixture as fixture
  on fixture.fixture_key = value.fixture_key;

-- Versioned-consent setup uses the same auth.uid() trigger boundary as
-- production rather than bypassing the append-only consent table.
do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select id
    from ownership_transfer_audit_fixture
    where fixture_key like 'user.%'
  loop
    perform set_config('request.jwt.claim.sub', v_user_id::text, true);
    insert into public.user_legal_consents (user_id, document_id)
    select v_user_id, document.id
    from public.legal_document_versions as document
    where document.document_type in ('terms', 'privacy')
      and document.effective_at <= now()
      and document.effective_at = (
        select max(current_document.effective_at)
        from public.legal_document_versions as current_document
        where current_document.document_type = document.document_type
          and current_document.effective_at <= now()
      );
  end loop;
end;
$$;

insert into public.organizations (id, name, slug)
select
  fixture.id,
  'ownership-audit-' || value.label,
  'ownership-audit-' || value.label || '-' || fixture.id::text
from (
  values
    ('org.success', 'success'),
    ('org.reject', 'reject'),
    ('org.expired', 'expired'),
    ('org.protected', 'protected'),
    ('org.a', 'org-a'),
    ('org.b', 'org-b')
) as value(fixture_key, label)
join ownership_transfer_audit_fixture as fixture
  on fixture.fixture_key = value.fixture_key;

insert into public.memberships (
  id,
  profile_id,
  organization_id,
  role,
  status
)
select
  membership_fixture.id,
  user_fixture.id,
  organization_fixture.id,
  value.role,
  'active'
from (
  values
    ('membership.success.owner', 'user.owner', 'org.success', 'owner'),
    ('membership.success.target', 'user.success_target', 'org.success', 'manager'),
    ('membership.success.admin', 'user.admin', 'org.success', 'admin'),
    ('membership.reject.owner', 'user.owner', 'org.reject', 'owner'),
    ('membership.reject.target', 'user.reject_target', 'org.reject', 'agent'),
    ('membership.expired.owner', 'user.owner', 'org.expired', 'owner'),
    ('membership.expired.target', 'user.expired_target', 'org.expired', 'viewer'),
    ('membership.protected.owner', 'user.owner', 'org.protected', 'owner'),
    ('membership.a.owner', 'user.owner', 'org.a', 'owner'),
    ('membership.b.owner', 'user.foreign_owner', 'org.b', 'owner'),
    ('membership.b.target', 'user.foreign_target', 'org.b', 'manager')
) as value(membership_key, user_key, organization_key, role)
join ownership_transfer_audit_fixture as membership_fixture
  on membership_fixture.fixture_key = value.membership_key
join ownership_transfer_audit_fixture as user_fixture
  on user_fixture.fixture_key = value.user_key
join ownership_transfer_audit_fixture as organization_fixture
  on organization_fixture.fixture_key = value.organization_key;

set local role authenticated;

-- Owner transfer success and replay prevention.
do $$
declare
  v_owner_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.owner');
  v_target_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.success_target');
  v_owner_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.success.owner');
  v_target_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.success.target');
  v_organization_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'org.success');
  v_transfer_id uuid;
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  select public.create_organization_ownership_transfer(
    v_target_membership_id,
    repeat('1', 64),
    now() + interval '2 days'
  ) into v_transfer_id;
  if v_transfer_id is null then
    raise exception 'success fixture did not create transfer';
  end if;

  perform set_config('request.jwt.claim.sub', v_target_id::text, true);
  select public.accept_organization_ownership_transfer(repeat('1', 64))
    into v_result;
  if v_result ->> 'status' <> 'transferred' then
    raise exception 'expected transfer success, got %', v_result;
  end if;
  if (select role from public.memberships where id = v_target_membership_id) <> 'owner'
    or (select role from public.memberships where id = v_owner_membership_id) <> 'admin'
    or (select count(*) from public.memberships where organization_id = v_organization_id and role = 'owner' and status = 'active') <> 1 then
    raise exception 'successful transfer did not preserve exact owner state';
  end if;

  select public.accept_organization_ownership_transfer(repeat('1', 64))
    into v_result;
  if v_result ->> 'status' <> 'already_accepted' then
    raise exception 'token replay was not rejected: %', v_result;
  end if;
end;
$$;

-- Target rejection leaves ownership untouched.
do $$
declare
  v_owner_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.owner');
  v_target_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.reject_target');
  v_owner_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.reject.owner');
  v_target_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.reject.target');
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  perform public.create_organization_ownership_transfer(
    v_target_membership_id,
    repeat('2', 64),
    now() + interval '2 days'
  );
  perform set_config('request.jwt.claim.sub', v_target_id::text, true);
  select public.reject_organization_ownership_transfer(repeat('2', 64))
    into v_result;
  if v_result ->> 'status' <> 'rejected' then
    raise exception 'expected rejection, got %', v_result;
  end if;
  if (select role from public.memberships where id = v_owner_membership_id) <> 'owner' then
    raise exception 'rejected transfer changed owner';
  end if;
end;
$$;

-- Create an expiry fixture through the authenticated RPC, then simulate time
-- passage only in this enclosing, rollback-only administrative transaction.
do $$
declare
  v_owner_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.owner');
  v_target_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.expired.target');
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  perform public.create_organization_ownership_transfer(
    v_target_membership_id,
    repeat('3', 64),
    now() + interval '2 days'
  );
end;
$$;

reset role;
update public.organization_ownership_transfers
set created_at = now() - interval '3 days',
    expires_at = now() - interval '1 minute'
where token_hash = repeat('3', 64);
set local role authenticated;

do $$
declare
  v_target_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.expired_target');
  v_owner_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.expired.owner');
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', v_target_id::text, true);
  select public.accept_organization_ownership_transfer(repeat('3', 64))
    into v_result;
  if v_result ->> 'status' <> 'expired' then
    raise exception 'expected expiry, got %', v_result;
  end if;
  if (select role from public.memberships where id = v_owner_membership_id) <> 'owner' then
    raise exception 'expired transfer changed owner';
  end if;
end;
$$;

-- Admin and cross-tenant owner attempts must fail under authenticated role.
do $$
declare
  v_admin_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.admin');
  v_owner_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.owner');
  v_admin_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.success.admin');
  v_foreign_target_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.b.target');
begin
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  begin
    perform public.create_organization_ownership_transfer(
      v_admin_membership_id,
      repeat('4', 64),
      now() + interval '2 days'
    );
    raise exception 'admin transfer attempt unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'admin transfer attempt unexpectedly succeeded' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  begin
    perform public.create_organization_ownership_transfer(
      v_foreign_target_membership_id,
      repeat('5', 64),
      now() + interval '2 days'
    );
    raise exception 'cross-tenant transfer attempt unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'cross-tenant transfer attempt unexpectedly succeeded' then raise; end if;
  end;
end;
$$;

-- Direct authenticated enumeration remains unavailable.
do $$
declare
  v_owner_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'user.owner');
begin
  perform set_config('request.jwt.claim.sub', v_owner_id::text, true);
  begin
    perform count(*) from public.organization_ownership_transfers;
    raise exception 'direct transfer-table enumeration unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

-- The trigger blocks a direct last-owner downgrade even for an administrative
-- caller. The exception subtransaction rolls the prohibited update back.
do $$
declare
  v_owner_membership_id uuid := (select id from ownership_transfer_audit_fixture where fixture_key = 'membership.protected.owner');
begin
  begin
    update public.memberships
    set role = 'admin'
    where id = v_owner_membership_id;
    raise exception 'direct last-owner downgrade unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'direct last-owner downgrade unexpectedly succeeded' then raise; end if;
  end;

  if (select role from public.memberships where id = v_owner_membership_id) <> 'owner' then
    raise exception 'last-owner protection did not retain owner role';
  end if;
end;
$$;

-- Option B must leave the existing aggregate legacy-ownerless state unchanged.
do $$
declare
  v_baseline integer;
  v_current integer;
begin
  select ownerless_count into v_baseline
  from ownership_transfer_audit_baseline;

  select count(*) filter (where active_owner_count = 0)::integer
    into v_current
  from (
    select
      organization.id,
      count(membership.id) filter (
        where membership.role = 'owner' and membership.status = 'active'
      ) as active_owner_count
    from public.organizations as organization
    left join public.memberships as membership
      on membership.organization_id = organization.id
    group by organization.id
  ) as owner_counts;

  if v_current <> v_baseline then
    raise exception 'ownerless organization count changed from % to %', v_baseline, v_current;
  end if;
end;
$$;

rollback;
