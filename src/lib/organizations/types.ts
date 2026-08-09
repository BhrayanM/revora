import type { OrganizationRole } from "@/lib/auth/permissions";

/**
 * The minimal organization data that can cross the server/client boundary for
 * the dashboard switcher. The role is always derived from an active
 * organization membership on the server.
 */
export type ActiveOrganizationOption = {
  id: string;
  name: string;
  role: OrganizationRole;
};
