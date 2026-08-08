-- Fix: is_org_member revocation from anon only was insufficient because
-- anon inherits execute via PUBLIC. Revoke from PUBLIC then explicitly
-- re-grant to authenticated. This way:
--   anon          -> denied (no PUBLIC grant, no explicit grant)
--   authenticated -> allowed (explicit grant survives public revocation)
--   RLS policies  -> unaffected (SECURITY DEFINER runs as function owner)

revoke execute on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
