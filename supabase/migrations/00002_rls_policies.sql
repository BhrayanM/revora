-- ============================================================================
-- AI Growth Platform - Row Level Security Policies
-- Phase 4.3
-- ============================================================================

-- Enable RLS on all business tables
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.workspaces enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.automations enable row level security;
alter table public.integrations enable row level security;

-- ============================================================================
-- HELPER: Check if user is member of the target organization
-- ============================================================================

create or replace function public.is_org_member(org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = org_id
  );
end;
$$ language plpgsql security definer;

-- ============================================================================
-- PROFILES
-- ============================================================================

create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Org members can read member profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.organization_id = m2.organization_id
      where m1.profile_id = auth.uid()
      and m2.profile_id = profiles.id
    )
  );

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

create policy "Members can read own organizations"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Owners can update organization"
  on public.organizations for update
  using (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
      and organization_id = organizations.id
      and role = 'owner'
    )
  );

-- ============================================================================
-- MEMBERSHIPS
-- ============================================================================

create policy "Users can read own memberships"
  on public.memberships for select
  using (profile_id = auth.uid());

create policy "Owners can manage memberships"
  on public.memberships for insert
  with check (public.is_org_member(organization_id) and exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = memberships.organization_id
    and role = 'owner'
  ));

create policy "Owners can delete memberships"
  on public.memberships for delete
  using (public.is_org_member(organization_id) and exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = memberships.organization_id
    and role = 'owner'
  ));

-- ============================================================================
-- WORKSPACES
-- ============================================================================

create policy "Org members can read workspaces"
  on public.workspaces for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage workspaces"
  on public.workspaces for insert
  with check (public.is_org_member(organization_id) and exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = workspaces.organization_id
    and role in ('owner','admin')
  ));

create policy "Admins can update workspaces"
  on public.workspaces for update
  using (public.is_org_member(organization_id) and exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = workspaces.organization_id
    and role in ('owner','admin')
  ));

-- ============================================================================
-- PIPELINES
-- ============================================================================

create policy "Org members can read pipelines"
  on public.pipelines for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage pipelines"
  on public.pipelines for insert
  with check (public.is_org_member(organization_id));

create policy "Admins can update pipelines"
  on public.pipelines for update
  using (public.is_org_member(organization_id));

-- ============================================================================
-- PIPELINE STAGES
-- ============================================================================

create policy "Org members can read pipeline stages"
  on public.pipeline_stages for select
  using (
    exists (
      select 1 from public.pipelines
      where pipelines.id = pipeline_stages.pipeline_id
      and public.is_org_member(pipelines.organization_id)
    )
  );

create policy "Admins can manage pipeline stages"
  on public.pipeline_stages for insert
  with check (
    exists (
      select 1 from public.pipelines
      where pipelines.id = pipeline_stages.pipeline_id
      and public.is_org_member(pipelines.organization_id)
    )
  );

-- ============================================================================
-- LEADS
-- ============================================================================

create policy "Org members can read leads"
  on public.leads for select
  using (public.is_org_member(organization_id));

create policy "Org members can insert leads"
  on public.leads for insert
  with check (public.is_org_member(organization_id));

create policy "Org members can update leads"
  on public.leads for update
  using (public.is_org_member(organization_id));

create policy "Org members can delete leads"
  on public.leads for delete
  using (public.is_org_member(organization_id));

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

create policy "Org members can read conversations"
  on public.conversations for select
  using (public.is_org_member(organization_id));

create policy "Org members can insert conversations"
  on public.conversations for insert
  with check (public.is_org_member(organization_id));

-- ============================================================================
-- AUTOMATIONS
-- ============================================================================

create policy "Org members can read automations"
  on public.automations for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage automations"
  on public.automations for insert
  with check (public.is_org_member(organization_id));

create policy "Admins can update automations"
  on public.automations for update
  using (public.is_org_member(organization_id));

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

create policy "Admins can read integrations"
  on public.integrations for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage integrations"
  on public.integrations for insert
  with check (public.is_org_member(organization_id));

create policy "Admins can update integrations"
  on public.integrations for update
  using (public.is_org_member(organization_id));
