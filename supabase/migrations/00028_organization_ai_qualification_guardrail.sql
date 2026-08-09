-- ============================================================================
-- Revora - Organization AI qualification operational guardrail
-- Phase 14.5B
--
-- A durable fixed-hour reservation protects development and test environments
-- from accidental organization-wide qualification storms. This is an
-- operational safety control, not a plan or billing quota.
-- ============================================================================

begin;

create table public.organization_ai_qualification_windows (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, window_started_at)
);

create trigger trg_organization_ai_qualification_windows_updated_at
  before update on public.organization_ai_qualification_windows
  for each row execute function public.update_updated_at();

alter table public.organization_ai_qualification_windows enable row level security;

-- Only the server-side service path can reserve a slot. There are deliberately
-- no authenticated/anonymous policies for this implementation detail.
create or replace function public.reserve_organization_ai_qualification_slot(
  p_organization_id uuid,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserved boolean;
  v_window_started_at timestamptz;
begin
  if p_limit < 1 or p_limit > 1000 then
    raise exception using
      errcode = '22023',
      message = 'AI qualification limit must be between 1 and 1000.';
  end if;

  -- Pin fixed-hour boundaries to UTC so every application instance reserves
  -- against the same durable organization/window key.
  v_window_started_at := date_trunc('hour', now() at time zone 'UTC') at time zone 'UTC';

  insert into public.organization_ai_qualification_windows as window_counter (
    organization_id,
    window_started_at,
    request_count
  )
  values (p_organization_id, v_window_started_at, 1)
  on conflict (organization_id, window_started_at) do update
    set request_count = window_counter.request_count + 1,
        updated_at = now()
    where window_counter.request_count < p_limit
  returning true into v_reserved;

  return coalesce(v_reserved, false);
end;
$$;

revoke all on table public.organization_ai_qualification_windows
  from anon, authenticated;
revoke all on function public.reserve_organization_ai_qualification_slot(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_organization_ai_qualification_slot(uuid, integer)
  to service_role;

commit;
