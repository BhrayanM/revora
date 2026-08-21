import "server-only";

import { createHash, randomBytes } from "crypto";

import {
  decryptCredential,
  encryptCredential,
} from "@/lib/integrations/encryption";
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
  const { error } = await supabase.from("integration_oauth_states").insert({
    organization_id: organizationId,
    provider,
    state_hash: stateHash,
    created_by: userId ?? null,
    expires_at: expiresAt.toISOString(),
    return_path: returnPath,
  });
  if (error) {
    throw new Error("OAuth state could not be created.");
  }

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
  const encryptedVerifier = encryptCredential(verifier);
  const { data, error } = await supabase
    .from("integration_oauth_states")
    .update({
      pkce_verifier_encrypted: encryptedVerifier,
    })
    .eq("state_hash", stateHash)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw new Error("OAuth PKCE verifier could not be stored.");
  }
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

  const consumedAt = new Date().toISOString();
  const { data: consumed, error: consumeError } = await supabase
    .from("integration_oauth_states")
    .update({ consumed_at: consumedAt })
    .eq("id", data.id)
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .is("consumed_at", null)
    .gt("expires_at", consumedAt)
    .select("id")
    .maybeSingle();

  if (consumeError || !consumed) {
    return { valid: false, error: "OAuth state could not be consumed" };
  }

  let verifier: string | undefined;
  if (data.pkce_verifier_encrypted) {
    try {
      verifier = decryptCredential(data.pkce_verifier_encrypted);
    } catch {
      return { valid: false, error: "OAuth state is invalid" };
    }
  }

  return {
    valid: true,
    stateHash: data.state_hash,
    returnPath: data.return_path ?? undefined,
    verifier,
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
  const { error } = await supabase.from("integration_audit_events").insert({
    organization_id: organizationId,
    provider,
    event_type: eventType,
    actor_profile_id: actorProfileId ?? null,
    metadata: (metadata ?? {}) as Json,
  });
  if (error) {
    console.warn(
      `[audit] failed to record event ${eventType} for ${provider}: ${error.message}`,
    );
  }
}
