import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  PendingInvitation,
  PendingOwnershipTransfer,
  TeamAuditEvent,
  TeamMember,
} from "@/lib/team/types";

export type {
  PendingInvitation,
  PendingOwnershipTransfer,
  TeamAuditEvent,
  TeamMember,
} from "@/lib/team/types";

/**
 * The database functions independently authorize auth.uid() against the
 * requested organization. These server-only read models intentionally do not
 * use the service role or expose the underlying membership/invitation tables.
 */
export async function getOrganizationTeamMembers(
  organizationId: string,
): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_organization_team_members", {
    p_organization_id: organizationId,
  });

  if (error) {
    console.error("Failed to load organization team members:", error.message);
    throw new Error("We could not load team members. Please try again.");
  }

  return (data ?? []).map((member) => ({
    membershipId: member.membership_id,
    profileId: member.profile_id,
    fullName: member.full_name,
    email: member.email,
    avatarUrl: member.avatar_url,
    role: member.role,
    status: member.status,
    joinedAt: member.joined_at,
    suspendedAt: member.suspended_at,
    removedAt: member.removed_at,
  }));
}

export async function getOrganizationPendingInvitations(
  organizationId: string,
): Promise<PendingInvitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_organization_pending_invitations",
    { p_organization_id: organizationId },
  );

  if (error) {
    console.error(
      "Failed to load organization pending invitations:",
      error.message,
    );
    throw new Error("We could not load pending invitations. Please try again.");
  }

  return (data ?? []).map((invitation) => ({
    invitationId: invitation.invitation_id,
    email: invitation.email_normalized,
    role: invitation.role,
    expiresAt: invitation.expires_at,
    createdAt: invitation.created_at,
    lastSentAt: invitation.last_sent_at,
  }));
}

/**
 * This owner-only read model intentionally exposes no transfer token or hash.
 * The database function repeats the owner, tenant, and current-consent checks.
 */
export async function getOrganizationPendingOwnershipTransfers(
  organizationId: string,
): Promise<PendingOwnershipTransfer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_organization_pending_ownership_transfers",
    { p_organization_id: organizationId },
  );

  if (error) {
    console.error("Failed to load pending ownership transfers:", error.message);
    throw new Error(
      "We could not load pending ownership transfers. Please try again.",
    );
  }

  return (data ?? []).flatMap((transfer) => {
    if (transfer.status !== "pending" && transfer.status !== "expired") {
      return [];
    }

    return [
      {
        transferId: transfer.transfer_id,
        targetMembershipId: transfer.target_membership_id,
        targetFullName: transfer.target_full_name,
        targetEmail: transfer.target_email,
        createdAt: transfer.created_at,
        expiresAt: transfer.expires_at,
        status: transfer.status,
      },
    ];
  });
}

export async function getOrganizationTeamAuditEvents(
  organizationId: string,
): Promise<TeamAuditEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_organization_team_audit_events",
    { p_organization_id: organizationId, p_limit: 12 },
  );

  if (error) {
    console.error(
      "Failed to load organization team audit events:",
      error.message,
    );
    throw new Error(
      "We could not load recent team activity. Please try again.",
    );
  }

  return (data ?? []).map((event) => ({
    eventId: event.event_id,
    eventType: event.event_type,
    metadata: event.metadata,
    createdAt: event.created_at,
    actorName: event.actor_name,
    subjectName: event.subject_name,
  }));
}
