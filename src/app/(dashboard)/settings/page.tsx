import { getCurrentOrganization } from "@/lib/auth";

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
  const org = await getCurrentOrganization();
  const initialSection =
    typeof params.tab === "string" ? params.tab : undefined;
  const marketplaceInstallRequiresAuthorization =
    params.ghl_install === "authorization_required";

  return (
    <SettingsContent
      org={org}
      initialSection={initialSection}
      marketplaceInstallRequiresAuthorization={
        marketplaceInstallRequiresAuthorization
      }
    />
  );
}
