-- ============================================================================
-- AI Growth - Invitation role guard NULL-safety correction
-- Phase 14.4D.2
--
-- SQL boolean expressions involving a missing membership role evaluate to
-- NULL. Callers use this helper in `if not ...` guards, where `if null` does
-- not enter the rejection branch. Normalize every non-authorized result to
-- false so missing memberships cannot authorize invitation operations.
-- ============================================================================

begin;

create or replace function public.can_manage_organization_invitation_role(
  p_actor_role text,
  p_target_role text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_target_role in ('admin', 'manager', 'agent', 'viewer')
    and (
      p_actor_role = 'owner'
      or (
        p_actor_role = 'admin'
        and p_target_role in ('manager', 'agent', 'viewer')
      )
    ),
    false
  );
$$;

revoke execute on function public.can_manage_organization_invitation_role(text, text)
  from public, anon, authenticated;

commit;
