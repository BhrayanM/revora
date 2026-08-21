"use server";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { dispatchIntegrationTestEvent } from "@/lib/automation/webhook-dispatcher";
import {
  normalizeAutomationWebhookCredentials,
  sendAutomationWebhookEvent,
} from "@/lib/integrations/automation-webhook-adapters";
import {
  disconnectConnection,
  getDecryptedCredentials,
  listConnections,
  saveConnection,
} from "@/lib/integrations/connections";
import { recordAuditEvent } from "@/lib/integrations/oauth";
import { buildIntegrationTestEvent } from "@/lib/integrations/outbound-events";
import {
  AUTOMATION_WEBHOOK_PROVIDER_IDS,
  INTEGRATION_PROVIDER_IDS,
} from "@/lib/integrations/types";
import type {
  AutomationWebhookProviderId,
  IntegrationProviderId,
} from "@/lib/integrations/types";
import { createClient } from "@/lib/supabase/server";

function isAutomationWebhookProvider(
  provider: IntegrationProviderId,
): provider is AutomationWebhookProviderId {
  return AUTOMATION_WEBHOOK_PROVIDER_IDS.includes(
    provider as AutomationWebhookProviderId,
  );
}

function webhookTestError(code: string | null): string {
  if (code === "INVALID_WEBHOOK_URL") {
    return "Webhook URL failed security validation.";
  }
  if (code === "INVALID_CREDENTIALS") {
    return "Webhook authentication failed.";
  }
  if (code === "ENDPOINT_INACTIVE") {
    return "Webhook endpoint is inactive or unavailable.";
  }
  if (code === "RATE_LIMITED") return "Webhook provider rate limited the test.";
  return "Webhook connection test failed.";
}

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

  if (isAutomationWebhookProvider(provider)) {
    return { error: "Use the secure webhook connection flow." };
  }

  const profileId = authorization.data.membership.profile_id;
  const result = await saveConnection(org.id, provider, credentials, profileId);

  if (!result.error) {
    await recordAuditEvent(org.id, provider, "connected", profileId);
  }

  return result;
}

export async function saveAutomationWebhookIntegration(
  provider: AutomationWebhookProviderId,
  credentials: Record<string, unknown>,
) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  if (!AUTOMATION_WEBHOOK_PROVIDER_IDS.includes(provider)) {
    return { error: "Invalid automation provider." };
  }

  const org = authorization.data.organization;
  const profileId = authorization.data.membership.profile_id;

  let normalized: Record<string, string>;
  try {
    normalized = normalizeAutomationWebhookCredentials(provider, credentials);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid credentials.",
    };
  }

  const test = await sendAutomationWebhookEvent({
    provider,
    credentials: normalized,
    event: buildIntegrationTestEvent(org.id, provider),
  });

  if (!test.ok) {
    await recordAuditEvent(org.id, provider, "connection_failed", profileId, {
      error_code: test.errorCode,
      http_status: test.status,
    });
    return { error: webhookTestError(test.errorCode) };
  }

  const webhookUrl = normalized["webhook_url"];
  if (!webhookUrl) return { error: "Webhook URL is required." };

  const result = await saveConnection(org.id, provider, normalized, profileId, {
    config: { subscribed_events: ["lead.created", "lead.updated"] },
    externalAccountName: new URL(webhookUrl).hostname,
    healthStatus: "healthy",
  });

  if (result.error) return result;

  await recordAuditEvent(org.id, provider, "connected", profileId);
  await recordAuditEvent(org.id, provider, "webhook_verified", profileId, {
    http_status: test.status,
  });
  return { error: null };
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
    if (isAutomationWebhookProvider(provider)) {
      const result = await dispatchIntegrationTestEvent(
        buildIntegrationTestEvent(org.id, provider),
      );

      if (result === "success") {
        await recordAuditEvent(
          org.id,
          provider,
          "webhook_verified",
          authorization.data.membership.profile_id,
        );
        return { success: true, provider };
      }

      await recordAuditEvent(
        org.id,
        provider,
        "connection_failed",
        authorization.data.membership.profile_id,
        {
          error_code:
            result === "skipped" ? "DELIVERY_NOT_QUEUED" : "DELIVERY_FAILED",
        },
      );
      return { success: false, error: "Webhook connection test failed." };
    }

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

export async function startHubSpotOAuth() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const org = authorization.data.organization;

  try {
    const { getHubSpotAuthorizationUrl } =
      await import("@/lib/integrations/adapters/hubspot");
    const { url } = await getHubSpotAuthorizationUrl(
      org.id,
      "/settings?tab=integrations",
      authorization.data.membership.profile_id,
    );
    return { url, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "HubSpot OAuth setup failed",
    };
  }
}

export async function startGHLOAuth() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const org = authorization.data.organization;

  try {
    const { getGHLAuthorizationUrl } =
      await import("@/lib/integrations/adapters/gohighlevel");
    const { url } = await getGHLAuthorizationUrl(
      org.id,
      "/settings?tab=integrations",
      authorization.data.membership.profile_id,
    );
    return { url, error: null };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "GoHighLevel OAuth setup failed",
    };
  }
}

export async function disconnectHubSpot() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { disconnectHubSpot } =
    await import("@/lib/integrations/adapters/hubspot");
  return disconnectHubSpot(
    authorization.data.organization.id,
    authorization.data.membership.profile_id,
  );
}

export async function disconnectGHL() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { disconnectGHL } =
    await import("@/lib/integrations/adapters/gohighlevel");
  return disconnectGHL(
    authorization.data.organization.id,
    authorization.data.membership.profile_id,
  );
}

export async function testHubSpot() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { testHubSpotConnection } =
    await import("@/lib/integrations/adapters/hubspot");
  return testHubSpotConnection(authorization.data.organization.id);
}

export async function testGHL() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { testGHLConnection } =
    await import("@/lib/integrations/adapters/gohighlevel");
  return testGHLConnection(authorization.data.organization.id);
}
