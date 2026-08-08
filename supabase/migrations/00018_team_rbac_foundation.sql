-- ============================================================================
-- AI Growth - Organization RBAC and membership foundation
-- Phase 14.4D.1
--
-- Extends the existing organization membership model without changing prior
-- migrations. Invitations, team-management UI, organization switching, and
-- ownership transfer are intentionally deferred to later Phase 14.4D work.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- MEMBERSHIP MODEL
-- ---------------------------------------------------------------------------

alter table public.memberships
  add column status text not null default 'active'
    check (status in ('active', 'suspended', 'removed')),
  add column joined_at timestamptz,
  add column suspended_at timestamptz,
  add column removed_at timestamptz;

-- Preserve the original membership time for existing rows rather than
-- assigning the migration time as a synthetic join date.
update public.memberships
set joined_at = created_at
where joined_at is null;

alter table public.memberships
  alter column joined_at set not null,
  alter column joined_at set default now();

alter table public.memberships
  drop constraint if exists memberships_role_check,
  add constraint memberships_role_check
    check (role in ('owner', 'admin', 'manager', 'agent', 'viewer'));

create index idx_memberships_profile_active
  on public.memberships(profile_id, created_at)
  where status = 'active';

create index idx_memberships_org_active_role
  on public.memberships(organization_id, role)
  where status = 'active';

create or replace function public.set_membership_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'suspended' and old.status is distinct from 'suspended' then
    new.suspended_at = coalesce(new.suspended_at, now());
  elsif new.status = 'removed' and old.status is distinct from 'removed' then
    new.removed_at = coalesce(new.removed_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.protect_owner_membership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      raise exception 'Owner memberships cannot be deleted';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and (
    new.profile_id is distinct from old.profile_id
    or new.organization_id is distinct from old.organization_id
    or new.role is distinct from 'owner'
    or new.status is distinct from 'active'
  ) then
    raise exception
      'Owner memberships require the dedicated ownership transfer workflow';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_memberships_lifecycle_timestamps on public.memberships;
create trigger trg_memberships_lifecycle_timestamps
  before update on public.memberships
  for each row execute function public.set_membership_lifecycle_timestamps();

drop trigger if exists trg_memberships_protect_owner on public.memberships;
create trigger trg_memberships_protect_owner
  before update or delete on public.memberships
  for each row execute function public.protect_owner_membership();

-- ---------------------------------------------------------------------------
-- SECURITY-DEFINER HELPERS
-- ---------------------------------------------------------------------------
-- These helpers are deliberately minimal: they only answer whether the
-- current authenticated user has an active membership/role. The fixed empty
-- search_path prevents object-shadowing attacks and allows policy evaluation
-- without membership-table RLS recursion.

create or replace function public.is_active_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.memberships as membership
      where membership.profile_id = auth.uid()
        and membership.organization_id = p_organization_id
        and membership.status = 'active'
    );
$$;

-- Keep the legacy helper name so all existing policies gain active-membership
-- semantics. It must no longer be interpreted as mere row existence.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_org_member(org_id);
$$;

create or replace function public.has_active_org_role(
  p_organization_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(array_length(p_roles, 1), 0) > 0
    and exists (
      select 1
      from public.memberships as membership
      where membership.profile_id = auth.uid()
        and membership.organization_id = p_organization_id
        and membership.status = 'active'
        and membership.role = any(p_roles)
    );
$$;

create or replace function public.shares_active_organization(
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.memberships as current_membership
      join public.memberships as target_membership
        on target_membership.organization_id = current_membership.organization_id
      where current_membership.profile_id = auth.uid()
        and current_membership.status = 'active'
        and target_membership.profile_id = p_profile_id
        and target_membership.status = 'active'
    );
$$;

-- Keeps client-supplied foreign keys on leads inside the lead's organization.
-- This complements role checks so a caller cannot attach a lead to a pipeline,
-- workspace, or stage UUID from a different tenant.
create or replace function public.has_valid_lead_tenant_references(
  p_organization_id uuid,
  p_workspace_id uuid,
  p_pipeline_id uuid,
  p_pipeline_stage_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_active_org_member(p_organization_id)
    and (
      p_workspace_id is null
      or exists (
        select 1
        from public.workspaces as workspace
        where workspace.id = p_workspace_id
          and workspace.organization_id = p_organization_id
      )
    )
    and (
      p_pipeline_id is null
      or exists (
        select 1
        from public.pipelines as pipeline
        where pipeline.id = p_pipeline_id
          and pipeline.organization_id = p_organization_id
      )
    )
    and (
      p_pipeline_stage_id is null
      or exists (
        select 1
        from public.pipeline_stages as stage
        join public.pipelines as pipeline on pipeline.id = stage.pipeline_id
        where stage.id = p_pipeline_stage_id
          and pipeline.id = p_pipeline_id
          and pipeline.organization_id = p_organization_id
      )
    );
$$;

revoke execute on function public.is_active_org_member(uuid) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_active_org_role(uuid, text[]) from public, anon;
revoke execute on function public.shares_active_organization(uuid) from public, anon;
revoke execute on function public.has_valid_lead_tenant_references(uuid, uuid, uuid, uuid) from public, anon;
revoke execute on function public.set_membership_lifecycle_timestamps() from public, anon, authenticated;
revoke execute on function public.protect_owner_membership() from public, anon, authenticated;

grant execute on function public.is_active_org_member(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_active_org_role(uuid, text[]) to authenticated;
grant execute on function public.shares_active_organization(uuid) to authenticated;
grant execute on function public.has_valid_lead_tenant_references(uuid, uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------------------------
-- Direct client membership mutations are deliberately unavailable. Later team
-- and invitation workflows must use dedicated, server-authorized operations
-- that enforce role-transition and ownership invariants.

drop policy if exists "Org members can read member profiles" on public.profiles;
create policy "Org members can read member profiles"
  on public.profiles for select
  using (public.shares_active_organization(id));

drop policy if exists "Owners can update organization" on public.organizations;
create policy "Owners can update organization"
  on public.organizations for update
  using (public.has_active_org_role(id, array['owner']::text[]))
  with check (public.has_active_org_role(id, array['owner']::text[]));

drop policy if exists "Owners can manage memberships" on public.memberships;
drop policy if exists "Owners can delete memberships" on public.memberships;

drop policy if exists "Admins can manage workspaces" on public.workspaces;
create policy "Admins can manage workspaces"
  on public.workspaces for insert
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can update workspaces" on public.workspaces;
create policy "Admins can update workspaces"
  on public.workspaces for update
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  )
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can manage pipelines" on public.pipelines;
create policy "Admins can manage pipelines"
  on public.pipelines for insert
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  );

drop policy if exists "Admins can update pipelines" on public.pipelines;
create policy "Admins can update pipelines"
  on public.pipelines for update
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  )
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  );

drop policy if exists "Admins can manage pipeline stages" on public.pipeline_stages;
create policy "Admins can manage pipeline stages"
  on public.pipeline_stages for insert
  with check (
    exists (
      select 1
      from public.pipelines
      where pipelines.id = pipeline_stages.pipeline_id
        and public.has_active_org_role(
          pipelines.organization_id,
          array['owner', 'admin', 'manager']::text[]
        )
    )
  );

drop policy if exists "Admins can update pipeline stages" on public.pipeline_stages;
create policy "Admins can update pipeline stages"
  on public.pipeline_stages for update
  using (
    exists (
      select 1
      from public.pipelines
      where pipelines.id = pipeline_stages.pipeline_id
        and public.has_active_org_role(
          pipelines.organization_id,
          array['owner', 'admin', 'manager']::text[]
        )
    )
  )
  with check (
    exists (
      select 1
      from public.pipelines
      where pipelines.id = pipeline_stages.pipeline_id
        and public.has_active_org_role(
          pipelines.organization_id,
          array['owner', 'admin', 'manager']::text[]
        )
    )
  );

drop policy if exists "Org members can insert leads" on public.leads;
create policy "Org members can insert leads"
  on public.leads for insert
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager', 'agent']::text[]
    )
    and public.has_valid_lead_tenant_references(
      organization_id,
      workspace_id,
      pipeline_id,
      pipeline_stage_id
    )
  );

drop policy if exists "Org members can update leads" on public.leads;
create policy "Org members can update leads"
  on public.leads for update
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager', 'agent']::text[]
    )
  )
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager', 'agent']::text[]
    )
    and public.has_valid_lead_tenant_references(
      organization_id,
      workspace_id,
      pipeline_id,
      pipeline_stage_id
    )
  );

drop policy if exists "Org members can delete leads" on public.leads;
create policy "Org members can delete leads"
  on public.leads for delete
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager', 'agent']::text[]
    )
  );

drop policy if exists "Org members can insert conversations" on public.conversations;
create policy "Org members can insert conversations"
  on public.conversations for insert
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager', 'agent']::text[]
    )
  );

drop policy if exists "Org members can read automations" on public.automations;
create policy "Org members can read automations"
  on public.automations for select
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  );

drop policy if exists "Admins can manage automations" on public.automations;
create policy "Admins can manage automations"
  on public.automations for insert
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  );

drop policy if exists "Admins can update automations" on public.automations;
create policy "Admins can update automations"
  on public.automations for update
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  )
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  );

drop policy if exists "Admins can read integrations" on public.integrations;
create policy "Admins can read integrations"
  on public.integrations for select
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can manage integrations" on public.integrations;
create policy "Admins can manage integrations"
  on public.integrations for insert
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can update integrations" on public.integrations;
create policy "Admins can update integrations"
  on public.integrations for update
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  )
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

create policy "Admins can delete integrations"
  on public.integrations for delete
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can read own source keys" on public.source_api_keys;
create policy "Admins can read own source keys"
  on public.source_api_keys for select
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can insert source keys" on public.source_api_keys;
create policy "Admins can insert source keys"
  on public.source_api_keys for insert
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can update source keys" on public.source_api_keys;
create policy "Admins can update source keys"
  on public.source_api_keys for update
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  )
  with check (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Admins can delete source keys" on public.source_api_keys;
create policy "Admins can delete source keys"
  on public.source_api_keys for delete
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Org members can read executions" on public.automation_executions;
create policy "Org members can read executions"
  on public.automation_executions for select
  using (
    public.has_active_org_role(
      organization_id,
      array['owner', 'admin', 'manager']::text[]
    )
  );

-- Execution rows are system-generated and updated by server-only automation
-- paths. No authenticated client policy is retained for INSERT or UPDATE.
drop policy if exists "Service can insert executions" on public.automation_executions;
drop policy if exists "Service can update executions" on public.automation_executions;

commit;
