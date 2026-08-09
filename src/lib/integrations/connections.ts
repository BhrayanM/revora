import "server-only";

import {
  decryptCredentialsObject,
  encryptCredentialsObject,
} from "@/lib/integrations/encryption";
import type {
  IntegrationConnection,
  IntegrationHealthStatus,
  IntegrationProviderId,
  IntegrationStatus,
} from "@/lib/integrations/types";
import { createServiceAdminClient } from "@/lib/supabase/server";

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
): Promise<{ error: string | null }> {
  const supabase = await createServiceAdminClient();
  const encrypted = encryptCredentialsObject(credentials);

  const { error } = await supabase.from("integrations").upsert(
    {
      organization_id: organizationId,
      provider,
      credentials: encrypted,
      is_active: true,
      status: "connected",
      health_status: "unknown",
      connected_at: new Date().toISOString(),
      connected_by: userId ?? null,
    },
    { onConflict: "organization_id, provider" },
  );

  if (error) return { error: error.message };
  return { error: null };
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
      health_status: "healthy",
      last_success_at: new Date().toISOString(),
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
  await supabase
    .from("integrations")
    .update({
      last_error_at: new Date().toISOString(),
      last_error_code: errorCode,
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider);
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
