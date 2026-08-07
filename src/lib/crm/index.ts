import "server-only";

import { createHubSpotProvider } from "@/lib/crm/hubspot";
import type { CRMProvider } from "@/lib/crm/types";
import { getIntegrationCredentials } from "@/lib/integrations/credentials";

export async function getCRMProvider(
  organizationId: string,
): Promise<CRMProvider | null> {
  const creds = await getIntegrationCredentials(organizationId, "hubspot");

  if (!creds || !creds["access_token"]) {
    return null;
  }

  return createHubSpotProvider({
    accessToken: creds["access_token"] as string,
  });
}
