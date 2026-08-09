"use server";

import { setActiveOrganizationSelection } from "@/lib/auth";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OrganizationSelectionResult =
  | { data: { organizationId: string }; error: null }
  | { data: null; error: string };

/**
 * Server-only organization switch boundary. The identifier comes from the UI
 * but is never trusted: the helper rechecks the caller's active membership
 * before persisting the HttpOnly selection hint.
 */
export async function selectActiveOrganizationAction(
  organizationId: string,
): Promise<OrganizationSelectionResult> {
  if (
    typeof organizationId !== "string" ||
    !UUID_PATTERN.test(organizationId)
  ) {
    return { data: null, error: "That organization is not available." };
  }

  const membership = await setActiveOrganizationSelection(organizationId);
  if (!membership) {
    return { data: null, error: "That organization is not available." };
  }

  return { data: { organizationId: membership.organization_id }, error: null };
}
