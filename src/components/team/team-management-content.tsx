"use client";

import {
  Activity,
  Check,
  Clipboard,
  Clock3,
  Crown,
  Mail,
  RotateCw,
  ShieldCheck,
  Trash2,
  UserCog,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";

import {
  changeTeamMemberRoleAction,
  changeTeamMemberStatusAction,
  cancelTeamOwnershipTransferAction,
  createTeamInvitationAction,
  createTeamOwnershipTransferAction,
  resendTeamInvitationAction,
  revokeTeamInvitationAction,
} from "@/app/(dashboard)/dashboard/settings/team/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Toast, ToastContainer } from "@/components/ui/toast";
import {
  canManageMembershipRole,
  type OrganizationRole,
} from "@/lib/auth/permissions";
import type {
  PendingInvitation,
  PendingOwnershipTransfer,
  TeamAuditEvent,
  TeamMember,
} from "@/lib/team/types";

type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error" | "info";
};

type PendingAction =
  | {
      kind: "role";
      member: TeamMember;
      role: Exclude<OrganizationRole, "owner">;
    }
  | { kind: "suspend"; member: TeamMember }
  | { kind: "remove"; member: TeamMember }
  | { kind: "revoke"; invitation: PendingInvitation }
  | { kind: "transfer"; member: TeamMember }
  | { kind: "cancel-transfer"; transfer: PendingOwnershipTransfer };

type TeamManagementContentProps = {
  organizationName: string;
  currentProfileId: string;
  currentRole: OrganizationRole;
  members: TeamMember[];
  invitations: PendingInvitation[];
  ownershipTransfers: PendingOwnershipTransfer[];
  auditEvents: TeamAuditEvent[];
  canInvite: boolean;
  canManage: boolean;
  canTransferOwnership: boolean;
};

const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  agent: "Agent",
  viewer: "Viewer",
};

const STATUS_LABELS = {
  active: "Active",
  suspended: "Suspended",
  removed: "Removed",
} as const;

const STATUS_VARIANTS = {
  active: "success",
  suspended: "warning",
  removed: "error",
} as const;

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }

  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function eventDescription(event: TeamAuditEvent) {
  const subject = event.subjectName ?? "A member";
  const actor = event.actorName ?? "An administrator";

  if (event.eventType === "member_role_changed") {
    const from = event.metadata.from_role;
    const to = event.metadata.to_role;
    const fromLabel =
      typeof from === "string"
        ? ROLE_LABELS[from as OrganizationRole]
        : undefined;
    const toLabel =
      typeof to === "string" ? ROLE_LABELS[to as OrganizationRole] : undefined;

    return `${actor} changed ${subject}'s role${
      fromLabel && toLabel ? ` from ${fromLabel} to ${toLabel}` : ""
    }.`;
  }

  if (event.eventType === "member_suspended") {
    return `${actor} suspended ${subject}.`;
  }

  if (event.eventType === "ownership_transfer_requested") {
    return `${actor} requested ownership transfer to ${subject}.`;
  }

  if (event.eventType === "ownership_transfer_cancelled") {
    return `${actor} cancelled the ownership transfer to ${subject}.`;
  }

  if (event.eventType === "ownership_transfer_rejected") {
    return `${actor} declined ownership transfer from ${subject}.`;
  }

  if (event.eventType === "ownership_transfer_expired") {
    return `The ownership transfer for ${subject} expired.`;
  }

  if (event.eventType === "ownership_transferred") {
    return `${actor} accepted ownership from ${subject}.`;
  }

  return `${actor} removed ${subject}.`;
}

function MemberAvatar({ member }: { member: TeamMember }) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20"
      aria-label={`${member.fullName} avatar`}
      title={member.fullName}
    >
      {initials(member.fullName || member.email)}
    </div>
  );
}

export function TeamManagementContent({
  organizationName,
  currentProfileId,
  currentRole,
  members,
  invitations,
  ownershipTransfers,
  auditEvents,
  canInvite,
  canManage,
  canTransferOwnership,
}: TeamManagementContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<OrganizationRole, "owner">>("agent");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [developmentInviteUrl, setDevelopmentInviteUrl] = useState<
    string | null
  >(null);
  const [ownershipTransferOpen, setOwnershipTransferOpen] = useState(false);
  const [ownershipTransferTargetId, setOwnershipTransferTargetId] =
    useState("");
  const [developmentTransferUrl, setDevelopmentTransferUrl] = useState<
    string | null
  >(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] =
    useState<Exclude<OrganizationRole, "owner">>("agent");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const assignableInvitationRoles = useMemo(
    () =>
      (["admin", "manager", "agent", "viewer"] as const).filter((role) =>
        canManageMembershipRole(currentRole, role, role),
      ),
    [currentRole],
  );

  const ownershipTransferTargets = useMemo(
    () =>
      members.filter(
        (member) =>
          member.status === "active" &&
          member.role !== "owner" &&
          member.profileId !== currentProfileId,
      ),
    [currentProfileId, members],
  );

  const addToast = (
    title: string,
    variant: ToastMessage["variant"],
    description?: string,
  ) => {
    setToasts((current) => [
      ...current,
      { id: crypto.randomUUID(), title, variant, description },
    ]);
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const refresh = () => router.refresh();

  const canManageMember = (
    member: TeamMember,
    nextRole: OrganizationRole = member.role,
  ) =>
    canManage &&
    canManageMembershipRole(currentRole, member.role, nextRole) &&
    member.profileId !== currentProfileId;

  const openRoleDialog = (member: TeamMember) => {
    const options = (["admin", "manager", "agent", "viewer"] as const).filter(
      (role) => canManageMember(member, role),
    );
    const initialRole = options.includes(
      member.role as Exclude<OrganizationRole, "owner">,
    )
      ? (member.role as Exclude<OrganizationRole, "owner">)
      : options[0];

    if (!initialRole) return;
    setSelectedMember(member);
    setSelectedRole(initialRole);
  };

  const handleInviteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteError(null);

    startTransition(async () => {
      const result = await createTeamInvitationAction({
        email: inviteEmail,
        role: inviteRole,
      });

      if (result.error) {
        setInviteError(result.error);
        return;
      }

      if (!result.data) {
        setInviteError(
          "We could not create that invitation. Please try again.",
        );
        return;
      }

      setInviteEmail("");
      setDevelopmentInviteUrl(result.data.developmentInviteUrl ?? null);
      addToast(
        "Invitation created",
        "success",
        "The invitation is ready to send.",
      );
      refresh();
    });
  };

  const handleCopyDevelopmentLink = async () => {
    if (!developmentInviteUrl) return;

    try {
      await navigator.clipboard.writeText(developmentInviteUrl);
      addToast("Invite link copied", "success");
    } catch {
      addToast(
        "Could not copy invite link",
        "error",
        "Copy it from the field instead.",
      );
    }
  };

  const handleCopyOwnershipTransferLink = async () => {
    if (!developmentTransferUrl) return;

    try {
      await navigator.clipboard.writeText(developmentTransferUrl);
      addToast("Ownership transfer link copied", "success");
    } catch {
      addToast(
        "Could not copy ownership transfer link",
        "error",
        "Copy it from the field instead.",
      );
    }
  };

  const confirmAction = () => {
    if (!pendingAction) return;

    startTransition(async () => {
      if (pendingAction.kind === "role") {
        const result = await changeTeamMemberRoleAction({
          membershipId: pendingAction.member.membershipId,
          role: pendingAction.role,
        });
        if (result.error) {
          addToast("Role was not changed", "error", result.error);
          return;
        }
        addToast(
          "Role updated",
          "success",
          `${pendingAction.member.fullName} is now ${ROLE_LABELS[pendingAction.role]}.`,
        );
      }

      if (pendingAction.kind === "suspend" || pendingAction.kind === "remove") {
        const result = await changeTeamMemberStatusAction({
          membershipId: pendingAction.member.membershipId,
          status: pendingAction.kind === "suspend" ? "suspended" : "removed",
        });
        if (result.error) {
          addToast("Member was not updated", "error", result.error);
          return;
        }
        addToast(
          pendingAction.kind === "suspend"
            ? "Member suspended"
            : "Member removed",
          "success",
          `${pendingAction.member.fullName} no longer has active access.`,
        );
      }

      if (pendingAction.kind === "revoke") {
        const result = await revokeTeamInvitationAction(
          pendingAction.invitation.invitationId,
        );
        if (result.error) {
          addToast("Invitation was not revoked", "error", result.error);
          return;
        }
        addToast("Invitation revoked", "success");
      }

      if (pendingAction.kind === "transfer") {
        const result = await createTeamOwnershipTransferAction(
          pendingAction.member.membershipId,
        );
        if (result.error || !result.data) {
          addToast(
            "Ownership transfer was not started",
            "error",
            result.error ??
              "We could not start the ownership transfer. Please try again.",
          );
          return;
        }

        setDevelopmentTransferUrl(result.data.developmentTransferUrl ?? null);
        setOwnershipTransferOpen(true);
        addToast(
          "Ownership transfer requested",
          "success",
          "The selected member must securely accept the transfer.",
        );
      }

      if (pendingAction.kind === "cancel-transfer") {
        const result = await cancelTeamOwnershipTransferAction(
          pendingAction.transfer.transferId,
        );
        if (result.error) {
          addToast(
            "Ownership transfer was not cancelled",
            "error",
            result.error,
          );
          return;
        }
        addToast("Ownership transfer cancelled", "success");
      }

      setPendingAction(null);
      refresh();
    });
  };

  const resendInvitation = (invitation: PendingInvitation) => {
    startTransition(async () => {
      const result = await resendTeamInvitationAction(invitation.invitationId);
      if (result.error) {
        addToast("Invitation was not resent", "error", result.error);
        return;
      }

      if (!result.data) {
        addToast(
          "Invitation was not resent",
          "error",
          "We could not resend that invitation. Please try again.",
        );
        return;
      }

      if (result.data.developmentInviteUrl) {
        setDevelopmentInviteUrl(result.data.developmentInviteUrl);
        setInviteOpen(true);
      }
      addToast(
        "Invitation resent",
        "success",
        "A fresh invitation link was generated.",
      );
      refresh();
    });
  };

  const roleOptionsForSelectedMember = selectedMember
    ? (["admin", "manager", "agent", "viewer"] as const).filter((role) =>
        canManageMember(selectedMember, role),
      )
    : [];

  const actionTitle =
    pendingAction?.kind === "role"
      ? "Confirm role change"
      : pendingAction?.kind === "suspend"
        ? "Suspend team member"
        : pendingAction?.kind === "remove"
          ? "Remove team member"
          : pendingAction?.kind === "transfer"
            ? "Start ownership transfer"
            : pendingAction?.kind === "cancel-transfer"
              ? "Cancel ownership transfer"
              : "Revoke invitation";

  const actionDescription =
    pendingAction?.kind === "role"
      ? `Change ${pendingAction.member.fullName}'s role to ${ROLE_LABELS[pendingAction.role]}?`
      : pendingAction?.kind === "suspend"
        ? `${pendingAction.member.fullName} will lose access to ${organizationName} until an administrator resolves the suspension.`
        : pendingAction?.kind === "remove"
          ? `${pendingAction.member.fullName} will lose access to ${organizationName}. Their membership record remains for audit history.`
          : pendingAction?.kind === "transfer"
            ? `Request that ${pendingAction.member.fullName} become the sole owner of ${organizationName}? They must securely accept before any role changes occur.`
            : pendingAction?.kind === "cancel-transfer"
              ? `Cancel the pending ownership transfer to ${pendingAction.transfer.targetFullName}? The one-time acceptance link will stop working immediately.`
              : pendingAction
                ? `Revoke the pending invitation for ${pendingAction.invitation.email}? The invitation link will stop working immediately.`
                : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/settings"
              className="rounded outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            >
              Settings
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">Team</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Team management
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage access, roles, and invitations for {organizationName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canTransferOwnership && (
            <Button
              variant="outline"
              leftIcon={<Crown />}
              disabled={ownershipTransferTargets.length === 0}
              onClick={() => {
                setDevelopmentTransferUrl(null);
                setOwnershipTransferTargetId(
                  ownershipTransferTargets[0]?.membershipId ?? "",
                );
                setOwnershipTransferOpen(true);
              }}
            >
              Transfer ownership
            </Button>
          )}
          {canInvite && (
            <Button
              leftIcon={<UserPlus />}
              onClick={() => {
                setDevelopmentInviteUrl(null);
                setInviteError(null);
                setInviteRole(assignableInvitationRoles[0] ?? "agent");
                setInviteOpen(true);
              }}
            >
              Invite teammate
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Members</h2>
            <p className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? "member" : "members"} in
              this organization
            </p>
          </div>
          <Badge variant="outline" size="sm" className="shrink-0">
            <UsersRound className="size-3.5" />{" "}
            {members.filter((member) => member.status === "active").length}{" "}
            active
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <EmptyState
              icon={<UsersRound className="size-7" />}
              title="Build your AI Growth team"
              description="Invite teammates to collaborate on lead qualification and automation."
              action={
                canInvite
                  ? {
                      label: "Invite teammate",
                      onClick: () => setInviteOpen(true),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Member
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Joined
                    </th>
                    <th className="w-[260px] px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const manageable = canManageMember(member);
                    return (
                      <tr
                        key={member.membershipId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <MemberAvatar member={member} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {member.fullName || member.email}
                                {member.profileId === currentProfileId && (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant={
                              member.role === "owner" ? "default" : "outline"
                            }
                            size="sm"
                          >
                            {ROLE_LABELS[member.role]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant={STATUS_VARIANTS[member.status]}
                            size="sm"
                          >
                            {STATUS_LABELS[member.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {formatDate(member.joinedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {manageable ? (
                            <div className="flex justify-end gap-2">
                              {member.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openRoleDialog(member)}
                                >
                                  <UserCog /> Change role
                                </Button>
                              )}
                              {member.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setPendingAction({
                                      kind: "suspend",
                                      member,
                                    })
                                  }
                                >
                                  <UserMinus /> Suspend
                                </Button>
                              )}
                              {member.status !== "removed" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-error hover:bg-error/10 hover:text-error"
                                  onClick={() =>
                                    setPendingAction({ kind: "remove", member })
                                  }
                                >
                                  <Trash2 /> Remove
                                </Button>
                              )}
                            </div>
                          ) : (
                            <p className="text-right text-xs text-muted-foreground">
                              {member.role === "owner"
                                ? "Owner protected"
                                : "No management access"}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {canTransferOwnership && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Ownership transfer
              </h2>
              <p className="text-sm text-muted-foreground">
                Only the current owner can request a successor. The selected
                active member must accept before ownership changes.
              </p>
            </div>
            <Crown
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent className="p-0">
            {ownershipTransfers.length === 0 ? (
              <EmptyState
                icon={<Crown className="size-7" />}
                title="No ownership transfer is pending"
                description="A requested transfer remains pending until the selected active member accepts, declines, expires, or you cancel it."
                className="py-12"
              />
            ) : (
              <div className="divide-y divide-border">
                {ownershipTransfers.map((transfer) => {
                  const expired =
                    transfer.status === "expired" ||
                    isExpired(transfer.expiresAt);
                  return (
                    <div
                      key={transfer.transferId}
                      className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {transfer.targetFullName || transfer.targetEmail}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">
                            {transfer.targetEmail}
                          </span>
                          <Badge
                            variant={expired ? "warning" : "success"}
                            size="sm"
                          >
                            {expired ? "Expired" : "Pending acceptance"}
                          </Badge>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />{" "}
                            {expired
                              ? "Expired"
                              : `Expires ${formatDateTime(transfer.expiresAt)}`}
                          </span>
                        </div>
                      </div>
                      {!expired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-error hover:bg-error/10 hover:text-error"
                          disabled={isPending}
                          onClick={() =>
                            setPendingAction({
                              kind: "cancel-transfer",
                              transfer,
                            })
                          }
                        >
                          <Trash2 /> Cancel transfer
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canInvite && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Pending invitations
              </h2>
              <p className="text-sm text-muted-foreground">
                Resend an invitation with a fresh link, or revoke access before
                it is accepted.
              </p>
            </div>
            <Mail
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent className="p-0">
            {invitations.length === 0 ? (
              <EmptyState
                icon={<Mail className="size-7" />}
                title="No pending invitations"
                description="New invitations will appear here until they are accepted or revoked."
                className="py-12"
              />
            ) : (
              <div className="divide-y divide-border">
                {invitations.map((invitation) => {
                  const expired = isExpired(invitation.expiresAt);
                  return (
                    <div
                      key={invitation.invitationId}
                      className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {invitation.email}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" size="sm">
                            {ROLE_LABELS[invitation.role]}
                          </Badge>
                          <Badge
                            variant={expired ? "warning" : "success"}
                            size="sm"
                          >
                            {expired ? "Expired" : "Pending"}
                          </Badge>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />{" "}
                            {expired
                              ? "Expired"
                              : `Expires ${formatDateTime(invitation.expiresAt)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          loading={isPending}
                          onClick={() => resendInvitation(invitation)}
                        >
                          <RotateCw /> Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-error/10 hover:text-error"
                          disabled={isPending}
                          onClick={() =>
                            setPendingAction({ kind: "revoke", invitation })
                          }
                        >
                          <Trash2 /> Revoke
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Recent team activity
              </h2>
              <p className="text-sm text-muted-foreground">
                A record of sensitive membership changes made through team
                management.
              </p>
            </div>
            <Activity
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            {auditEvents.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface-secondary/50 px-4 py-5 text-sm text-muted-foreground">
                <ShieldCheck className="size-5 shrink-0 text-success" />
                No sensitive membership changes have been recorded yet.
              </div>
            ) : (
              <ol className="space-y-4">
                {auditEvents.map((event) => (
                  <li key={event.eventId} className="flex gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-surface text-primary">
                      <Activity className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {eventDescription(event)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={inviteOpen}
        onClose={() => {
          if (!isPending) setInviteOpen(false);
        }}
        title={developmentInviteUrl ? "Invitation ready" : "Invite a teammate"}
        description={
          developmentInviteUrl
            ? "Copy this development-only link to test the invitation flow locally."
            : "Choose the access level your teammate needs. Invitations expire after seven days."
        }
        size="md"
      >
        {developmentInviteUrl ? (
          <div className="space-y-4">
            <Alert variant="info" title="Development delivery">
              This link is shown only in development. Production invitations
              require configured transactional email delivery.
            </Alert>
            <Input
              label="Invite link"
              value={developmentInviteUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDevelopmentInviteUrl(null)}
              >
                Invite another
              </Button>
              <Button
                onClick={handleCopyDevelopmentLink}
                leftIcon={<Clipboard />}
              >
                Copy link
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInviteSubmit} className="space-y-5">
            {inviteError && <Alert variant="error">{inviteError}</Alert>}
            <Input
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              required
              disabled={isPending}
            />
            <div>
              <label
                htmlFor="team-invite-role"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Role
              </label>
              <select
                id="team-invite-role"
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(
                    event.target.value as Exclude<OrganizationRole, "owner">,
                  )
                }
                disabled={isPending}
                className="flex h-10 w-full rounded-lg border border-input-border bg-input px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignableInvitationRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Owners are never assignable through invitations or member
                administration.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isPending} leftIcon={<UserPlus />}>
                Create invitation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={ownershipTransferOpen}
        onClose={() => {
          if (!isPending) setOwnershipTransferOpen(false);
        }}
        title={
          developmentTransferUrl
            ? "Ownership transfer ready"
            : "Transfer organization ownership"
        }
        description={
          developmentTransferUrl
            ? "Copy this development-only link for the selected member to securely review the transfer."
            : "Choose an active member. They must independently confirm the transfer before ownership changes."
        }
        size="md"
      >
        {developmentTransferUrl ? (
          <div className="space-y-4">
            <Alert variant="warning" title="Development delivery">
              This one-time link is shown only in development. Production
              ownership transfers require configured transactional delivery.
            </Alert>
            <Input
              label="Ownership transfer link"
              value={developmentTransferUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDevelopmentTransferUrl(null)}
              >
                Start another
              </Button>
              <Button
                onClick={handleCopyOwnershipTransferLink}
                leftIcon={<Clipboard />}
              >
                Copy link
              </Button>
            </div>
          </div>
        ) : ownershipTransferTargets.length === 0 ? (
          <Alert variant="warning">
            Add or reactivate another member before transferring ownership.
            Owners cannot transfer ownership to themselves, inactive members, or
            another owner.
          </Alert>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const target = ownershipTransferTargets.find(
                (member) => member.membershipId === ownershipTransferTargetId,
              );
              if (!target) return;
              setPendingAction({ kind: "transfer", member: target });
              setOwnershipTransferOpen(false);
            }}
          >
            <Alert variant="warning" title="High-impact change">
              The selected member receives a one-time link and must confirm it.
              Until then, you remain the owner. After acceptance, you become an
              administrator and ordinary role controls cannot reverse it.
            </Alert>
            <div>
              <label
                htmlFor="ownership-transfer-target"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                New owner
              </label>
              <select
                id="ownership-transfer-target"
                value={ownershipTransferTargetId}
                onChange={(event) =>
                  setOwnershipTransferTargetId(event.target.value)
                }
                disabled={isPending}
                className="flex h-10 w-full rounded-lg border border-input-border bg-input px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ownershipTransferTargets.map((member) => (
                  <option key={member.membershipId} value={member.membershipId}>
                    {member.fullName || member.email} — {member.email} (
                    {ROLE_LABELS[member.role]})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setOwnershipTransferOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" leftIcon={<Crown />}>
                Review transfer
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={selectedMember !== null}
        onClose={() => {
          if (!isPending) setSelectedMember(null);
        }}
        title="Change member role"
        description={
          selectedMember
            ? `Update ${selectedMember.fullName}'s access in ${organizationName}.`
            : undefined
        }
      >
        {selectedMember && (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-surface-secondary p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current role
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {ROLE_LABELS[selectedMember.role]}
              </p>
            </div>
            <div>
              <label
                htmlFor="team-member-role"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                New role
              </label>
              <select
                id="team-member-role"
                value={selectedRole}
                onChange={(event) =>
                  setSelectedRole(
                    event.target.value as Exclude<OrganizationRole, "owner">,
                  )
                }
                disabled={isPending}
                className="flex h-10 w-full rounded-lg border border-input-border bg-input px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {roleOptionsForSelectedMember.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => setSelectedMember(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={selectedRole === selectedMember.role}
                onClick={() => {
                  setPendingAction({
                    kind: "role",
                    member: selectedMember,
                    role: selectedRole,
                  });
                  setSelectedMember(null);
                }}
                leftIcon={<Check />}
              >
                Review change
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={pendingAction !== null}
        onClose={() => {
          if (!isPending) setPendingAction(null);
        }}
        title={actionTitle}
        description={actionDescription}
      >
        <div className="space-y-5">
          {(pendingAction?.kind === "suspend" ||
            pendingAction?.kind === "remove") && (
            <Alert variant="warning" title="Access will change immediately">
              This action is enforced by the database and cannot be bypassed
              through direct requests.
            </Alert>
          )}
          {pendingAction?.kind === "transfer" && (
            <Alert variant="warning" title="Two independent confirmations">
              This creates a one-time transfer request only. Your selected
              member must sign in, satisfy legal and MFA requirements, and
              explicitly accept before the database changes either role.
            </Alert>
          )}
          {pendingAction?.kind === "cancel-transfer" && (
            <Alert
              variant="warning"
              title="The acceptance link will stop working"
            >
              Cancelling is immediate and leaves both current membership roles
              unchanged.
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                pendingAction?.kind === "remove" ||
                pendingAction?.kind === "revoke" ||
                pendingAction?.kind === "cancel-transfer"
                  ? "destructive"
                  : "primary"
              }
              loading={isPending}
              onClick={confirmAction}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
        ))}
      </ToastContainer>
    </div>
  );
}
