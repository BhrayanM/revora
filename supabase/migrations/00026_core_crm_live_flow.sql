-- ============================================================================
-- Revora - Core CRM live-flow foundation
-- Phase 14.5
--
-- Creates a usable default pipeline for every organization, assigns legacy
-- leads to valid tenant-scoped records, and records authoritative internal
-- lead events in the existing conversations timeline.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- DEFAULT PIPELINES AND STAGES
-- ---------------------------------------------------------------------------
-- Organizations created before this migration only received a workspace.
-- Make pipeline creation part of onboarding and backfill the minimum valid
-- state for existing organizations without replacing existing custom pipelines.

do $$
declare
  v_org record;
  v_default_pipeline_id uuid;
  v_workspace_id uuid;
begin
  for v_org in select id from public.organizations loop
    select id
      into v_default_pipeline_id
      from public.pipelines
      where organization_id = v_org.id
        and is_default = true
      order by created_at asc
      limit 1;

    if v_default_pipeline_id is null then
      select id
        into v_default_pipeline_id
        from public.pipelines
        where organization_id = v_org.id
        order by created_at asc
        limit 1;

      if v_default_pipeline_id is null then
        insert into public.pipelines (
          organization_id,
          name,
          description,
          is_default
        )
        values (
          v_org.id,
          'Revenue Pipeline',
          'Default pipeline for new leads',
          true
        )
        returning id into v_default_pipeline_id;
      else
        update public.pipelines
        set is_default = true
        where id = v_default_pipeline_id;
      end if;
    end if;

    -- A pre-existing custom pipeline can be used by a legacy lead. Give any
    -- stage-less pipeline a safe first stage before repairing those references.
    insert into public.pipeline_stages (pipeline_id, name, order_index, color)
    select pipeline.id, stage.name, stage.order_index, stage.color
    from public.pipelines as pipeline
    cross join (
      values
        ('New Lead', 0, '#6366f1'),
        ('Contacted', 1, '#3b82f6'),
        ('Qualified', 2, '#22c55e'),
        ('Proposal Sent', 3, '#f59e0b'),
        ('Negotiation', 4, '#a855f7'),
        ('Closed Won', 5, '#16a34a'),
        ('Closed Lost', 6, '#ef4444')
    ) as stage(name, order_index, color)
    where pipeline.organization_id = v_org.id
      and not exists (
        select 1
        from public.pipeline_stages as existing_stage
        where existing_stage.pipeline_id = pipeline.id
      );

    select id
      into v_workspace_id
      from public.workspaces
      where organization_id = v_org.id
      order by created_at asc
      limit 1;

    update public.leads as lead
    set workspace_id = v_workspace_id
    where lead.organization_id = v_org.id
      and (
        lead.workspace_id is null
        or not exists (
          select 1
          from public.workspaces as workspace
          where workspace.id = lead.workspace_id
            and workspace.organization_id = lead.organization_id
        )
      )
      and v_workspace_id is not null;

    update public.leads as lead
    set pipeline_id = v_default_pipeline_id
    where lead.organization_id = v_org.id
      and (
        lead.pipeline_id is null
        or not exists (
          select 1
          from public.pipelines as pipeline
          where pipeline.id = lead.pipeline_id
            and pipeline.organization_id = lead.organization_id
        )
      );

    update public.leads as lead
    set pipeline_stage_id = (
      select stage.id
      from public.pipeline_stages as stage
      where stage.pipeline_id = lead.pipeline_id
      order by stage.order_index asc, stage.created_at asc
      limit 1
    )
    where lead.organization_id = v_org.id
      and exists (
        select 1
        from public.pipelines as pipeline
        where pipeline.id = lead.pipeline_id
          and pipeline.organization_id = lead.organization_id
      )
      and (
        lead.pipeline_stage_id is null
        or not exists (
          select 1
          from public.pipeline_stages as current_stage
          where current_stage.id = lead.pipeline_stage_id
            and current_stage.pipeline_id = lead.pipeline_id
        )
      );
  end loop;
end;
$$;

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
  v_pipeline_id uuid;
begin
  insert into public.organizations (name, slug)
  values (p_org_name, p_org_slug)
  returning id into v_org_id;

  insert into public.memberships (profile_id, organization_id, role)
  values (p_user_id, v_org_id, 'owner');

  insert into public.workspaces (organization_id, name, description)
  values (v_org_id, p_workspace_name, 'Your default team workspace')
  returning id into v_ws_id;

  insert into public.pipelines (organization_id, name, description, is_default)
  values (
    v_org_id,
    'Revenue Pipeline',
    'Default pipeline for new leads',
    true
  )
  returning id into v_pipeline_id;

  insert into public.pipeline_stages (pipeline_id, name, order_index, color)
  values
    (v_pipeline_id, 'New Lead', 0, '#6366f1'),
    (v_pipeline_id, 'Contacted', 1, '#3b82f6'),
    (v_pipeline_id, 'Qualified', 2, '#22c55e'),
    (v_pipeline_id, 'Proposal Sent', 3, '#f59e0b'),
    (v_pipeline_id, 'Negotiation', 4, '#a855f7'),
    (v_pipeline_id, 'Closed Won', 5, '#16a34a'),
    (v_pipeline_id, 'Closed Lost', 6, '#ef4444');

  return jsonb_build_object(
    'organization_id', v_org_id,
    'workspace_id', v_ws_id,
    'slug', p_org_slug
  );

exception
  when unique_violation then
    return jsonb_build_object(
      'error', 'slug_taken',
      'slug', p_org_slug
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- AUTHORITATIVE INTERNAL LEAD EVENTS
-- ---------------------------------------------------------------------------
-- These are database-triggered so lead creation, regular updates, pipeline
-- moves, and persisted qualifications cannot diverge from the activity stream.

create or replace function public.record_lead_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_event_type text;
  v_content text;
  v_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'lead.created';
    v_content := 'Lead created.';
    v_metadata := jsonb_build_object('event_type', v_event_type);
  elsif new.pipeline_id is distinct from old.pipeline_id
    or new.pipeline_stage_id is distinct from old.pipeline_stage_id then
    v_event_type := 'lead.stage_changed';
    v_content := 'Lead moved to a new pipeline stage.';
    v_metadata := jsonb_build_object(
      'event_type', v_event_type,
      'previous_pipeline_id', old.pipeline_id,
      'previous_pipeline_stage_id', old.pipeline_stage_id,
      'pipeline_id', new.pipeline_id,
      'pipeline_stage_id', new.pipeline_stage_id
    );
  elsif new.metadata -> 'qualification'
      is distinct from old.metadata -> 'qualification' then
    v_event_type := 'lead.qualified';
    v_content := 'AI qualification completed.';
    v_metadata := jsonb_build_object(
      'event_type', v_event_type,
      'score', new.score,
      'temperature', new.metadata -> 'qualification' ->> 'temperature'
    );
  else
    v_event_type := 'lead.updated';
    v_content := 'Lead updated.';
    v_metadata := jsonb_build_object('event_type', v_event_type);
  end if;

  insert into public.conversations (
    organization_id,
    lead_id,
    type,
    direction,
    subject,
    content,
    metadata
  )
  values (
    new.organization_id,
    new.id,
    'note',
    'outbound',
    v_event_type,
    v_content,
    v_metadata
  );

  return new;
end;
$$;

drop trigger if exists trg_leads_record_activity on public.leads;
create trigger trg_leads_record_activity
  after insert or update on public.leads
  for each row execute function public.record_lead_activity();

revoke execute on function public.record_lead_activity() from public, anon, authenticated;

commit;
