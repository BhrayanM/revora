"use server";

import { createHash, randomBytes } from "node:crypto";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { dispatchIntegrationTestEvent } from "@/lib/automation/webhook-dispatcher";
import {
  createTallyWebhook,
  deleteTallyWebhook,
  getTallyFormFields,
  listTallyForms,
  verifyTallyWebhook,
} from "@/lib/integrations/adapters/tally";
import {
  normalizeAutomationWebhookCredentials,
  sendAutomationWebhookEvent,
} from "@/lib/integrations/automation-webhook-adapters";
import {
  disconnectConnection,
  getActiveTallyConnection,
  getDecryptedCredentials,
  listConnections,
  markConnectionError,
  markConnectionHealthy,
  saveConnection,
} from "@/lib/integrations/connections";
import { recordAuditEvent } from "@/lib/integrations/oauth";
import { buildIntegrationTestEvent } from "@/lib/integrations/outbound-events";
import {
  normalizeTallyApiKey,
  suggestTallyFieldMapping,
  validateTallyFieldMapping,
  type TallyFieldMapping,
} from "@/lib/integrations/tally-contract";
import { getSafeIntegrationError } from "@/lib/integrations/types";
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
  if (provider === "hubspot" || provider === "gohighlevel") {
    return { error: "Use the CRM OAuth connection flow." };
  }
  if (provider === "slack") {
    return { error: "Use the Slack OAuth connection flow." };
  }
  if (provider === "twilio") {
    return { error: "Use the verified Twilio connection flow." };
  }
  if (provider === "tally") {
    return { error: "Use the secure Tally form connection flow." };
  }
  if (provider === "google-calendar" || provider === "gmail") {
    return { error: "Use the Google Workspace OAuth connection flow." };
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

  if (provider === "hubspot" || provider === "gohighlevel") {
    return { error: "Use the CRM OAuth disconnect flow." };
  }
  if (provider === "slack") {
    return { error: "Use the Slack OAuth disconnect flow." };
  }
  if (provider === "twilio") {
    return { error: "Use the verified Twilio disconnect flow." };
  }
  if (provider === "tally") {
    return { error: "Use the secure Tally disconnect flow." };
  }
  if (provider === "google-calendar" || provider === "gmail") {
    return { error: "Use the shared Google Workspace disconnect flow." };
  }

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

    if (provider === "slack") {
      const { testSlackConnection } =
        await import("@/lib/integrations/adapters/slack");
      return testSlackConnection(org.id);
    }

    if (provider === "twilio") {
      const { testTwilioConnection } =
        await import("@/lib/integrations/adapters/twilio");
      return testTwilioConnection(org.id);
    }

    if (provider === "google-calendar") {
      const { testGoogleCalendarConnection } =
        await import("@/lib/integrations/adapters/google-workspace");
      return testGoogleCalendarConnection(org.id);
    }

    if (provider === "gmail") {
      const { testGmailConnection } =
        await import("@/lib/integrations/adapters/google-workspace");
      return testGmailConnection(org.id);
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

export async function startSlackOAuth() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  try {
    const { getSlackAuthorizationUrl } =
      await import("@/lib/integrations/adapters/slack");
    const { url } = await getSlackAuthorizationUrl(
      authorization.data.organization.id,
      "/settings?tab=integrations",
      authorization.data.membership.profile_id,
    );
    return { url, error: null };
  } catch {
    return { error: "Slack OAuth setup failed." };
  }
}

export async function startGoogleWorkspaceOAuth() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  try {
    const { getGoogleWorkspaceAuthorizationUrl } =
      await import("@/lib/integrations/adapters/google-workspace");
    const { url } = await getGoogleWorkspaceAuthorizationUrl(
      authorization.data.organization.id,
      "/settings?tab=integrations",
      authorization.data.membership.profile_id,
    );
    return { url, error: null };
  } catch {
    return { error: "Google Workspace OAuth setup failed." };
  }
}

function tallyActionError(
  errorCode:
    | "AUTH_ERROR"
    | "RATE_LIMITED"
    | "PROVIDER_UNAVAILABLE"
    | "INVALID_CREDENTIALS"
    | "REAUTH_REQUIRED"
    | "NETWORK_ERROR"
    | "INVALID_RESPONSE"
    | "CONFIGURATION_ERROR",
): string {
  return getSafeIntegrationError(errorCode).userMessage;
}

function buildTallyWebhookUrl(routingToken: string): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) {
    throw new Error("Public app URL is not configured.");
  }
  const appUrl = new URL(configuredUrl);
  if (
    appUrl.protocol !== "https:" ||
    appUrl.username ||
    appUrl.password ||
    appUrl.hash
  ) {
    throw new Error("Public app URL must be a secure HTTPS origin.");
  }
  return new URL(
    `/api/integrations/tally/webhook/${routingToken}`,
    appUrl.origin,
  ).toString();
}

export async function discoverTallyForms(apiKey: string) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { data: null, error: authorization.error };

  let normalizedApiKey: string;
  try {
    normalizedApiKey = normalizeTallyApiKey(apiKey);
  } catch {
    return { data: null, error: "Enter a valid Tally API key." };
  }

  const result = await listTallyForms(normalizedApiKey);
  if (!result.ok) {
    return { data: null, error: tallyActionError(result.errorCode) };
  }
  return { data: { forms: result.forms }, error: null };
}

export async function inspectTallyForm(apiKey: string, formId: string) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { data: null, error: authorization.error };

  let normalizedApiKey: string;
  try {
    normalizedApiKey = normalizeTallyApiKey(apiKey);
  } catch {
    return { data: null, error: "Enter a valid Tally API key." };
  }

  const result = await getTallyFormFields(normalizedApiKey, formId);
  if (!result.ok) {
    return { data: null, error: tallyActionError(result.errorCode) };
  }
  return {
    data: {
      fields: result.fields,
      suggestedMapping: suggestTallyFieldMapping(result.fields),
    },
    error: null,
  };
}

export async function connectTally(input: {
  apiKey: string;
  formId: string;
  mapping: TallyFieldMapping;
}) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const organizationId = authorization.data.organization.id;
  const profileId = authorization.data.membership.profile_id;
  let apiKey: string;
  try {
    apiKey = normalizeTallyApiKey(input.apiKey);
  } catch {
    return { error: "Enter a valid Tally API key." };
  }

  const formsResult = await listTallyForms(apiKey);
  if (!formsResult.ok) {
    await recordAuditEvent(
      organizationId,
      "tally",
      "connection_failed",
      profileId,
      { error_code: formsResult.errorCode },
    );
    return { error: tallyActionError(formsResult.errorCode) };
  }
  const form = formsResult.forms.find(
    (candidate) =>
      candidate.id === input.formId &&
      candidate.status === "PUBLISHED" &&
      !candidate.isClosed,
  );
  if (!form) {
    return { error: "Select an open, published Tally form." };
  }

  const fieldsResult = await getTallyFormFields(apiKey, form.id);
  if (!fieldsResult.ok) {
    await recordAuditEvent(
      organizationId,
      "tally",
      "connection_failed",
      profileId,
      { error_code: fieldsResult.errorCode },
    );
    return { error: tallyActionError(fieldsResult.errorCode) };
  }

  let fieldMapping: TallyFieldMapping;
  try {
    fieldMapping = validateTallyFieldMapping(
      input.mapping,
      fieldsResult.fields,
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Invalid Tally field mapping.",
    };
  }

  const routingToken = randomBytes(32).toString("base64url");
  const signingSecret = randomBytes(32).toString("base64url");
  const routingTokenHash = createHash("sha256")
    .update(routingToken, "utf8")
    .digest("hex");
  let webhookUrl: string;
  try {
    webhookUrl = buildTallyWebhookUrl(routingToken);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Public app URL is not configured.",
    };
  }

  const webhookResult = await createTallyWebhook({
    apiKey,
    formId: form.id,
    webhookUrl,
    signingSecret,
    externalSubscriber: "revora",
  });
  if (!webhookResult.ok) {
    await recordAuditEvent(
      organizationId,
      "tally",
      "connection_failed",
      profileId,
      { error_code: webhookResult.errorCode },
    );
    return { error: tallyActionError(webhookResult.errorCode) };
  }

  let persistenceError: string | null;
  try {
    const saved = await saveConnection(
      organizationId,
      "tally",
      { api_key: apiKey, signing_secret: signingSecret },
      profileId,
      {
        config: {
          form_id: form.id,
          form_name: form.name,
          webhook_id: webhookResult.webhook.id,
          field_mapping: fieldMapping,
          routing_token_hash: routingTokenHash,
        },
        externalAccountId: form.id,
        externalAccountName: form.name,
        healthStatus: "healthy",
      },
    );
    persistenceError = saved.error;
  } catch {
    persistenceError = "PERSISTENCE_ERROR";
  }

  if (persistenceError) {
    await deleteTallyWebhook(apiKey, webhookResult.webhook.id);
    await recordAuditEvent(
      organizationId,
      "tally",
      "connection_failed",
      profileId,
      { error_code: "PERSISTENCE_ERROR" },
    );
    return { error: "Tally connection could not be saved." };
  }

  await recordAuditEvent(organizationId, "tally", "connected", profileId, {
    form_id: form.id,
  });
  await recordAuditEvent(
    organizationId,
    "tally",
    "webhook_verified",
    profileId,
    { form_id: form.id },
  );
  return { error: null };
}

export async function testTally() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) {
    return { success: false, error: authorization.error };
  }

  const organizationId = authorization.data.organization.id;
  const profileId = authorization.data.membership.profile_id;
  const connection = await getActiveTallyConnection(organizationId);
  if (!connection) {
    return { success: false, error: "Tally is not configured." };
  }

  const [fieldsResult, webhookResult] = await Promise.all([
    getTallyFormFields(connection.credentials.apiKey, connection.config.formId),
    verifyTallyWebhook(
      connection.credentials.apiKey,
      connection.config.webhookId,
      connection.config.formId,
    ),
  ]);
  const failure = !fieldsResult.ok
    ? fieldsResult
    : !webhookResult.ok
      ? webhookResult
      : null;
  if (failure) {
    await markConnectionError(organizationId, "tally", failure.errorCode);
    await recordAuditEvent(
      organizationId,
      "tally",
      "connection_failed",
      profileId,
      { error_code: failure.errorCode },
    );
    return { success: false, error: tallyActionError(failure.errorCode) };
  }

  await markConnectionHealthy(organizationId, "tally");
  await recordAuditEvent(
    organizationId,
    "tally",
    "webhook_verified",
    profileId,
    { validation_mode: "read_only" },
  );
  return { success: true };
}

export async function disconnectTally() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const organizationId = authorization.data.organization.id;
  const profileId = authorization.data.membership.profile_id;
  const connection = await getActiveTallyConnection(organizationId);
  const cleanup = connection
    ? await deleteTallyWebhook(
        connection.credentials.apiKey,
        connection.config.webhookId,
      )
    : null;
  const disconnected = await disconnectConnection(organizationId, "tally");
  if (disconnected.error) {
    return { error: "Tally could not be disconnected locally." };
  }

  await recordAuditEvent(organizationId, "tally", "disconnected", profileId, {
    remote_cleanup:
      cleanup === null ? "not_available" : cleanup.ok ? "succeeded" : "failed",
  });
  return {
    error: null,
    ...(cleanup && !cleanup.ok
      ? {
          warning:
            "Tally was disconnected; remote cleanup could not be verified.",
        }
      : {}),
  };
}

export async function saveTwilioIntegration(
  credentials: Record<string, unknown>,
) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const { normalizeTwilioCredentials } =
    await import("@/lib/integrations/twilio-contract");
  const { validateTwilioCredentials } =
    await import("@/lib/integrations/adapters/twilio");

  let normalized;
  try {
    normalized = normalizeTwilioCredentials(credentials);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Invalid Twilio credentials.",
    };
  }

  const orgId = authorization.data.organization.id;
  const profileId = authorization.data.membership.profile_id;
  const validation = await validateTwilioCredentials(normalized);
  if (!validation.ok) {
    await recordAuditEvent(orgId, "twilio", "connection_failed", profileId, {
      error_code: validation.errorCode,
    });
    return { error: getSafeIntegrationError(validation.errorCode).userMessage };
  }

  const storedCredentials: Record<string, unknown> = {
    account_sid: normalized.account_sid,
    auth_token: normalized.auth_token,
    ...(normalized.phone_number
      ? { phone_number: normalized.phone_number }
      : {}),
  };
  const result = await saveConnection(
    orgId,
    "twilio",
    storedCredentials,
    profileId,
    {
      externalAccountId: validation.accountSid,
      externalAccountName: validation.friendlyName,
      healthStatus: "healthy",
    },
  );
  if (result.error) {
    await recordAuditEvent(orgId, "twilio", "connection_failed", profileId, {
      error_code: "PERSISTENCE_ERROR",
    });
    return { error: "Twilio connection could not be saved." };
  }

  await recordAuditEvent(orgId, "twilio", "connected", profileId, {
    validation_mode: "read_only",
  });
  return { error: null };
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

export async function disconnectSlack() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { disconnectSlack } = await import("@/lib/integrations/adapters/slack");
  return disconnectSlack(
    authorization.data.organization.id,
    authorization.data.membership.profile_id,
  );
}

export async function disconnectTwilio() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { disconnectTwilio } =
    await import("@/lib/integrations/adapters/twilio");
  return disconnectTwilio(
    authorization.data.organization.id,
    authorization.data.membership.profile_id,
  );
}

export async function disconnectGoogleWorkspace() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { disconnectGoogleWorkspace } =
    await import("@/lib/integrations/adapters/google-workspace");
  return disconnectGoogleWorkspace(
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

export async function testSlack() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { testSlackConnection } =
    await import("@/lib/integrations/adapters/slack");
  return testSlackConnection(authorization.data.organization.id);
}

export async function testTwilio() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { testTwilioConnection } =
    await import("@/lib/integrations/adapters/twilio");
  return testTwilioConnection(authorization.data.organization.id);
}

export async function testGoogleCalendar() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { testGoogleCalendarConnection } =
    await import("@/lib/integrations/adapters/google-workspace");
  return testGoogleCalendarConnection(authorization.data.organization.id);
}

export async function testGmail() {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };
  const { testGmailConnection } =
    await import("@/lib/integrations/adapters/google-workspace");
  return testGmailConnection(authorization.data.organization.id);
}
