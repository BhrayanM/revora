-- ============================================================================
-- AI Growth Platform - Automation Execution Logging
-- Phase 6.1
--
-- Provides observability and eventual retry capability for all downstream
-- automation actions (CRM sync, Slack, AI qualification, webhooks).
-- ============================================================================

create table if not exists public.automation_executions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  event_type        text not null,
  event_id          text not null,
  lead_id           uuid references public.leads(id) on delete set null,
  provider          text not null,
  action            text not null,
  status            text not null default 'pending'
                    check (status in ('pending','processing','success','failed')),
  attempts          integer not null default 0,
  error_message     text,
  response_metadata jsonb not null default '{}'::jsonb,
  started_at        timestamptz,
  completed_at      timestamptz,
  next_retry_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_executions_org on public.automation_executions(organization_id);
create index idx_executions_lead on public.automation_executions(lead_id);
create index idx_executions_event on public.automation_executions(event_id);
create index idx_executions_status on public.automation_executions(status);
create index idx_executions_retry on public.automation_executions(next_retry_at) where status = 'failed';
create index idx_executions_provider_status on public.automation_executions(provider, status);
create unique index idx_executions_idempotency
  on public.automation_executions(organization_id, event_id, provider, action);

create trigger trg_automation_executions_updated_at
  before update on public.automation_executions
  for each row execute function public.update_updated_at();

alter table public.automation_executions enable row level security;

create policy "Org members can read executions"
  on public.automation_executions for select
  using (public.is_org_member(organization_id));

create policy "Service can insert executions"
  on public.automation_executions for insert
  with check (public.is_org_member(organization_id));

create policy "Service can update executions"
  on public.automation_executions for update
  using (public.is_org_member(organization_id));
