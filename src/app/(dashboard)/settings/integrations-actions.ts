"use server";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import {
  disconnectConnection,
  getDecryptedCredentials,
  listConnections,
  saveConnection,
} from "@/lib/integrations/connections";
import { recordAuditEvent } from "@/lib/integrations/oauth";
import { INTEGRATION_PROVIDER_IDS } from "@/lib/integrations/types";
import type { IntegrationProviderId } from "@/lib/integrations/types";
import { createClient } from "@/lib/supabase/server";

export async function getOrganizationIntegrations() {
  const authorization =
    await requireCurrentOrganizationPermission("integrations.read");
  if (!authorization.data) return { data: null, error: authorization.error };

  const org = authorization.data.organization;
  const connections = await listConnections(org.id);

  return { data: connections, error: null };
}

export async function getIntegration(provider: IntegrationProviderId) {
  const authorization =
    await requireCurrentOrganizationPermission("integrations.read");
  if (!authorization.data) return { data: null, error: authorization.error };

  const org = authorization.data.organization;

  if (!INTEGRATION_PROVIDER_IDS.includes(provider)) {
    return { data: null, error: `Invalid provider: ${provider}` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "provider, is_active, status, health_status, connected_at, external_account_id, external_account_name, scopes, config, created_at, updated_at",
    )
    .eq("organization_id", org.id)
    .eq("provider", provider)
    .single();

  if (error) return { data: null, error: null };
  return { data, error: null };
}

export async function saveIntegration(
  provider: IntegrationProviderId,
  credentials: Record<string, unknown>,
) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;
  if (!INTEGRATION_PROVIDER_IDS.includes(provider)) {
    return { error: `Invalid provider: ${provider}` };
  }

  const profileId = authorization.data.membership.profile_id;
  const result = await saveConnection(org.id, provider, credentials, profileId);

  if (!result.error) {
    await recordAuditEvent(org.id, provider, "connected", profileId);
  }

  return result;
}

export async function deleteIntegration(provider: IntegrationProviderId) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;
  const profileId = authorization.data.membership.profile_id;

  const result = await disconnectConnection(org.id, provider);

  if (!result.error) {
    await recordAuditEvent(org.id, provider, "disconnected", profileId);
  }

  return result;
}

export async function testIntegration(provider: IntegrationProviderId) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;

  const creds = await getDecryptedCredentials(org.id, provider);

  if (!creds || Object.keys(creds).length === 0) {
    return { success: false, error: "Integration not configured" };
  }

  try {
    if (provider === "hubspot" && creds["access_token"]) {
      const res = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        {
          headers: { Authorization: `Bearer ${creds["access_token"]}` },
        },
      );
      return { success: res.ok, provider };
    }

    if (provider === "gohighlevel" && creds["api_key"]) {
      const res = await fetch(
        "https://rest.gohighlevel.com/v1/contacts/?limit=1",
        {
          headers: { Authorization: `Bearer ${creds["api_key"]}` },
        },
      );
      return { success: res.ok, provider };
    }

    if (provider === "slack" && creds["webhook_url"]) {
      const res = await fetch(creds["webhook_url"] as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Revora — Integration test" }),
      });
      return { success: res.ok, provider };
    }

    return { success: false, error: `No test method for ${provider}` };
  } catch {
    return { success: false, error: "Connection test failed" };
  }
}

type SafeConnection = {
  provider: IntegrationProviderId;
  status: string;
  healthStatus: string;
  connectedAt: string | null;
  externalAccountId: string | null;
  externalAccountName: string | null;
  scopes: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export async function getSafeConnections(): Promise<SafeConnection[]> {
  const authorization =
    await requireCurrentOrganizationPermission("integrations.read");
  if (!authorization.data) return [];

  const connections = await listConnections(authorization.data.organization.id);

  return connections.map((c) => ({
    provider: c.provider,
    status: c.status,
    healthStatus: c.healthStatus,
    connectedAt: c.connectedAt,
    externalAccountId: c.externalAccountId,
    externalAccountName: c.externalAccountName,
    scopes: c.scopes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}
