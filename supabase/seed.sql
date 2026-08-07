-- ============================================================================
-- AI Growth Platform — Development Seed Data
-- Phase 4.2
-- ============================================================================
-- NOTE: This seed data requires authenticated users to exist first.
-- Run after creating test users via Supabase dashboard or auth helpers.
-- All IDs are deterministic for reproducible development environments.
-- ============================================================================

-- Seed organization
insert into public.organizations (id, name, slug, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'acme-corp',
  '{"timezone": "America/New_York", "currency": "USD"}'::jsonb
) on conflict (id) do nothing;

-- Seed workspace
insert into public.workspaces (id, organization_id, name, description)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Sales Team',
  'Primary sales workspace'
) on conflict (id) do nothing;

-- Seed default pipeline
insert into public.pipelines (id, organization_id, name, is_default)
values (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'Default Pipeline',
  true
) on conflict (id) do nothing;

-- Seed pipeline stages
insert into public.pipeline_stages (id, pipeline_id, name, order_index, color)
values
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', 'New Lead',      0, '#6366f1'),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', 'Contacted',     1, '#06b6d4'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000020', 'Qualified',     2, '#10b981'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000020', 'Proposal Sent', 3, '#f59e0b'),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000020', 'Negotiation',   4, '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000020', 'Closed Won',    5, '#10b981'),
  ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000020', 'Closed Lost',   6, '#ef4444')
on conflict (id) do nothing;

-- Seed sample leads (development only)
insert into public.leads (id, organization_id, workspace_id, pipeline_id, pipeline_stage_id, first_name, last_name, email, company, source, status, score, tags)
values
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000032', 'Sarah',  'Johnson', 'sarah@acme-dev.com',  'TechStart',  'website',  'qualified',  85, array['enterprise','priority']),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000031', 'Marcus', 'Lee',    'marcus@acme-dev.com', 'DataFlow',   'referral', 'contacted',  72, array['startup']),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000030', 'Elena',  'Rodriguez','elena@acme-dev.com',  'FinEdge',    'linkedin', 'new',        68, array['finance']),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000035', 'David',  'Park',   'david@acme-dev.com',  'CloudScale', 'email',    'won',        92, array['enterprise','hot']),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000034', 'Alex',   'Thompson','alex@acme-dev.com',   'NeuralAI',   'event',    'negotiation',78, array['ai','priority'])
on conflict (id) do nothing;
