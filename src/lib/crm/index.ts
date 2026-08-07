import "server-only";

import { createGoHighLevelProvider } from "@/lib/crm/gohighlevel";
import { createHubSpotProvider } from "@/lib/crm/hubspot";
import type { CRMProvider } from "@/lib/crm/types";
import { getIntegrationCredentials } from "@/lib/integrations/credentials";

export async function getCRMProvider(
  organizationId: string,
): Promise<CRMProvider | null> {
  const hsCreds = await getIntegrationCredentials(organizationId, "hubspot");
  if (hsCreds && hsCreds["access_token"]) {
    return createHubSpotProvider({
      accessToken: hsCreds["access_token"] as string,
    });
  }

  const ghlCreds = await getIntegrationCredentials(
    organizationId,
    "gohighlevel",
  );
  if (ghlCreds && ghlCreds["api_key"] && ghlCreds["location_id"]) {
    return createGoHighLevelProvider({
      apiKey: ghlCreds["api_key"] as string,
      locationId: ghlCreds["location_id"] as string,
    });
  }

  return null;
}
