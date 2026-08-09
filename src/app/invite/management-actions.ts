"use server";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import {
  type InvitationRole,
  createOrganizationInvitation,
  resendOrganizationInvitation,
  revokeOrganizationInvitation,
} from "@/lib/invitations/service";

function isInvitationRole(value: unknown): value is InvitationRole {
  return (
    typeof value === "string" &&
    ["admin", "manager", "agent", "viewer"].includes(value)
  );
}

/**
 * Server Action boundary for the future Team Management UI. This phase does
 * not render that UI, but direct action callers must still pass both the app
 * permission guard and the database RPC's independent authorization check.
 */
export async function createOrganizationInvitationAction({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  if (!isInvitationRole(role)) {
    throw new Error("That invitation role is not permitted.");
  }

  const authorization =
    await requireCurrentOrganizationPermission("team.invite");
  if (!authorization.data) {
    throw new Error(
      authorization.error ?? "You do not have permission to invite members.",
    );
  }

  return createOrganizationInvitation({
    organizationId: authorization.data.organization.id,
    actorRole: authorization.data.membership.role,
    email,
    role,
  });
}

export async function resendOrganizationInvitationAction(invitationId: string) {
  const authorization =
    await requireCurrentOrganizationPermission("team.invite");
  if (!authorization.data) {
    throw new Error(
      authorization.error ??
        "You do not have permission to manage invitations.",
    );
  }

  return resendOrganizationInvitation({ invitationId });
}

export async function revokeOrganizationInvitationAction(invitationId: string) {
  const authorization =
    await requireCurrentOrganizationPermission("team.invite");
  if (!authorization.data) {
    throw new Error(
      authorization.error ??
        "You do not have permission to manage invitations.",
    );
  }

  return revokeOrganizationInvitation(invitationId);
}
