import "server-only";

import {
  getDecryptedCredentials,
  markConnectionError,
  markConnectionHealthy,
} from "@/lib/integrations/connections";
import { encryptCredential } from "@/lib/integrations/encryption";
import {
  generateOAuthState,
  generatePKCEChallenge,
  recordAuditEvent,
  storePKCEVerifier,
  validateOAuthState,
} from "@/lib/integrations/oauth";
import type { Json } from "@/lib/supabase/types";

const GHL_AUTH_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_SCOPES = [
  "contacts.readonly",
  "contacts.write",
  "locations.readonly",
];

function getGHLConfig() {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GoHighLevel OAuth is not configured. Set GHL_CLIENT_ID, GHL_CLIENT_SECRET, and GHL_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

async function ghlApi(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: unknown; headers: Headers }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${GHL_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
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

function normalizeGHLError(status: number): string {
  if (status === 401) return "INVALID_CREDENTIALS";
  if (status === 403) return "INSUFFICIENT_SCOPE";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  if (status === 400) return "INVALID_REQUEST";
  return "PROVIDER_UNAVAILABLE";
}

export async function getGHLAuthorizationUrl(
  organizationId: string,
  returnPath: string,
  userId?: string,
): Promise<{ url: string; state: string }> {
  const { clientId, redirectUri } = getGHLConfig();
  const { state, stateHash } = await generateOAuthState(
    organizationId,
    "gohighlevel",
    returnPath,
    userId,
  );
  const { verifier, challenge } = await generatePKCEChallenge();
  await storePKCEVerifier(stateHash, verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GHL_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    response_type: "code",
  });

  return { url: `${GHL_AUTH_URL}?${params.toString()}`, state };
}

export async function handleGHLCallback(
  code: string,
  rawState: string,
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null }> {
  const validated = await validateOAuthState(
    rawState,
    "gohighlevel",
    organizationId,
  );
  if (!validated.valid) {
    return { error: validated.error ?? "Invalid OAuth state" };
  }

  const { clientId, clientSecret } = getGHLConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const formBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    });

    if (validated.verifier) {
      formBody.set("code_verifier", validated.verifier);
    }

    const res = await fetch(GHL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      await recordAuditEvent(
        organizationId,
        "gohighlevel",
        "connection_failed",
        profileId,
      );
      return { error: "GoHighLevel authorization failed. Please try again." };
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      locationId: string;
      companyId?: string;
    };

    const credentials: Record<string, unknown> = {
      access_token: encryptCredential(data.access_token),
      refresh_token: encryptCredential(data.refresh_token),
      location_id: encryptCredential(data.locationId),
    };

    if (data.companyId) {
      credentials["company_id"] = encryptCredential(data.companyId);
    }

    const tokenExpiresAt = new Date(
      Date.now() + data.expires_in * 1000,
    ).toISOString();

    const supabase = (await import("@/lib/supabase/server"))
      .createServiceAdminClient;
    const client = await supabase();

    let locationName: string | null = null;
    try {
      const { data: locData } = await ghlApi(
        data.access_token,
        `/locations/${data.locationId}`,
      );
      locationName =
        (locData as { location?: { name?: string } })?.location?.name ?? null;
    } catch {
      /* non-critical */
    }

    await client.from("integrations").upsert(
      {
        organization_id: organizationId,
        provider: "gohighlevel",
        credentials: credentials as Json,
        is_active: true,
        status: "connected",
        health_status: "unknown",
        connected_at: new Date().toISOString(),
        connected_by: profileId ?? null,
        external_account_id: data.locationId,
        external_account_name: locationName,
        scopes: GHL_SCOPES,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "organization_id, provider" },
    );

    await recordAuditEvent(
      organizationId,
      "gohighlevel",
      "connected",
      profileId,
    );
    return { error: null };
  } catch {
    return { error: "GoHighLevel connection failed. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function refreshGHLToken(
  organizationId: string,
): Promise<{ error: string | null }> {
  const creds = await getDecryptedCredentials(organizationId, "gohighlevel");
  if (!creds || !creds["refresh_token"]) {
    return { error: "No refresh token available. Please reconnect." };
  }

  const { clientId, clientSecret } = getGHLConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(GHL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: creds["refresh_token"] as string,
      }).toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      await markConnectionError(
        organizationId,
        "gohighlevel",
        "REFRESH_FAILED",
      );
      await recordAuditEvent(
        organizationId,
        "gohighlevel",
        "token_refresh_failed",
      );
      return { error: "Token refresh failed. Please reconnect." };
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const newCreds: Record<string, unknown> = {
      access_token: encryptCredential(data.access_token),
      location_id: creds["location_id"],
    };

    if (data.refresh_token) {
      newCreds["refresh_token"] = encryptCredential(data.refresh_token);
    } else {
      newCreds["refresh_token"] = creds["refresh_token"];
    }

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
      .eq("provider", "gohighlevel");

    await recordAuditEvent(organizationId, "gohighlevel", "token_refreshed");
    return { error: null };
  } catch {
    return { error: "Token refresh failed." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function testGHLConnection(
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  const creds = await getDecryptedCredentials(organizationId, "gohighlevel");
  if (!creds || !creds["access_token"]) {
    return { success: false, error: "Integration not configured" };
  }

  const { ok, status } = await ghlApi(
    creds["access_token"] as string,
    "/contacts/?limit=1",
  );

  if (ok) {
    await markConnectionHealthy(organizationId, "gohighlevel");
    return { success: true };
  }

  const category = normalizeGHLError(status);
  await markConnectionError(organizationId, "gohighlevel", category);
  return { success: false, error: "Connection test failed" };
}

export async function disconnectGHL(
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
    .eq("provider", "gohighlevel");

  await recordAuditEvent(
    organizationId,
    "gohighlevel",
    "disconnected",
    profileId,
  );
  return { error: null };
}

export async function getGHLAccessToken(
  organizationId: string,
): Promise<string | null> {
  const creds = await getDecryptedCredentials(organizationId, "gohighlevel");
  if (!creds || !creds["access_token"]) return null;
  return creds["access_token"] as string;
}

export async function getGHLLocationId(
  organizationId: string,
): Promise<string | null> {
  const creds = await getDecryptedCredentials(organizationId, "gohighlevel");
  if (!creds || !creds["location_id"]) return null;
  return creds["location_id"] as string;
}

export { ghlApi, GHL_API_BASE, normalizeGHLError, GHL_SCOPES };
