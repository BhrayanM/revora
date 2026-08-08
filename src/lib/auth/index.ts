import { hasCurrentLegalConsent } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

import {
  hasOrganizationPermission,
  isOrganizationRole,
  type OrganizationPermission,
  type OrganizationRole,
} from "./permissions";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

export type ActiveMembership = MembershipRow & {
  role: OrganizationRole;
  status: "active";
};

export type OrganizationAuthorization = {
  membership: ActiveMembership;
  organization: OrganizationRow;
};

type AuthorizationResult =
  | { data: OrganizationAuthorization; error: null }
  | { data: null; error: string };

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getAuthenticatedUserWithCurrentConsent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null };

  if (!(await hasCurrentLegalConsent(supabase, user.id))) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

function toActiveMembership(
  membership: MembershipRow,
): ActiveMembership | null {
  if (membership.status !== "active" || !isOrganizationRole(membership.role)) {
    return null;
  }

  return membership as ActiveMembership;
}

/**
 * Resolves an active membership for the authenticated, legally-consented user.
 * Without an organization ID it preserves the current single-organization UI
 * behavior. Phase 14.4D.3 will add an explicit organization-selection model.
 */
export async function getActiveMembership(
  organizationId?: string,
): Promise<ActiveMembership | null> {
  const { supabase, user } = await getAuthenticatedUserWithCurrentConsent();
  if (!user) return null;

  let query = supabase
    .from("memberships")
    .select("*")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data: membership } = await query.limit(1).maybeSingle();

  return membership ? toActiveMembership(membership) : null;
}

export async function getCurrentOrganization() {
  const membership = await getActiveMembership();
  if (!membership) return null;

  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  return org;
}

export async function requireOrganizationPermission(
  organizationId: string,
  permission: OrganizationPermission,
): Promise<AuthorizationResult> {
  const membership = await getActiveMembership(organizationId);
  if (!membership) {
    return { data: null, error: "No active organization membership found" };
  }

  if (!hasOrganizationPermission(membership.role, permission)) {
    return { data: null, error: "You do not have permission for this action" };
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (!organization) {
    return { data: null, error: "Organization not found" };
  }

  return { data: { membership, organization }, error: null };
}

export async function requireCurrentOrganizationPermission(
  permission: OrganizationPermission,
): Promise<AuthorizationResult> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { data: null, error: "No active organization membership found" };
  }

  return requireOrganizationPermission(membership.organization_id, permission);
}

export async function getCurrentWorkspace() {
  const org = await getCurrentOrganization();
  if (!org) return null;

  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  return workspace;
}

export async function getCurrentProfile() {
  const { supabase, user } = await getAuthenticatedUserWithCurrentConsent();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
