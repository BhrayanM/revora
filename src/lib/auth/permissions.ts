/**
 * Organization-scoped RBAC policy. Membership roles are never inferred from
 * the legacy profiles.role field and must always come from memberships.role.
 */

export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "manager",
  "agent",
  "viewer",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["active", "suspended", "removed"] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const ORGANIZATION_PERMISSIONS = [
  "dashboard.read",
  "analytics.read",
  "leads.read",
  "leads.write",
  "leads.qualify",
  "pipeline.read",
  "pipeline.manage",
  "automation.read",
  "automation.manage",
  "integrations.read",
  "integrations.manage",
  "apiKeys.read",
  "apiKeys.manage",
  "team.read",
  "team.invite",
  "team.manage",
  "team.manageAdmins",
  "team.transferOwnership",
  "organization.settings.read",
  "organization.settings.manage",
  "workspace.manage",
] as const;

export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS)[number];

const ALL_PERMISSIONS: readonly OrganizationPermission[] =
  ORGANIZATION_PERMISSIONS;

/**
 * The matrix is deliberately explicit. Adding a feature requires adding the
 * permission here and enforcing it server-side; UI visibility is never an
 * authorization boundary.
 */
const ROLE_PERMISSIONS: Record<
  OrganizationRole,
  readonly OrganizationPermission[]
> = {
  owner: ALL_PERMISSIONS,
  admin: [
    "dashboard.read",
    "analytics.read",
    "leads.read",
    "leads.write",
    "leads.qualify",
    "pipeline.read",
    "pipeline.manage",
    "automation.read",
    "automation.manage",
    "integrations.read",
    "integrations.manage",
    "apiKeys.read",
    "apiKeys.manage",
    "team.read",
    "team.invite",
    "team.manage",
    "organization.settings.read",
    "workspace.manage",
  ],
  manager: [
    "dashboard.read",
    "analytics.read",
    "leads.read",
    "leads.write",
    "leads.qualify",
    "pipeline.read",
    "pipeline.manage",
    "automation.read",
    "automation.manage",
    "team.read",
    "organization.settings.read",
  ],
  agent: [
    "dashboard.read",
    "leads.read",
    "leads.write",
    "leads.qualify",
    "pipeline.read",
    "organization.settings.read",
  ],
  viewer: [
    "dashboard.read",
    "analytics.read",
    "leads.read",
    "pipeline.read",
    "team.read",
    "organization.settings.read",
  ],
};

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    ORGANIZATION_ROLES.includes(value as OrganizationRole)
  );
}

export function hasOrganizationPermission(
  role: OrganizationRole,
  permission: OrganizationPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Foundation for future invitation/member-management operations. Ownership is
 * intentionally excluded from generic mutations; a dedicated, audited transfer
 * workflow is required in Phase 14.4D.4.
 */
export function canManageMembershipRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
  nextRole: OrganizationRole,
): boolean {
  if (targetRole === "owner" || nextRole === "owner") return false;

  if (actorRole === "owner") return true;

  if (actorRole !== "admin") return false;

  return targetRole !== "admin" && nextRole !== "admin";
}
