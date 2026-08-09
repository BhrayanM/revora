-- ============================================================================
-- Revora — Integration Foundation
-- Phase 14.6A
--
-- Extends the existing integrations table with connection lifecycle fields,
-- adds OAuth state management, webhook event tracking, and analytics indexes.
-- ============================================================================

begin;

-- Extend integrations table with connection lifecycle fields
alter table public.integrations
  add column if not exists status text not null default 'disconnected'
    check (status in ('disconnected', 'connecting', 'connected', 'degraded', 'reauth_required', 'error')),
  add column if not exists health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'degraded', 'reauth_required')),
  add column if not exists last_success_at timestamptz,
  add column if not exists last_error_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists connected_by uuid,
  add column if not exists connected_at timestamptz,
  add column if not exists external_account_id text,
  add column if not exists external_account_name text,
  add column if not exists scopes text[],
  add column if not exists token_expires_at timestamptz;

-- OAuth state table for secure authorization flow
create table if not exists public.integration_oauth_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  provider text not null,
  state_hash text not null,
  pkce_verifier_encrypted text,
  created_by uuid,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  return_path text,
  created_at timestamptz not null default now()
);

-- Inbound webhook event tracking
create table if not exists public.integration_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  integration_id uuid
    references public.integrations(id) on delete set null,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload_hash text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received'
    check (status in ('received', 'processed', 'duplicate', 'failed', 'ignored')),
  error_code text,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

-- Integration audit events
create table if not exists public.integration_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  provider text not null,
  event_type text not null
    check (event_type in (
      'connected', 'disconnected', 'reconnected',
      'credentials_rotated', 'connection_failed',
      'token_refreshed', 'token_refresh_failed',
      'webhook_verified', 'webhook_delivery_failed'
    )),
  actor_profile_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Row-level security
alter table public.integration_oauth_states enable row level security;
alter table public.integration_webhook_events enable row level security;
alter table public.integration_audit_events enable row level security;

-- OAuth states: only service_role should manage (no authenticated policies)
-- No direct authenticated access — states are server-managed.

-- Webhook events: org members can read their own
create policy "Org members can read webhook events"
  on public.integration_webhook_events
  for select
  using (has_active_org_role(organization_id, array['owner', 'admin', 'manager']));

-- Audit events: org members can read their own
create policy "Org members can read audit events"
  on public.integration_audit_events
  for select
  using (has_active_org_role(organization_id, array['owner', 'admin', 'manager']));

-- Indexes
create index if not exists idx_integrations_status
  on public.integrations(organization_id, status);
create index if not exists idx_integrations_health
  on public.integrations(organization_id, health_status);

create index if not exists idx_oauth_states_hash
  on public.integration_oauth_states(state_hash);
create index if not exists idx_oauth_states_expires
  on public.integration_oauth_states(expires_at)
  where consumed_at is null;

create index if not exists idx_webhook_events_org
  on public.integration_webhook_events(organization_id);
create index if not exists idx_webhook_events_provider_event
  on public.integration_webhook_events(provider, external_event_id);

create index if not exists idx_audit_events_org
  on public.integration_audit_events(organization_id);
create index if not exists idx_audit_events_provider
  on public.integration_audit_events(organization_id, provider);

commit;
