-- 00030_provider_resource_mappings
-- Adds durable provider-to-local resource mapping for HubSpot contacts
-- Enables re-sync to prefer stored external ID over email search

create table if not exists public.provider_resource_mappings (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider      text not null,
  resource_type text not null default 'contact',
  local_id      uuid not null,
  external_id   text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint provider_resource_mappings_unique
    unique (organization_id, provider, resource_type, local_id)
);

create index idx_resource_mappings_external
  on public.provider_resource_mappings(organization_id, provider, resource_type, external_id);

alter table public.provider_resource_mappings enable row level security;

-- Only org members can read; service_role writes
create policy "Organization members can read provider resource mappings"
  on public.provider_resource_mappings
  for select
  using (public.is_org_member(organization_id));

-- No direct insert/update/delete policies for authenticated users —
-- mutations go through server actions with service_role
