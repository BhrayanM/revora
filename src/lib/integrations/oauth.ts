import "server-only";

import { createHash, randomBytes } from "crypto";

import type { IntegrationProviderId } from "@/lib/integrations/types";
import { createServiceAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const OAUTH_STATE_EXPIRATION_MS = 10 * 60 * 1000;

export async function generateOAuthState(
  organizationId: string,
  provider: IntegrationProviderId,
  returnPath: string,
  userId?: string,
): Promise<{ state: string; stateHash: string }> {
  const rawState = randomBytes(32).toString("hex");
  const stateHash = createHash("sha256").update(rawState).digest("hex");
  const expiresAt = new Date(Date.now() + OAUTH_STATE_EXPIRATION_MS);

  const supabase = await createServiceAdminClient();
  await supabase.from("integration_oauth_states").insert({
    organization_id: organizationId,
    provider,
    state_hash: stateHash,
    created_by: userId ?? null,
    expires_at: expiresAt.toISOString(),
    return_path: returnPath,
  });

  return { state: rawState, stateHash };
}

export async function generatePKCEChallenge(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function storePKCEVerifier(
  stateHash: string,
  verifier: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase
    .from("integration_oauth_states")
    .update({
      pkce_verifier_encrypted: verifier,
    })
    .eq("state_hash", stateHash);
}

export async function validateOAuthState(
  rawState: string,
  provider: IntegrationProviderId,
  organizationId: string,
): Promise<{
  valid: boolean;
  error?: string;
  stateHash?: string;
  returnPath?: string;
  verifier?: string;
}> {
  const stateHash = createHash("sha256").update(rawState).digest("hex");

  const supabase = await createServiceAdminClient();
  const { data, error } = await supabase
    .from("integration_oauth_states")
    .select("*")
    .eq("state_hash", stateHash)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: "Invalid OAuth state" };
  }

  if (data.consumed_at) {
    return { valid: false, error: "OAuth state has already been used" };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "OAuth state has expired" };
  }

  if (data.organization_id !== organizationId) {
    return { valid: false, error: "OAuth state does not match organization" };
  }

  if (data.provider !== provider) {
    return { valid: false, error: "OAuth state does not match provider" };
  }

  await supabase
    .from("integration_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    valid: true,
    stateHash: data.state_hash,
    returnPath: data.return_path ?? undefined,
    verifier: data.pkce_verifier_encrypted ?? undefined,
  };
}

export async function recordAuditEvent(
  organizationId: string,
  provider: IntegrationProviderId,
  eventType: string,
  actorProfileId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase.from("integration_audit_events").insert({
    organization_id: organizationId,
    provider,
    event_type: eventType,
    actor_profile_id: actorProfileId ?? null,
    metadata: (metadata ?? {}) as Json,
  });
}
