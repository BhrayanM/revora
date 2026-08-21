-- 00035_phase_14_6f_google_workspace_audit
-- Safe audit outcomes for bounded Google Calendar and Gmail mutations.

begin;

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
    'webhook_rejected', 'lead_captured',
    'calendar_event_created', 'gmail_message_sent'
  ));

commit;

