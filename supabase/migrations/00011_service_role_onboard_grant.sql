-- Fix: migration 00010 revoked PUBLIC access to onboard_user but did not
-- explicitly re-grant service_role. Since service_role is a member of PUBLIC,
-- the revocation also removed service_role's ability to call onboard_user,
-- which would break the auth callback signup flow.
--
-- This migration explicitly grants service_role the required EXECUTE privilege.

grant execute on function public.onboard_user(uuid, text, text, text) to service_role;
