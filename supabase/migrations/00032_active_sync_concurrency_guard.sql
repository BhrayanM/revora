-- 00032_active_sync_concurrency_guard
-- Adds partial unique index for active sync concurrency protection
-- Preserves existing idx_executions_idempotency for general automation dedup

-- Only one processing sync_contact execution per org+lead+provider+action
create unique index if not exists idx_executions_active_sync
  on public.automation_executions(organization_id, lead_id, provider, action)
  where status = 'processing';
