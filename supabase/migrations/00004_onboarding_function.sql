-- ============================================================================
-- AI Growth Platform - Atomic Onboarding
-- Phase 4.3.1
--
-- Creates organization + membership(owner) + workspace in a single transaction.
-- Call from /auth/callback route via supabase.rpc('onboard_user', {...})
-- ============================================================================

create or replace function public.onboard_user(
  p_user_id       uuid,
  p_org_name      text,
  p_org_slug      text,
  p_workspace_name text default 'Default Workspace'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id   uuid;
  v_ws_id    uuid;
begin
  -- 1. Create organization
  insert into public.organizations (name, slug)
  values (p_org_name, p_org_slug)
  returning id into v_org_id;

  -- 2. Create membership (owner)
  insert into public.memberships (profile_id, organization_id, role)
  values (p_user_id, v_org_id, 'owner');

  -- 3. Create default workspace
  insert into public.workspaces (organization_id, name, description)
  values (v_org_id, p_workspace_name, 'Your default team workspace')
  returning id into v_ws_id;

  return jsonb_build_object(
    'organization_id', v_org_id,
    'workspace_id', v_ws_id,
    'slug', p_org_slug
  );

exception
  when unique_violation then
    -- Slug already taken; caller should retry with a different slug
    return jsonb_build_object(
      'error', 'slug_taken',
      'slug', p_org_slug
    );
end;
$$;
