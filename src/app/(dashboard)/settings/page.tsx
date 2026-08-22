import { getActiveOrganizationContext } from "@/lib/auth";
import { hasOrganizationPermission } from "@/lib/auth/permissions";
import { getSupportedTimeZones } from "@/lib/product-ux/preferences";

import { SettingsContent } from "./settings-content";

type SettingsSearchParams = Promise<{
  tab?: string | string[];
  ghl_install?: string | string[];
}>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SettingsSearchParams;
}) {
  const params = await searchParams;
  const context = await getActiveOrganizationContext();
  const org = context?.organization ?? null;
  const canManageSettings = context
    ? hasOrganizationPermission(
        context.membership.role,
        "organization.settings.manage",
      )
    : false;
  const initialSection =
    typeof params.tab === "string" ? params.tab : undefined;
  const marketplaceInstallRequiresAuthorization =
    params.ghl_install === "authorization_required";

  return (
    <SettingsContent
      org={org}
      canManageSettings={canManageSettings}
      timezones={getSupportedTimeZones()}
      initialSection={initialSection}
      marketplaceInstallRequiresAuthorization={
        marketplaceInstallRequiresAuthorization
      }
    />
  );
}
