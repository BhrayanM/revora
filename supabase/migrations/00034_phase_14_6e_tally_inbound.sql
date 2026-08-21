-- 00034_phase_14_6e_tally_inbound
-- Tenant-scoped idempotency and retry metadata for signed inbound webhooks.

begin;

alter table public.integration_webhook_events
  drop constraint if exists integration_webhook_events_provider_external_event_id_key;

alter table public.integration_webhook_events
  add column if not exists lead_id uuid references public.leads(id) on delete set null,
  add column if not exists attempt_count integer not null default 1 check (attempt_count > 0),
  add column if not exists last_attempt_at timestamptz not null default now();

alter table public.integration_webhook_events
  add constraint integration_webhook_events_org_provider_event_key
  unique (organization_id, provider, external_event_id);

-- Replace the legacy cross-tenant lookup index. The new unique constraint
-- already covers organization/provider/event replay lookups.
drop index if exists public.idx_webhook_events_provider_event;

create index if not exists idx_webhook_events_org_status_attempt
  on public.integration_webhook_events(organization_id, status, last_attempt_at);

create index if not exists idx_webhook_events_org_lead
  on public.integration_webhook_events(organization_id, lead_id)
  where lead_id is not null;

-- Preserve every established integration audit event and add only the inbound
-- webhook lifecycle events required by Tally ingestion.
alter table public.integration_audit_events
  drop constraint if exists integration_audit_events_event_type_check;

alter table public.integration_audit_events
  add constraint integration_audit_events_event_type_check
  check (event_type in (
    'connected', 'disconnected', 'reconnected',
    'credentials_rotated', 'connection_failed',
    'token_refreshed', 'token_refresh_failed',
    'webhook_verified', 'webhook_delivered', 'webhook_delivery_failed',
    'contact_synced', 'webhook_received', 'webhook_duplicate',
    'webhook_rejected', 'lead_captured'
  ));

-- Mutations remain service-role only; retain the existing organization-scoped
-- read policy without adding authenticated write policies.
alter table public.integration_webhook_events enable row level security;

commit;
