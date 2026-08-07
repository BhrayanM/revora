import { getCurrentOrganization } from "@/lib/auth";

import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const org = await getCurrentOrganization();

  return <SettingsContent org={org} />;
}
