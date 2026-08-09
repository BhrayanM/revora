import type {
  MembershipStatus,
  OrganizationRole,
} from "@/lib/auth/permissions";

export type TeamMember = {
  membershipId: string;
  profileId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: OrganizationRole;
  status: MembershipStatus;
  joinedAt: string;
  suspendedAt: string | null;
  removedAt: string | null;
};

export type PendingInvitation = {
  invitationId: string;
  email: string;
  role: Exclude<OrganizationRole, "owner">;
  expiresAt: string;
  createdAt: string;
  lastSentAt: string;
};

export type PendingOwnershipTransfer = {
  transferId: string;
  targetMembershipId: string;
  targetFullName: string;
  targetEmail: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "expired";
};

export type TeamAuditEvent = {
  eventId: string;
  eventType:
    | "member_role_changed"
    | "member_suspended"
    | "member_removed"
    | "ownership_transfer_requested"
    | "ownership_transfer_cancelled"
    | "ownership_transfer_rejected"
    | "ownership_transfer_expired"
    | "ownership_transferred";
  metadata: Record<string, unknown>;
  createdAt: string;
  actorName: string | null;
  subjectName: string | null;
};
