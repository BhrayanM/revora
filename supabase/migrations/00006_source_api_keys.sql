-- ============================================================================
-- AI Growth Platform - Source API Keys
-- Phase 5.3
--
-- Enables external systems (website forms, Tally, n8n) to authenticate
-- and create leads in a specific organization without user credentials.
-- ============================================================================

create table if not exists public.source_api_keys (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  source            text not null
                    check (source in ('website','tally','n8n','api')),
  label             text not null,
  key_hash          text not null unique,
  is_active         boolean not null default true,
  last_used_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index idx_source_keys_org on public.source_api_keys(organization_id);
create index idx_source_keys_hash on public.source_api_keys(key_hash);

alter table public.source_api_keys enable row level security;

create policy "Admins can read own source keys"
  on public.source_api_keys for select
  using (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
      and organization_id = source_api_keys.organization_id
      and role in ('owner','admin')
    )
  );

create policy "Admins can insert source keys"
  on public.source_api_keys for insert
  with check (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
      and organization_id = source_api_keys.organization_id
      and role in ('owner','admin')
    )
  );

create policy "Admins can update source keys"
  on public.source_api_keys for update
  using (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
      and organization_id = source_api_keys.organization_id
      and role in ('owner','admin')
    )
  );

create policy "Admins can delete source keys"
  on public.source_api_keys for delete
  using (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
      and organization_id = source_api_keys.organization_id
      and role in ('owner','admin')
    )
  );
