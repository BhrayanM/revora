import { redirect } from "next/navigation";

import { TeamManagementContent } from "@/components/team/team-management-content";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { hasOrganizationPermission } from "@/lib/auth/permissions";
import {
  getOrganizationPendingInvitations,
  getOrganizationPendingOwnershipTransfers,
  getOrganizationTeamAuditEvents,
  getOrganizationTeamMembers,
} from "@/lib/team/service";

export const metadata = {
  title: "Team Management — AI Growth",
};

export default async function TeamManagementPage() {
  const authorization = await requireCurrentOrganizationPermission("team.read");

  if (!authorization.data) {
    redirect("/settings");
  }

  const { organization, membership } = authorization.data;
  const canInvite = hasOrganizationPermission(membership.role, "team.invite");
  const canManage = hasOrganizationPermission(membership.role, "team.manage");
  const canTransferOwnership = hasOrganizationPermission(
    membership.role,
    "team.transferOwnership",
  );

  const [members, invitations, ownershipTransfers, auditEvents] =
    await Promise.all([
      getOrganizationTeamMembers(organization.id),
      canInvite ? getOrganizationPendingInvitations(organization.id) : [],
      canTransferOwnership
        ? getOrganizationPendingOwnershipTransfers(organization.id)
        : [],
      canManage ? getOrganizationTeamAuditEvents(organization.id) : [],
    ]);

  return (
    <TeamManagementContent
      organizationName={organization.name}
      currentProfileId={membership.profile_id}
      currentRole={membership.role}
      members={members}
      invitations={invitations}
      ownershipTransfers={ownershipTransfers}
      auditEvents={auditEvents}
      canInvite={canInvite}
      canManage={canManage}
      canTransferOwnership={canTransferOwnership}
    />
  );
}
