-- 00033_phase_14_6c_automation_webhooks
-- Forward-only schema support for organization-scoped automation webhooks.

begin;

-- Keep all legacy providers valid while aligning the database constraint with
-- the current provider catalog. No existing provider rows are rewritten.
alter table public.integrations
  drop constraint if exists integrations_provider_check;

alter table public.integrations
  add constraint integrations_provider_check
  check (provider in (
    'openai', 'twilio', 'hubspot', 'gohighlevel', 'slack', 'n8n', 'sendgrid',
    'tally', 'google_calendar', 'google-calendar', 'gmail', 'zapier', 'make'
  ));

-- Migration 00032 was intended only for CRM contact synchronization, but its
-- predicate applied to every processing action. Preserve CRM protection while
-- allowing independent webhook events for the same lead and provider.
drop index if exists public.idx_executions_active_sync;

create unique index idx_executions_active_sync
  on public.automation_executions(organization_id, lead_id, provider, action)
  where status = 'processing' and action = 'sync_contact';

-- Delivery/execution mutations are server-only. The service role bypasses RLS,
-- so authenticated-user INSERT/UPDATE policies are unnecessary and would let
-- non-admin organization members fabricate or alter execution history.
drop policy if exists "Service can insert executions"
  on public.automation_executions;
drop policy if exists "Service can update executions"
  on public.automation_executions;

-- Successful deliveries need an auditable, non-secret outcome just like
-- failures. Keep every existing event type intact.
alter table public.integration_audit_events
  drop constraint if exists integration_audit_events_event_type_check;

alter table public.integration_audit_events
  add constraint integration_audit_events_event_type_check
  check (event_type in (
    'connected', 'disconnected', 'reconnected',
    'credentials_rotated', 'connection_failed',
    'token_refreshed', 'token_refresh_failed',
    'webhook_verified', 'webhook_delivered', 'webhook_delivery_failed',
    'contact_synced'
  ));

commit;
