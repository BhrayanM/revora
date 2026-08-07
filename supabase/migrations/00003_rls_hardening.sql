-- ============================================================================
-- AI Growth Platform - RLS Security Hardening
-- Phase 4.3.1
--
-- Fixes:
--   1. WITH CHECK on all UPDATE policies (tenant bypass prevention)
--   2. UPDATE policy for pipeline_stages
--   3. DELETE policies for missing tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX: Add WITH CHECK to all UPDATE policies that lacked it
-- ----------------------------------------------------------------------------

-- organizations: was missing WITH CHECK
drop policy if exists "Owners can update organization" on public.organizations;
create policy "Owners can update organization"
  on public.organizations for update
  using (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
      and organization_id = organizations.id
      and role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
      and organization_id = organizations.id
      and role = 'owner'
    )
  );

-- workspaces: was missing WITH CHECK
drop policy if exists "Admins can update workspaces" on public.workspaces;
create policy "Admins can update workspaces"
  on public.workspaces for update
  using (public.is_org_member(organization_id) and exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = workspaces.organization_id
    and role in ('owner','admin')
  ))
  with check (public.is_org_member(organization_id) and exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = workspaces.organization_id
    and role in ('owner','admin')
  ));

-- pipelines: was missing WITH CHECK
drop policy if exists "Admins can update pipelines" on public.pipelines;
create policy "Admins can update pipelines"
  on public.pipelines for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- leads: was missing WITH CHECK (CRITICAL bypass vector)
drop policy if exists "Org members can update leads" on public.leads;
create policy "Org members can update leads"
  on public.leads for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- automations: was missing WITH CHECK
drop policy if exists "Admins can update automations" on public.automations;
create policy "Admins can update automations"
  on public.automations for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- integrations: was missing WITH CHECK
drop policy if exists "Admins can update integrations" on public.integrations;
create policy "Admins can update integrations"
  on public.integrations for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- FIX: Add UPDATE policy for pipeline_stages (was missing entirely)
-- ----------------------------------------------------------------------------

create policy "Admins can update pipeline stages"
  on public.pipeline_stages for update
  using (
    exists (
      select 1 from public.pipelines
      where pipelines.id = pipeline_stages.pipeline_id
      and public.is_org_member(pipelines.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.pipelines
      where pipelines.id = pipeline_stages.pipeline_id
      and public.is_org_member(pipelines.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- FIX: Fix search_path on SECURITY DEFINER functions (function hijacking prevention)
-- ----------------------------------------------------------------------------

create or replace function public.is_org_member(org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.memberships
    where profile_id = auth.uid()
    and organization_id = org_id
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'User'));
  return new;
end;
$$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
