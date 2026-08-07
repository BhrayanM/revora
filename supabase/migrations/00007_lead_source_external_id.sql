-- ============================================================================
-- AI Growth Platform - Lead Source External ID
-- Phase 5.3
--
-- Adds idempotency support for external lead ingestion.
-- Uniqueness enforced per (organization, source, external_id).
-- ============================================================================

alter table public.leads
  add column if not exists source_external_id text;

create unique index if not exists idx_leads_source_external
  on public.leads(organization_id, source, source_external_id)
  where source_external_id is not null;
