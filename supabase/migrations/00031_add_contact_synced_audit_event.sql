-- 00031_add_contact_synced_audit_event
-- Extends the integration_audit_events check constraint to include contact_synced

alter table public.integration_audit_events
  drop constraint if exists integration_audit_events_event_type_check;

alter table public.integration_audit_events
  add constraint integration_audit_events_event_type_check
  check (event_type in (
    'connected', 'disconnected', 'reconnected',
    'credentials_rotated', 'connection_failed',
    'token_refreshed', 'token_refresh_failed',
    'webhook_verified', 'webhook_delivery_failed',
    'contact_synced'
  ));
