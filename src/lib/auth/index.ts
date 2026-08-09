import "server-only";

import { cookies } from "next/headers";

import { hasCurrentLegalConsent } from "@/lib/legal/consent";
import type { ActiveOrganizationOption } from "@/lib/organizations/types";
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

export const ACTIVE_ORGANIZATION_COOKIE = "ai_growth_active_organization";

const ACTIVE_ORGANIZATION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ActiveMembership = MembershipRow & {
  role: OrganizationRole;
  status: "active";
};

export type OrganizationAuthorization = {
  membership: ActiveMembership;
  organization: OrganizationRow;
};

export type ActiveOrganizationContext = OrganizationAuthorization & {
  /**
   * The cookie is only a selection preference. This indicates whether it was
   * usable for the current request or the server safely chose a valid active
   * membership instead.
   */
  selectionSource: "cookie" | "fallback";
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

function isUuid(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

async function getActiveMembershipsForCurrentUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  memberships: ActiveMembership[];
}> {
  const { supabase, user } = await getAuthenticatedUserWithCurrentConsent();
  if (!user) return { supabase, memberships: [] };

  const { data } = await supabase
    .from("memberships")
    .select("*")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(50);

  return {
    supabase,
    memberships: (data ?? [])
      .map(toActiveMembership)
      .filter(
        (membership): membership is ActiveMembership => membership !== null,
      ),
  };
}

/**
 * Resolves the active tenant context for a legally-consented authenticated
 * user. The HttpOnly cookie is a preference only: every request still derives
 * membership and organization access from Supabase under the caller's session.
 *
 * A missing, malformed, foreign, suspended, removed, or stale organization
 * selection can never grant access. When another active membership exists, a
 * deterministic first active membership is used as a safe fallback.
 */
export async function getActiveOrganizationContext(): Promise<ActiveOrganizationContext | null> {
  const { supabase, memberships } = await getActiveMembershipsForCurrentUser();
  if (memberships.length === 0) return null;

  const selectedOrganizationId = (await cookies()).get(
    ACTIVE_ORGANIZATION_COOKIE,
  )?.value;
  const selectedMembership = isUuid(selectedOrganizationId)
    ? memberships.find(
        (membership) => membership.organization_id === selectedOrganizationId,
      )
    : undefined;

  const candidates = selectedMembership
    ? [
        selectedMembership,
        ...memberships.filter(
          (membership) => membership.id !== selectedMembership.id,
        ),
      ]
    : memberships;

  for (const membership of candidates) {
    const { data: organization } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (organization) {
      return {
        membership,
        organization,
        selectionSource:
          membership.id === selectedMembership?.id ? "cookie" : "fallback",
      };
    }
  }

  return null;
}

/** Returns every organization the current user may actively select. */
export async function getAvailableActiveOrganizations(): Promise<
  ActiveOrganizationOption[]
> {
  const { supabase, memberships } = await getActiveMembershipsForCurrentUser();
  if (memberships.length === 0) return [];

  const organizationIds = memberships.map(
    (membership) => membership.organization_id,
  );
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", organizationIds);

  const organizationsById = new Map(
    (organizations ?? []).map((organization) => [
      organization.id,
      organization,
    ]),
  );

  return memberships.flatMap((membership) => {
    const organization = organizationsById.get(membership.organization_id);
    return organization
      ? [
          {
            id: organization.id,
            name: organization.name,
            role: membership.role,
          },
        ]
      : [];
  });
}

/**
 * Persists a caller-selected organization only after rechecking that the
 * authenticated user has an active membership in it. It must be called from a
 * Server Action or Route Handler because it writes an HttpOnly cookie.
 */
export async function setActiveOrganizationSelection(
  organizationId: string,
): Promise<ActiveMembership | null> {
  if (!isUuid(organizationId)) return null;

  const membership = await getActiveMembership(organizationId);
  if (!membership) return null;

  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_ORGANIZATION_COOKIE_MAX_AGE_SECONDS,
  });

  return membership;
}

/** Resolves an explicit active membership, or the current active context. */
export async function getActiveMembership(
  organizationId?: string,
): Promise<ActiveMembership | null> {
  if (!organizationId) {
    return (await getActiveOrganizationContext())?.membership ?? null;
  }

  const { supabase, user } = await getAuthenticatedUserWithCurrentConsent();
  if (!user) return null;

  let query = supabase
    .from("memberships")
    .select("*")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  query = query.eq("organization_id", organizationId);

  const { data: membership } = await query.limit(1).maybeSingle();

  return membership ? toActiveMembership(membership) : null;
}

export async function getCurrentOrganization() {
  return (await getActiveOrganizationContext())?.organization ?? null;
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
  const context = await getActiveOrganizationContext();
  if (!context) {
    return { data: null, error: "No active organization membership found" };
  }

  if (!hasOrganizationPermission(context.membership.role, permission)) {
    return { data: null, error: "You do not have permission for this action" };
  }

  return { data: context, error: null };
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
