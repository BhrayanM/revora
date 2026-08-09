-- ============================================================================
-- Revora - Protect AI-owned lead fields from direct client mutation
-- Phase 14.5
-- ============================================================================

begin;

-- RLS protects tenant and role boundaries, but table-level grants also allowed
-- authenticated PostgREST clients to supply arbitrary score, tags, metadata,
-- and source identifiers. Preserve normal user-managed CRM columns while
-- reserving system-generated qualification fields for server-only paths.
revoke insert, update on public.leads from anon, authenticated;

grant insert (
  organization_id,
  workspace_id,
  pipeline_id,
  pipeline_stage_id,
  assigned_to,
  first_name,
  last_name,
  email,
  phone,
  company,
  source,
  status
) on public.leads to authenticated;

grant update (
  workspace_id,
  pipeline_id,
  pipeline_stage_id,
  assigned_to,
  first_name,
  last_name,
  email,
  phone,
  company,
  source,
  status
) on public.leads to authenticated;

commit;
