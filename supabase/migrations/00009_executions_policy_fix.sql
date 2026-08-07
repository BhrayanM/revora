-- ============================================================================
-- AI Growth Platform - Fix automation_executions UPDATE policy
-- Phase 6.1 Gap Closure
-- ============================================================================

drop policy if exists "Service can update executions" on public.automation_executions;
create policy "Service can update executions"
  on public.automation_executions for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
