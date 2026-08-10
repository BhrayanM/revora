import "server-only";

import {
  getDecryptedCredentials,
  markConnectionError,
  markConnectionHealthy,
} from "@/lib/integrations/connections";
import { encryptCredentialsObject } from "@/lib/integrations/encryption";
import {
  generateOAuthState,
  generatePKCEChallenge,
  recordAuditEvent,
  storePKCEVerifier,
  validateOAuthState,
} from "@/lib/integrations/oauth";
import { getSafeIntegrationError } from "@/lib/integrations/types";
import type { Json } from "@/lib/supabase/types";

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
const HUBSPOT_API_BASE = "https://api.hubapi.com";
const HUBSPOT_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
];

function getHubSpotConfig() {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "HubSpot OAuth is not configured. Set HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, and HUBSPOT_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

async function hubspotApi(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: unknown; headers: Headers }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    const body = await res.text();
    let data: unknown = body;
    try {
      data = JSON.parse(body);
    } catch {
      /* not JSON */
    }

    return { ok: res.ok, status: res.status, data, headers: res.headers };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeHubSpotError(status: number): string {
  if (status === 401) return "INVALID_CREDENTIALS";
  if (status === 403) return "INSUFFICIENT_SCOPE";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  if (status === 400) return "INVALID_REQUEST";
  return "PROVIDER_UNAVAILABLE";
}

function extractRetryAfter(headers: Headers): number | null {
  const value = headers.get("Retry-After");
  if (!value) return null;
  const seconds = parseInt(value, 10);
  return isNaN(seconds) ? null : seconds * 1000;
}

export async function getHubSpotAuthorizationUrl(
  organizationId: string,
  returnPath: string,
  userId?: string,
): Promise<{ url: string; state: string }> {
  const { clientId, redirectUri } = getHubSpotConfig();
  const { state, stateHash } = await generateOAuthState(
    organizationId,
    "hubspot",
    returnPath,
    userId,
  );
  const { verifier, challenge } = await generatePKCEChallenge();
  await storePKCEVerifier(stateHash, verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: HUBSPOT_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return { url: `${HUBSPOT_AUTH_URL}?${params.toString()}`, state };
}

export async function handleHubSpotCallback(
  code: string,
  rawState: string,
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null }> {
  const validated = await validateOAuthState(
    rawState,
    "hubspot",
    organizationId,
  );
  if (!validated.valid) {
    return { error: validated.error ?? "Invalid OAuth state" };
  }

  const { clientId, clientSecret, redirectUri } = getHubSpotConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  if (validated.verifier) {
    body.set("code_verifier", validated.verifier);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(HUBSPOT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      await recordAuditEvent(
        organizationId,
        "hubspot",
        "connection_failed",
        profileId,
      );
      return { error: "HubSpot authorization failed. Please try again." };
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const credentials = encryptCredentialsObject({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    const tokenExpiresAt = new Date(
      Date.now() + data.expires_in * 1000,
    ).toISOString();

    const supabase = (await import("@/lib/supabase/server"))
      .createServiceAdminClient;
    const client = await supabase();

    const { data: portalData } = await hubspotApi(
      data.access_token,
      "/account-info/v3/details",
    );

    const portalName =
      (portalData as { portalName?: string })?.portalName ?? null;
    const portalId =
      (portalData as { portalId?: number })?.portalId?.toString() ?? null;

    await client.from("integrations").upsert(
      {
        organization_id: organizationId,
        provider: "hubspot",
        credentials: credentials as Json,
        is_active: true,
        status: "connected",
        health_status: "unknown",
        connected_at: new Date().toISOString(),
        connected_by: profileId ?? null,
        external_account_id: portalId,
        external_account_name: portalName,
        scopes: HUBSPOT_SCOPES,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "organization_id, provider" },
    );

    await recordAuditEvent(organizationId, "hubspot", "connected", profileId);
    return { error: null };
  } catch {
    return { error: "HubSpot connection failed. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function refreshHubSpotToken(
  organizationId: string,
): Promise<{ error: string | null }> {
  const creds = await getDecryptedCredentials(organizationId, "hubspot");
  if (!creds || !creds["refresh_token"]) {
    return { error: "No refresh token available. Please reconnect." };
  }

  const { clientId, clientSecret } = getHubSpotConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(HUBSPOT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: creds["refresh_token"] as string,
      }).toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      await markConnectionError(organizationId, "hubspot", "REFRESH_FAILED");
      await recordAuditEvent(organizationId, "hubspot", "token_refresh_failed");
      return { error: "Token refresh failed. Please reconnect." };
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const rawCreds: Record<string, string> = {
      access_token: data.access_token,
    };
    const storedRefresh = (data.refresh_token || creds["refresh_token"]) as
      string | undefined;
    if (storedRefresh) {
      rawCreds.refresh_token = storedRefresh;
    }
    const newCreds = encryptCredentialsObject(rawCreds);

    const tokenExpiresAt = new Date(
      Date.now() + data.expires_in * 1000,
    ).toISOString();

    const supabase = (await import("@/lib/supabase/server"))
      .createServiceAdminClient;
    const client = await supabase();

    await client
      .from("integrations")
      .update({
        credentials: newCreds as Json,
        token_expires_at: tokenExpiresAt,
        status: "connected",
        health_status: "healthy",
      })
      .eq("organization_id", organizationId)
      .eq("provider", "hubspot");

    await recordAuditEvent(organizationId, "hubspot", "token_refreshed");
    return { error: null };
  } catch {
    return { error: "Token refresh failed." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function testHubSpotConnection(
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  const creds = await getDecryptedCredentials(organizationId, "hubspot");
  if (!creds || !creds["access_token"]) {
    return { success: false, error: "Integration not configured" };
  }

  const { ok, status } = await hubspotApi(
    creds["access_token"] as string,
    "/crm/v3/objects/contacts?limit=1",
  );

  if (ok) {
    await markConnectionHealthy(organizationId, "hubspot");
    return { success: true };
  }

  const category = normalizeHubSpotError(status);
  await markConnectionError(organizationId, "hubspot", category);
  return {
    success: false,
    error: getSafeIntegrationError(category as never).userMessage,
  };
}

export async function disconnectHubSpot(
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null }> {
  const supabase = (await import("@/lib/supabase/server"))
    .createServiceAdminClient;
  const client = await supabase();

  await client
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
    .eq("provider", "hubspot");

  await recordAuditEvent(organizationId, "hubspot", "disconnected", profileId);
  return { error: null };
}

export async function getHubSpotAccessToken(
  organizationId: string,
): Promise<string | null> {
  const creds = await getDecryptedCredentials(organizationId, "hubspot");
  if (!creds || !creds["access_token"]) return null;
  return creds["access_token"] as string;
}

export {
  hubspotApi,
  HUBSPOT_API_BASE,
  normalizeHubSpotError,
  extractRetryAfter,
  HUBSPOT_SCOPES,
};
