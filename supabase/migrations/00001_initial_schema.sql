-- ============================================================================
-- AI Growth Platform - Initial Database Schema
-- Phase 4.2 - Multi-Tenant SaaS
-- ============================================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TENANCY & USERS
-- ============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  avatar_url  text,
  role        text not null default 'agent'
              check (role in ('admin', 'manager', 'agent')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.memberships (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  role              text not null default 'agent'
                    check (role in ('owner', 'admin', 'manager', 'agent')),
  created_at        timestamptz not null default now(),
  unique(profile_id, organization_id)
);

create index idx_memberships_profile on public.memberships(profile_id);
create index idx_memberships_org on public.memberships(organization_id);

create table if not exists public.workspaces (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_workspaces_org on public.workspaces(organization_id);

-- ============================================================================
-- CRM - LEADS & PIPELINE
-- ============================================================================

create table if not exists public.pipelines (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  description       text,
  is_default        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_pipelines_org on public.pipelines(organization_id);

create table if not exists public.pipeline_stages (
  id                uuid primary key default gen_random_uuid(),
  pipeline_id       uuid not null references public.pipelines(id) on delete cascade,
  name              text not null,
  order_index       integer not null default 0,
  color             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(pipeline_id, order_index)
);

create index idx_pipeline_stages_pipeline on public.pipeline_stages(pipeline_id);

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  workspace_id      uuid references public.workspaces(id) on delete set null,
  pipeline_id       uuid references public.pipelines(id) on delete set null,
  pipeline_stage_id uuid references public.pipeline_stages(id) on delete set null,
  assigned_to       uuid references public.profiles(id) on delete set null,
  first_name        text not null,
  last_name         text not null,
  email             text,
  phone             text,
  company           text,
  source            text not null default 'website'
                    check (source in ('website','referral','linkedin','email','cold_call','event','other')),
  status            text not null default 'new'
                    check (status in ('new','contacted','qualified','proposal','negotiation','won','lost')),
  score             integer not null default 0 check (score >= 0 and score <= 100),
  tags              text[],
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_leads_org on public.leads(organization_id);
create index idx_leads_workspace on public.leads(workspace_id);
create index idx_leads_pipeline on public.leads(pipeline_id);
create index idx_leads_assigned on public.leads(assigned_to);
create index idx_leads_status on public.leads(organization_id, status);
create index idx_leads_score on public.leads(organization_id, score desc);
create index idx_leads_created on public.leads(organization_id, created_at desc);
-- ============================================================================
-- COMMUNICATION
-- ============================================================================

create table if not exists public.conversations (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  lead_id           uuid not null references public.leads(id) on delete cascade,
  type              text not null
                    check (type in ('email','sms','call','note','ai_summary')),
  direction         text not null
                    check (direction in ('inbound','outbound')),
  subject           text,
  content           text not null,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index idx_conversations_org on public.conversations(organization_id);
create index idx_conversations_lead on public.conversations(lead_id);
create index idx_conversations_created on public.conversations(lead_id, created_at desc);

-- ============================================================================
-- AUTOMATION
-- ============================================================================

create table if not exists public.automations (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  workspace_id      uuid references public.workspaces(id) on delete set null,
  name              text not null,
  description       text,
  trigger_type      text not null
                    check (trigger_type in ('lead_created','lead_updated','score_threshold','scheduled','webhook')),
  trigger_config    jsonb not null default '{}'::jsonb,
  action_type       text not null
                    check (action_type in ('send_email','send_sms','update_lead','webhook','ai_qualify')),
  action_config     jsonb not null default '{}'::jsonb,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_automations_org on public.automations(organization_id);

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

create table if not exists public.integrations (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  provider          text not null
                    check (provider in ('openai','twilio','hubspot','gohighlevel','slack','n8n','sendgrid')),
  credentials       jsonb not null default '{}'::jsonb,
  config            jsonb not null default '{}'::jsonb,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(organization_id, provider)
);

create index idx_integrations_org on public.integrations(organization_id);

-- ============================================================================
-- HELPER: automatically update updated_at timestamp
-- ============================================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.update_updated_at();

create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.update_updated_at();

create trigger trg_pipelines_updated_at
  before update on public.pipelines
  for each row execute function public.update_updated_at();

create trigger trg_pipeline_stages_updated_at
  before update on public.pipeline_stages
  for each row execute function public.update_updated_at();

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.update_updated_at();

create trigger trg_automations_updated_at
  before update on public.automations
  for each row execute function public.update_updated_at();

create trigger trg_integrations_updated_at
  before update on public.integrations
  for each row execute function public.update_updated_at();

-- ============================================================================
-- HELPER: auto-create profile on auth.users insert
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'User'));
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
