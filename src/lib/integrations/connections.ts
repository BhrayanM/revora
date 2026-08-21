import "server-only";

import { createHash } from "node:crypto";

import {
  decryptCredentialsObject,
  encryptCredentialsObject,
} from "@/lib/integrations/encryption";
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

  try {
    const config = parseStoredTallyConfig(row.config);
    if (config.routingTokenHash !== routingTokenHash) return null;
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
