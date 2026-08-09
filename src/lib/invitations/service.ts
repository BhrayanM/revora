import "server-only";

import {
  type OrganizationRole,
  canManageMembershipRole,
} from "@/lib/auth/permissions";
import {
  type InvitationDelivery,
  prepareInvitationDelivery,
} from "@/lib/invitations/delivery";
import {
  createInvitationToken,
  hashInvitationToken,
} from "@/lib/invitations/tokens";
import { createClient } from "@/lib/supabase/server";

import type { InvitationRole } from "./context";

export type { InvitationRole } from "./context";

const INVITATION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canInviteOrganizationRole(
  actorRole: OrganizationRole,
  targetRole: InvitationRole,
): boolean {
  return canManageMembershipRole(actorRole, targetRole, targetRole);
}

function invitationExpiration(): string {
  return new Date(Date.now() + INVITATION_VALIDITY_MS).toISOString();
}

export type InvitationServiceResult = {
  invitationId: string;
  delivery: InvitationDelivery;
};

/**
 * The caller must first resolve a trusted active membership and permission.
 * The database RPC repeats the role/tenant check so a direct RPC cannot rely
 * on this application-layer guard.
 */
export async function createOrganizationInvitation({
  organizationId,
  actorRole,
  email,
  role,
}: {
  organizationId: string;
  actorRole: OrganizationRole;
  email: string;
  role: InvitationRole;
}): Promise<InvitationServiceResult> {
  if (!canInviteOrganizationRole(actorRole, role)) {
    throw new Error("You do not have permission to invite this role.");
  }

  const emailNormalized = normalizeInvitationEmail(email);
  if (
    emailNormalized.length < 3 ||
    emailNormalized.length > 320 ||
    !emailNormalized.includes("@")
  ) {
    throw new Error("Enter a valid email address.");
  }

  const rawToken = createInvitationToken();
  const delivery = prepareInvitationDelivery(rawToken);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization_invitation", {
    p_organization_id: organizationId,
    p_email_normalized: emailNormalized,
    p_role: role,
    p_token_hash: hashInvitationToken(rawToken),
    p_expires_at: invitationExpiration(),
  });

  if (error || !data) {
    console.error("Failed to create organization invitation:", error?.message);
    throw new Error("We could not create that invitation. Please try again.");
  }

  return { invitationId: data, delivery };
}

export async function resendOrganizationInvitation({
  invitationId,
}: {
  invitationId: string;
}): Promise<InvitationServiceResult> {
  const rawToken = createInvitationToken();
  const delivery = prepareInvitationDelivery(rawToken);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_organization_invitation", {
    p_invitation_id: invitationId,
    p_token_hash: hashInvitationToken(rawToken),
    p_expires_at: invitationExpiration(),
  });

  if (error || !data) {
    console.error("Failed to rotate organization invitation:", error?.message);
    throw new Error("We could not resend that invitation. Please try again.");
  }

  return { invitationId: data, delivery };
}

export async function revokeOrganizationInvitation(
  invitationId: string,
): Promise<"invalid" | "accepted" | "revoked"> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_organization_invitation", {
    p_invitation_id: invitationId,
  });

  if (error || !data) {
    console.error("Failed to revoke organization invitation:", error?.message);
    throw new Error("We could not revoke that invitation. Please try again.");
  }

  return data as "invalid" | "accepted" | "revoked";
}
