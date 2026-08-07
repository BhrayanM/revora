-- ============================================================================
-- AI Growth Platform - Query Performance Indexes
-- Phase 4.4.1
--
-- Composite indexes for common query patterns identified in data layer review.
-- ============================================================================

-- Pipeline metrics: counts leads grouped by pipeline_stage_id per organization.
-- Used by getPipelineMetrics() which filters on (organization_id, pipeline_stage_id).
create index if not exists idx_leads_org_pipelinestage
  on public.leads(organization_id, pipeline_stage_id);

-- Lead list by org + workspace + creation date.
-- Used by getLeadsByWorkspace() which filters on (organization_id, workspace_id).
create index if not exists idx_leads_org_workspace
  on public.leads(organization_id, workspace_id);
