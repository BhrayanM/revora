"use server";

import { revalidatePath } from "next/cache";

import {
  createOrganizationInvitationAction,
  resendOrganizationInvitationAction,
  revokeOrganizationInvitationAction,
} from "@/app/invite/management-actions";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import {
  isOrganizationRole,
  type OrganizationRole,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const TEAM_PATH = "/dashboard/settings/team";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ActionResult<T = undefined> =
  { data: T; error: null } | { data: null; error: string };

function revalidateTeamManagement() {
  revalidatePath(TEAM_PATH);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isInvitableRole(
  value: unknown,
): value is Exclude<OrganizationRole, "owner"> {
  return isOrganizationRole(value) && value !== "owner";
}

function isMembershipStatusChange(
  value: unknown,
): value is "suspended" | "removed" {
  return value === "suspended" || value === "removed";
}

export async function createTeamInvitationAction({
  email,
  role,
}: {
  email: string;
  role: string;
}): Promise<ActionResult<{ developmentInviteUrl?: string }>> {
  if (typeof email !== "string" || !isInvitableRole(role)) {
    return { data: null, error: "Enter a valid email and role." };
  }

  try {
    const result = await createOrganizationInvitationAction({ email, role });
    revalidateTeamManagement();

    return {
      data: { developmentInviteUrl: result.delivery.developmentInviteUrl },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "We could not create that invitation. Please try again.",
    };
  }
}

export async function resendTeamInvitationAction(
  invitationId: string,
): Promise<ActionResult<{ developmentInviteUrl?: string }>> {
  if (!isUuid(invitationId)) {
    return { data: null, error: "That invitation is not valid." };
  }

  try {
    const result = await resendOrganizationInvitationAction(invitationId);
    revalidateTeamManagement();

    return {
      data: { developmentInviteUrl: result.delivery.developmentInviteUrl },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "We could not resend that invitation. Please try again.",
    };
  }
}

export async function revokeTeamInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  if (!isUuid(invitationId)) {
    return { data: null, error: "That invitation is not valid." };
  }

  try {
    const result = await revokeOrganizationInvitationAction(invitationId);
    if (result !== "revoked") {
      return {
        data: null,
        error: "That invitation can no longer be revoked.",
      };
    }

    revalidateTeamManagement();
    return { data: undefined, error: null };
  } catch {
    return {
      data: null,
      error: "We could not revoke that invitation. Please try again.",
    };
  }
}

export async function changeTeamMemberRoleAction({
  membershipId,
  role,
}: {
  membershipId: string;
  role: string;
}): Promise<ActionResult> {
  if (!isUuid(membershipId) || !isInvitableRole(role)) {
    return { data: null, error: "That role change is not valid." };
  }

  const authorization =
    await requireCurrentOrganizationPermission("team.manage");
  if (!authorization.data) {
    return {
      data: null,
      error:
        authorization.error ?? "You do not have permission for this action.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization_membership_role", {
    p_membership_id: membershipId,
    p_role: role,
  });

  if (error) {
    console.error("Team membership role update failed:", error.message);
    return {
      data: null,
      error: "We could not update that role. Please try again.",
    };
  }

  revalidateTeamManagement();
  return { data: undefined, error: null };
}

export async function changeTeamMemberStatusAction({
  membershipId,
  status,
}: {
  membershipId: string;
  status: string;
}): Promise<ActionResult> {
  if (!isUuid(membershipId) || !isMembershipStatusChange(status)) {
    return { data: null, error: "That membership action is not valid." };
  }

  const authorization =
    await requireCurrentOrganizationPermission("team.manage");
  if (!authorization.data) {
    return {
      data: null,
      error:
        authorization.error ?? "You do not have permission for this action.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_organization_membership_status", {
    p_membership_id: membershipId,
    p_status: status,
  });

  if (error) {
    console.error("Team membership status update failed:", error.message);
    return {
      data: null,
      error: "We could not update that member. Please try again.",
    };
  }

  revalidateTeamManagement();
  return { data: undefined, error: null };
}
