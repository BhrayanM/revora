import "server-only";

import { createHash } from "node:crypto";

import {
  decryptCredentialsObject,
  encryptCredentialsObject,
} from "@/lib/integrations/encryption";
import {
  GOOGLE_WORKSPACE_SCOPES,
  hasExactGoogleWorkspaceScopes,
} from "@/lib/integrations/google-workspace-contract";
import type { TallyFieldMapping } from "@/lib/integrations/tally-contract";
import type {
  AutomationWebhookProviderId,
  IntegrationConnection,
  IntegrationHealthStatus,
  IntegrationProviderId,
  IntegrationStatus,
} from "@/lib/integrations/types";
import { createServiceAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const TALLY_ID_PATTERN = /^[A-Za-z0-9_-]{1,255}$/;
const TALLY_ROUTING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TALLY_ROUTING_HASH_PATTERN = /^[a-f0-9]{64}$/;
const TALLY_MAPPING_KEYS = [
  "name",
  "email",
  "phone",
  "company",
  "message",
] as const;
const GOOGLE_WORKSPACE_PROVIDER_IDS = ["google-calendar", "gmail"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredTallyConfig(
  value: unknown,
): ActiveTallyConnection["config"] {
  if (!isRecord(value)) throw new Error("Invalid Tally connection config.");
  const formId = value["form_id"];
  const formName = value["form_name"];
  const webhookId = value["webhook_id"];
  const routingTokenHash = value["routing_token_hash"];
  const rawMapping = value["field_mapping"];
  if (
    typeof formId !== "string" ||
    !TALLY_ID_PATTERN.test(formId) ||
    typeof formName !== "string" ||
    formName.trim().length === 0 ||
    formName.length > 300 ||
    typeof webhookId !== "string" ||
    !TALLY_ID_PATTERN.test(webhookId) ||
    typeof routingTokenHash !== "string" ||
    !TALLY_ROUTING_HASH_PATTERN.test(routingTokenHash) ||
    !isRecord(rawMapping)
  ) {
    throw new Error("Invalid Tally connection config.");
  }

  const mapping: TallyFieldMapping = {};
  const usedFieldIds = new Set<string>();
  for (const key of TALLY_MAPPING_KEYS) {
    const fieldId = rawMapping[key];
    if (fieldId === undefined || fieldId === null || fieldId === "") continue;
    if (
      typeof fieldId !== "string" ||
      !TALLY_ID_PATTERN.test(fieldId) ||
      usedFieldIds.has(fieldId)
    ) {
      throw new Error("Invalid Tally connection config.");
    }
    mapping[key] = fieldId;
    usedFieldIds.add(fieldId);
  }
  if (
    Object.keys(rawMapping).some(
      (key) =>
        !TALLY_MAPPING_KEYS.includes(
          key as (typeof TALLY_MAPPING_KEYS)[number],
        ),
    ) ||
    (!mapping.email && !mapping.phone)
  ) {
    throw new Error("Invalid Tally connection config.");
  }

  return {
    formId,
    formName: formName.trim(),
    webhookId,
    routingTokenHash,
    fieldMapping: mapping,
  };
}

export async function getConnection(
  organizationId: string,
  provider: IntegrationProviderId,
): Promise<IntegrationConnection | null> {
  const supabase = await createServiceAdminClient();

  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, organization_id, provider, status, health_status, connected_at, external_account_id, external_account_name, scopes, token_expires_at, last_success_at, last_error_at, last_error_code, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    provider: data.provider as IntegrationProviderId,
    status: data.status as IntegrationStatus,
    healthStatus: data.health_status as IntegrationHealthStatus,
    connectedAt: data.connected_at,
    externalAccountId: data.external_account_id,
    externalAccountName: data.external_account_name,
    scopes: data.scopes,
    tokenExpiresAt: data.token_expires_at,
    lastSuccessAt: data.last_success_at,
    lastErrorAt: data.last_error_at,
    lastErrorCode: data.last_error_code,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function listConnections(
  organizationId: string,
): Promise<IntegrationConnection[]> {
  const supabase = await createServiceAdminClient();

  const { data, error } = await supabase
    .from("integrations")
    .select(
      "id, organization_id, provider, status, health_status, connected_at, external_account_id, external_account_name, scopes, token_expires_at, last_success_at, last_error_at, last_error_code, created_at, updated_at",
    )
    .eq("organization_id", organizationId);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider as IntegrationProviderId,
    status: row.status as IntegrationStatus,
    healthStatus: row.health_status as IntegrationHealthStatus,
    connectedAt: row.connected_at,
    externalAccountId: row.external_account_id,
    externalAccountName: row.external_account_name,
    scopes: row.scopes,
    tokenExpiresAt: row.token_expires_at,
    lastSuccessAt: row.last_success_at,
    lastErrorAt: row.last_error_at,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveConnection(
  organizationId: string,
  provider: IntegrationProviderId,
  credentials: Record<string, unknown>,
  userId?: string,
  options?: {
    config?: Record<string, unknown>;
    externalAccountId?: string;
    externalAccountName?: string;
    healthStatus?: IntegrationHealthStatus;
    scopes?: string[];
  },
): Promise<{ error: string | null }> {
  const supabase = await createServiceAdminClient();
  const encrypted = encryptCredentialsObject(credentials);
  const connectedAt = new Date().toISOString();

  const { error } = await supabase.from("integrations").upsert(
    {
      organization_id: organizationId,
      provider,
      credentials: encrypted,
      is_active: true,
      status: "connected",
      connected_at: connectedAt,
      connected_by: userId ?? null,
      health_status: options?.healthStatus ?? "unknown",
      ...(options?.config ? { config: options.config as Json } : {}),
      ...(options?.externalAccountName !== undefined
        ? { external_account_name: options.externalAccountName }
        : {}),
      ...(options?.externalAccountId !== undefined
        ? { external_account_id: options.externalAccountId }
        : {}),
      ...(options?.scopes !== undefined ? { scopes: options.scopes } : {}),
      ...(options?.healthStatus === "healthy"
        ? {
            last_success_at: connectedAt,
            last_error_at: null,
            last_error_code: null,
          }
        : {}),
    },
    { onConflict: "organization_id, provider" },
  );

  if (error) return { error: error.message };
  return { error: null };
}

export interface ActiveGoogleWorkspaceConnection {
  organizationId: string;
  accessToken: string;
  refreshToken: string;
  subject: string;
  email: string;
  scopes: string[];
  tokenExpiresAt: string;
}

type GoogleWorkspaceConnectionRow = {
  organization_id: string;
  provider: string;
  credentials: unknown;
  external_account_id: string | null;
  external_account_name: string | null;
  scopes: string[] | null;
  token_expires_at: string | null;
};

export function parseGoogleWorkspaceConnectionRows(
  rows: GoogleWorkspaceConnectionRow[],
): ActiveGoogleWorkspaceConnection | null {
  if (rows.length !== GOOGLE_WORKSPACE_PROVIDER_IDS.length) return null;
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  const calendar = byProvider.get("google-calendar");
  const gmail = byProvider.get("gmail");
  if (!calendar || !gmail) return null;

  const subject = calendar.external_account_id;
  const email = calendar.external_account_name?.trim().toLowerCase() ?? null;
  const tokenExpiresAt = calendar.token_expires_at;
  if (
    !subject ||
    subject.length > 255 ||
    !email ||
    email.length > 320 ||
    !email.includes("@") ||
    !tokenExpiresAt ||
    !Number.isFinite(new Date(tokenExpiresAt).getTime()) ||
    gmail.organization_id !== calendar.organization_id ||
    gmail.external_account_id !== subject ||
    gmail.external_account_name?.trim().toLowerCase() !== email ||
    gmail.token_expires_at !== tokenExpiresAt ||
    !hasExactGoogleWorkspaceScopes(calendar.scopes) ||
    !hasExactGoogleWorkspaceScopes(gmail.scopes)
  ) {
    return null;
  }

  try {
    if (!isRecord(calendar.credentials) || !isRecord(gmail.credentials)) {
      return null;
    }
    const calendarCredentials = decryptCredentialsObject(calendar.credentials);
    const gmailCredentials = decryptCredentialsObject(gmail.credentials);
    const accessToken = calendarCredentials["access_token"];
    const refreshToken = calendarCredentials["refresh_token"];
    if (
      typeof accessToken !== "string" ||
      accessToken.length < 1 ||
      accessToken.length > 4096 ||
      typeof refreshToken !== "string" ||
      refreshToken.length < 1 ||
      refreshToken.length > 4096 ||
      gmailCredentials["access_token"] !== accessToken ||
      gmailCredentials["refresh_token"] !== refreshToken
    ) {
      return null;
    }
    return {
      organizationId: calendar.organization_id,
      accessToken,
      refreshToken,
      subject,
      email,
      scopes: [...GOOGLE_WORKSPACE_SCOPES],
      tokenExpiresAt,
    };
  } catch {
    return null;
  }
}

export async function saveGoogleWorkspaceConnections(input: {
  organizationId: string;
  accessToken: string;
  refreshToken: string;
  subject: string;
  email: string;
  scopes: string[];
  tokenExpiresAt: string;
  userId?: string;
}): Promise<{ error: string | null }> {
  const expiresAt = new Date(input.tokenExpiresAt);
  if (
    !input.organizationId ||
    input.accessToken.length < 1 ||
    input.accessToken.length > 4096 ||
    input.refreshToken.length < 1 ||
    input.refreshToken.length > 4096 ||
    input.subject.length < 1 ||
    input.subject.length > 255 ||
    input.email.length < 3 ||
    input.email.length > 320 ||
    !input.email.includes("@") ||
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= Date.now() ||
    !hasExactGoogleWorkspaceScopes(input.scopes)
  ) {
    return { error: "Invalid Google Workspace connection data." };
  }
  const supabase = await createServiceAdminClient();
  const encrypted = encryptCredentialsObject({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
  });
  const connectedAt = new Date().toISOString();
  const common = {
    organization_id: input.organizationId,
    credentials: encrypted,
    config: { workspace_bundle: "google-workspace" } as Json,
    is_active: true,
    status: "connected",
    connected_at: connectedAt,
    connected_by: input.userId ?? null,
    health_status: "healthy",
    external_account_id: input.subject,
    external_account_name: input.email,
    scopes: [...GOOGLE_WORKSPACE_SCOPES],
    token_expires_at: input.tokenExpiresAt,
    last_success_at: connectedAt,
    last_error_at: null,
    last_error_code: null,
  };
  const { error } = await supabase.from("integrations").upsert(
    GOOGLE_WORKSPACE_PROVIDER_IDS.map((provider) => ({
      ...common,
      provider,
    })),
    { onConflict: "organization_id,provider" },
  );
  return { error: error?.message ?? null };
}

async function loadGoogleWorkspaceConnection(
  organizationId: string,
  statuses: string[],
): Promise<ActiveGoogleWorkspaceConnection | null> {
  const supabase = await createServiceAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select(
      "organization_id, provider, credentials, external_account_id, external_account_name, scopes, token_expires_at",
    )
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("status", statuses)
    .in("provider", [...GOOGLE_WORKSPACE_PROVIDER_IDS]);
  if (error || !data) return null;
  return parseGoogleWorkspaceConnectionRows(data);
}

export async function getActiveGoogleWorkspaceConnection(
  organizationId: string,
): Promise<ActiveGoogleWorkspaceConnection | null> {
  return loadGoogleWorkspaceConnection(organizationId, [
    "connected",
    "degraded",
  ]);
}

export async function getGoogleWorkspaceConnectionForDisconnect(
  organizationId: string,
): Promise<ActiveGoogleWorkspaceConnection | null> {
  return loadGoogleWorkspaceConnection(organizationId, [
    "connected",
    "degraded",
    "reauth_required",
    "error",
  ]);
}

export async function updateGoogleWorkspaceTokens(input: {
  organizationId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}): Promise<{ error: string | null }> {
  const supabase = await createServiceAdminClient();
  const encrypted = encryptCredentialsObject({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
  });
  const { data, error } = await supabase
    .from("integrations")
    .update({
      credentials: encrypted,
      token_expires_at: input.tokenExpiresAt,
      status: "connected",
      health_status: "healthy",
      last_success_at: new Date().toISOString(),
      last_error_at: null,
      last_error_code: null,
    })
    .eq("organization_id", input.organizationId)
    .in("provider", [...GOOGLE_WORKSPACE_PROVIDER_IDS])
    .select("provider");
  if (error) return { error: error.message };
  const updated = new Set((data ?? []).map((row) => row.provider));
  if (
    !GOOGLE_WORKSPACE_PROVIDER_IDS.every((provider) => updated.has(provider))
  ) {
    return { error: "Google Workspace connection is incomplete." };
  }
  return { error: null };
}

export async function markGoogleWorkspaceHealthy(
  organizationId: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase
    .from("integrations")
    .update({
      status: "connected",
      health_status: "healthy",
      last_success_at: new Date().toISOString(),
      last_error_at: null,
      last_error_code: null,
    })
    .eq("organization_id", organizationId)
    .in("provider", [...GOOGLE_WORKSPACE_PROVIDER_IDS]);
}

export async function markGoogleWorkspaceError(
  organizationId: string,
  errorCode: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  const reauthRequired = [
    "INVALID_CREDENTIALS",
    "REAUTH_REQUIRED",
    "REFRESH_FAILED",
  ].includes(errorCode);
  await supabase
    .from("integrations")
    .update({
      status: reauthRequired ? "reauth_required" : "degraded",
      health_status: reauthRequired ? "reauth_required" : "degraded",
      last_error_at: new Date().toISOString(),
      last_error_code: errorCode,
    })
    .eq("organization_id", organizationId)
    .in("provider", [...GOOGLE_WORKSPACE_PROVIDER_IDS]);
}

export async function disconnectGoogleWorkspaceConnections(
  organizationId: string,
): Promise<{ error: string | null }> {
  const supabase = await createServiceAdminClient();
  const { error } = await supabase
    .from("integrations")
    .update({
      status: "disconnected",
      health_status: "unknown",
      credentials: {},
      config: {},
      is_active: false,
      external_account_id: null,
      external_account_name: null,
      scopes: null,
      token_expires_at: null,
      last_success_at: null,
      last_error_at: null,
      last_error_code: null,
    })
    .eq("organization_id", organizationId)
    .in("provider", [...GOOGLE_WORKSPACE_PROVIDER_IDS]);
  return { error: error?.message ?? null };
}

export interface ActiveAutomationWebhookConnection {
  id: string;
  provider: AutomationWebhookProviderId;
  credentials: Record<string, unknown>;
}

export interface ActiveTallyConnection {
  id: string;
  organizationId: string;
  credentials: {
    apiKey: string;
    signingSecret: string;
  };
  config: {
    formId: string;
    formName: string;
    webhookId: string;
    fieldMapping: TallyFieldMapping;
    routingTokenHash: string;
  };
}

function buildActiveTallyConnection(
  row: {
    id: string;
    organization_id: string;
    credentials: unknown;
    config: unknown;
  },
  expectedRoutingTokenHash?: string,
): ActiveTallyConnection | null {
  try {
    const config = parseStoredTallyConfig(row.config);
    if (
      expectedRoutingTokenHash &&
      config.routingTokenHash !== expectedRoutingTokenHash
    ) {
      return null;
    }
    if (!isRecord(row.credentials)) return null;
    const decrypted = decryptCredentialsObject(row.credentials);
    const apiKey = decrypted["api_key"];
    const signingSecret = decrypted["signing_secret"];
    if (
      typeof apiKey !== "string" ||
      apiKey.length === 0 ||
      apiKey.length > 4096 ||
      typeof signingSecret !== "string" ||
      signingSecret.length < 16 ||
      signingSecret.length > 4096
    ) {
      return null;
    }

    return {
      id: row.id,
      organizationId: row.organization_id,
      credentials: { apiKey, signingSecret },
      config,
    };
  } catch {
    return null;
  }
}

export async function getActiveTallyConnection(
  organizationId: string,
): Promise<ActiveTallyConnection | null> {
  const supabase = await createServiceAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("id, organization_id, credentials, config")
    .eq("organization_id", organizationId)
    .eq("provider", "tally")
    .eq("is_active", true)
    .in("status", ["connected", "degraded"])
    .maybeSingle();

  if (error || !data) return null;
  return buildActiveTallyConnection(data);
}

export async function getActiveTallyConnectionByRoutingToken(
  routingToken: string,
): Promise<ActiveTallyConnection | null> {
  if (!TALLY_ROUTING_TOKEN_PATTERN.test(routingToken)) return null;
  const routingTokenHash = createHash("sha256")
    .update(routingToken, "utf8")
    .digest("hex");
  const supabase = await createServiceAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("id, organization_id, credentials, config")
    .eq("provider", "tally")
    .eq("is_active", true)
    .in("status", ["connected", "degraded"])
    .eq("config->>routing_token_hash", routingTokenHash)
    .limit(2);

  if (error || !data || data.length !== 1) return null;
  const row = data[0];
  if (!row) return null;
  return buildActiveTallyConnection(row, routingTokenHash);
}

export async function listActiveAutomationWebhookConnections(
  organizationId: string,
): Promise<ActiveAutomationWebhookConnection[]> {
  const supabase = await createServiceAdminClient();
  const providers: AutomationWebhookProviderId[] = ["n8n", "zapier", "make"];

  const { data, error } = await supabase
    .from("integrations")
    .select("id, provider, credentials")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("status", ["connected", "degraded"])
    .in("provider", providers);

  if (error) {
    console.error("[Automation Webhook] Connection lookup failed:", error.code);
    return [];
  }
  if (!data) return [];

  return data.flatMap((row) => {
    const provider = row.provider as AutomationWebhookProviderId;
    const stored = row.credentials as Record<string, unknown>;
    const hasEncryptedKey = Object.keys(stored).some((key) =>
      key.startsWith("encrypted_"),
    );

    try {
      const credentials = hasEncryptedKey
        ? decryptCredentialsObject(stored)
        : stored;
      return [{ id: row.id, provider, credentials }];
    } catch {
      console.error(
        `[Automation Webhook] Credential decryption failed for ${provider}.`,
      );
      return [];
    }
  });
}

export async function disconnectConnection(
  organizationId: string,
  provider: IntegrationProviderId,
): Promise<{ error: string | null }> {
  const supabase = await createServiceAdminClient();

  const { error } = await supabase
    .from("integrations")
    .update({
      status: "disconnected",
      health_status: "unknown",
      credentials: {},
      is_active: false,
      external_account_id: null,
      external_account_name: null,
      scopes: null,
      token_expires_at: null,
      last_success_at: null,
      last_error_at: null,
      last_error_code: null,
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getDecryptedCredentials(
  organizationId: string,
  provider: IntegrationProviderId,
): Promise<Record<string, unknown> | null> {
  const supabase = await createServiceAdminClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("credentials")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.credentials) return null;

  const creds = data.credentials as Record<string, unknown>;
  const hasEncryptedKey = Object.keys(creds).some((k) =>
    k.startsWith("encrypted_"),
  );

  if (hasEncryptedKey) {
    return decryptCredentialsObject(creds);
  }

  return creds;
}

export async function markConnectionHealthy(
  organizationId: string,
  provider: IntegrationProviderId,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase
    .from("integrations")
    .update({
      status: "connected",
      health_status: "healthy",
      last_success_at: new Date().toISOString(),
      last_error_at: null,
      last_error_code: null,
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);
}

export async function markConnectionError(
  organizationId: string,
  provider: IntegrationProviderId,
  errorCode: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  const reauthRequired = [
    "INVALID_CREDENTIALS",
    "REAUTH_REQUIRED",
    "REFRESH_FAILED",
  ].includes(errorCode);
  await supabase
    .from("integrations")
    .update({
      status: reauthRequired ? "reauth_required" : "degraded",
      health_status: reauthRequired ? "reauth_required" : "degraded",
      last_error_at: new Date().toISOString(),
      last_error_code: errorCode,
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);
}

export async function markWebhookConnectionHealthy(
  organizationId: string,
  provider: AutomationWebhookProviderId,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  const { error } = await supabase
    .from("integrations")
    .update({
      status: "connected",
      health_status: "healthy",
      last_success_at: new Date().toISOString(),
      last_error_at: null,
      last_error_code: null,
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);

  if (error) {
    console.error(
      "[Automation Webhook] Healthy status update failed:",
      error.code,
    );
  }
}

export async function markWebhookConnectionError(
  organizationId: string,
  provider: AutomationWebhookProviderId,
  errorCode: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  const credentialsRejected = errorCode === "INVALID_CREDENTIALS";

  const { error } = await supabase
    .from("integrations")
    .update({
      status: credentialsRejected ? "reauth_required" : "degraded",
      health_status: credentialsRejected ? "reauth_required" : "degraded",
      last_error_at: new Date().toISOString(),
      last_error_code: errorCode,
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);

  if (error) {
    console.error(
      "[Automation Webhook] Error status update failed:",
      error.code,
    );
  }
}

export async function rotateCredentials(
  organizationId: string,
  provider: IntegrationProviderId,
  newCredentials: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const supabase = await createServiceAdminClient();
  const encrypted = encryptCredentialsObject(newCredentials);

  const { error } = await supabase
    .from("integrations")
    .update({
      credentials: encrypted,
      status: "connected",
      health_status: "unknown",
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);

  if (error) return { error: error.message };
  return { error: null };
}
