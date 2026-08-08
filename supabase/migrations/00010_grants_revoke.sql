-- Revoke public RPC access to sensitive functions
-- Security hardening: prevent anon/authenticated roles from invoking
-- SECURITY DEFINER functions directly via the Data API / RPC endpoint.

-- CRITICAL: onboard_user is called only via service_role from the auth callback
revoke execute on function public.onboard_user(uuid, text, text, text) from public, anon, authenticated;

-- HIGH: is_org_member is a RLS helper; anon should never call it directly
revoke execute on function public.is_org_member(uuid) from anon;

-- HIGH: trigger functions should only fire via triggers, never be called directly
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_updated_at() from public, anon, authenticated;

-- MEDIUM: source_api_keys UPDATE policy was missing WITH CHECK clause
drop policy if exists "Admins can update source keys" on public.source_api_keys;

create policy "Admins can update source keys"
  on public.source_api_keys
  for update
  using (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
        and organization_id = source_api_keys.organization_id
        and role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.memberships
      where profile_id = auth.uid()
        and organization_id = source_api_keys.organization_id
        and role in ('owner','admin')
    )
  );
