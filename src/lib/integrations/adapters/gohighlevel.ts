import "server-only";

import {
  getConnection,
  getDecryptedCredentials,
  markConnectionError,
  markConnectionHealthy,
} from "@/lib/integrations/connections";
import { encryptCredentialsObject } from "@/lib/integrations/encryption";
import {
  generateOAuthState,
  recordAuditEvent,
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

interface NormalizedGHLTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  locationId: string | null;
  companyId: string | null;
}

function normalizeGHLTokenResponse(
  body: unknown,
): NormalizedGHLTokenResponse | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const data = body as Record<string, unknown>;
  const accessToken = data.accessToken ?? data.access_token;
  const refreshToken = data.refreshToken ?? data.refresh_token;
  const expiresIn = data.expiresIn ?? data.expires_in;
  const locationId = data.locationId ?? data.location_id;
  const companyId = data.companyId ?? data.company_id;

  if (
    typeof accessToken !== "string" ||
    (refreshToken !== undefined && typeof refreshToken !== "string") ||
    typeof expiresIn !== "number" ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0 ||
    (locationId !== undefined && typeof locationId !== "string") ||
    (companyId !== undefined && typeof companyId !== "string")
  ) {
    return null;
  }

  return {
    accessToken,
    refreshToken: refreshToken ?? null,
    expiresIn,
    locationId: locationId ?? null,
    companyId: companyId ?? null,
  };
}

function getGHLConfig() {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;
  const appVersionId = process.env.GHL_APP_VERSION_ID;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GoHighLevel OAuth is not configured. Set GHL_CLIENT_ID, GHL_CLIENT_SECRET, and GHL_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri, appVersionId };
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
  const { clientId, redirectUri, appVersionId } = getGHLConfig();
  const { state } = await generateOAuthState(
    organizationId,
    "gohighlevel",
    returnPath,
    userId,
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GHL_SCOPES.join(" "),
    state,
    response_type: "code",
  });

  // HighLevel can infer a live app version from client_id. Draft Marketplace
  // versions have no live version to infer, so their Test Link version ID must
  // be supplied explicitly to the authorization endpoint.
  if (appVersionId) {
    params.set("version_id", appVersionId);
  }

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

  const { clientId, clientSecret, redirectUri } = getGHLConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const formBody = new URLSearchParams({
      clientId,
      clientSecret,
      grantType: "authorization_code",
      code,
      redirectUri,
    });

    const res = await fetch(GHL_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Version: "v3",
      },
      body: formBody.toString(),
      signal: controller.signal,
    });

    const responseText = await res.text();
    let responseBody: unknown = responseText;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      /* HighLevel normally returns JSON; retain a safe generic error below. */
    }

    if (!res.ok) {
      const providerError = getSafeGHLProviderError(responseBody, [
        code,
        clientId,
        clientSecret,
      ]);
      await recordAuditEvent(
        organizationId,
        "gohighlevel",
        "connection_failed",
        profileId,
        {
          step: "token_exchange",
          http_status: res.status,
          provider_error: providerError.error,
          provider_message: providerError.message,
        },
      );
      return { error: "GoHighLevel authorization failed. Please try again." };
    }

    const data = normalizeGHLTokenResponse(responseBody);
    if (!data?.refreshToken || !data.locationId) {
      const responseFieldNames =
        responseBody &&
        typeof responseBody === "object" &&
        !Array.isArray(responseBody)
          ? Object.keys(responseBody).sort()
          : [];
      await recordAuditEvent(
        organizationId,
        "gohighlevel",
        "connection_failed",
        profileId,
        {
          step: "token_response_validation",
          http_status: res.status,
          response_field_names: responseFieldNames,
        },
      );
      return { error: "GoHighLevel returned an invalid token response." };
    }

    const rawCreds: Record<string, string> = {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      location_id: data.locationId,
    };

    if (data.companyId) {
      rawCreds.company_id = data.companyId;
    }

    const credentials = encryptCredentialsObject(rawCreds);

    const tokenExpiresAt = new Date(
      Date.now() + data.expiresIn * 1000,
    ).toISOString();

    const supabase = (await import("@/lib/supabase/server"))
      .createServiceAdminClient;
    const client = await supabase();

    let locationName: string | null = null;
    try {
      const { data: locData } = await ghlApi(
        data.accessToken,
        `/locations/${data.locationId}`,
      );
      locationName =
        (locData as { location?: { name?: string } })?.location?.name ?? null;
    } catch {
      /* non-critical */
    }

    const { error: persistenceError } = await client
      .from("integrations")
      .upsert(
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

    if (persistenceError) {
      await recordAuditEvent(
        organizationId,
        "gohighlevel",
        "connection_failed",
        profileId,
        {
          step: "integration_persistence",
          database_error_code: persistenceError.code,
        },
      );
      return { error: "Failed to save the GoHighLevel connection." };
    }

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

  const { clientId, clientSecret, redirectUri } = getGHLConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(GHL_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Version: "v3",
      },
      body: new URLSearchParams({
        clientId,
        clientSecret,
        grantType: "refresh_token",
        refreshToken: creds["refresh_token"] as string,
        redirectUri,
      }).toString(),
      signal: controller.signal,
    });

    const responseText = await res.text();
    let responseBody: unknown = responseText;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      /* handled as an invalid response below */
    }

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

    const data = normalizeGHLTokenResponse(responseBody);
    if (!data) {
      return { error: "Token refresh returned an invalid response." };
    }

    const newCreds = encryptCredentialsObject({
      access_token: data.accessToken,
      location_id: creds["location_id"] as string,
      refresh_token: (data.refreshToken || creds["refresh_token"]) as string,
    });

    const tokenExpiresAt = new Date(
      Date.now() + data.expiresIn * 1000,
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
  if (!creds || !creds["access_token"] || !creds["location_id"]) {
    return { success: false, error: "Integration not configured" };
  }

  const locationId = creds["location_id"] as string;
  const { ok, status, data } = await ghlApi(
    creds["access_token"] as string,
    `/contacts/?limit=1&locationId=${encodeURIComponent(locationId)}`,
  );

  const hasExpectedResponse =
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Array.isArray((data as { contacts?: unknown }).contacts);

  if (ok && hasExpectedResponse) {
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

interface GHLErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  error_description?: string;
}

export function parseGHLErrorBody(body: unknown): GHLErrorBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as GHLErrorBody;
}

export function ghlSafeErrorMessage(status: number, body: unknown): string {
  const parsed = parseGHLErrorBody(body);
  const rawProviderMessage =
    parsed?.message ?? parsed?.error_description ?? parsed?.error;
  const providerMessage = Array.isArray(rawProviderMessage)
    ? rawProviderMessage.join("; ")
    : rawProviderMessage;

  if (status === 401) {
    return "GoHighLevel authentication failed. Please reconnect.";
  }
  if (status === 402) {
    return "GoHighLevel payment required. Please verify your account.";
  }
  if (status === 403) {
    return "GoHighLevel access denied. Please check your permissions.";
  }
  if (status === 404) {
    return "The requested GoHighLevel resource was not found.";
  }
  if (status === 422) {
    return `GoHighLevel rejected the request.${providerMessage ? ` (${providerMessage.substring(0, 200)})` : ""}`;
  }
  if (status === 429) {
    return "GoHighLevel rate limit reached. Please try again shortly.";
  }
  if (status >= 500) {
    return "GoHighLevel is temporarily unavailable. Please try again shortly.";
  }

  if (providerMessage) {
    return `GoHighLevel error: ${providerMessage.substring(0, 200)}`;
  }

  return "GoHighLevel request failed. Please try again.";
}

function getSafeGHLProviderError(
  body: unknown,
  sensitiveValues: string[],
): { error: string | null; message: string | null } {
  const parsed = parseGHLErrorBody(body);

  const sanitize = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    let safe = Array.isArray(value) ? value.join("; ") : value;
    for (const sensitive of sensitiveValues) {
      if (sensitive) safe = safe.replaceAll(sensitive, "[REDACTED]");
    }
    return safe.slice(0, 300);
  };

  return {
    error: sanitize(parsed?.error),
    message: sanitize(parsed?.message ?? parsed?.error_description),
  };
}

export async function ensureGHLToken(orgId: string): Promise<{
  accessToken: string | null;
  locationId: string | null;
  error: string | null;
}> {
  const accessToken = await getGHLAccessToken(orgId);
  if (!accessToken) {
    return {
      accessToken: null,
      locationId: null,
      error: "GoHighLevel is not connected.",
    };
  }

  const locationId = await getGHLLocationId(orgId);
  if (!locationId) {
    return {
      accessToken: null,
      locationId: null,
      error: "GoHighLevel location not configured.",
    };
  }

  const connection = await getConnection(orgId, "gohighlevel");
  if (!connection?.tokenExpiresAt) {
    return { accessToken, locationId, error: null };
  }

  const expiresAt = new Date(connection.tokenExpiresAt);
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() + bufferMs >= expiresAt.getTime()) {
    const refresh = await refreshGHLToken(orgId);
    if (refresh.error) {
      await markConnectionError(orgId, "gohighlevel", "REFRESH_FAILED");
      return {
        accessToken: null,
        locationId: null,
        error: "GoHighLevel session expired. Please reconnect.",
      };
    }
    const newToken = await getGHLAccessToken(orgId);
    const newLocationId = await getGHLLocationId(orgId);
    if (!newToken || !newLocationId) {
      return {
        accessToken: null,
        locationId: null,
        error: "GoHighLevel token refresh failed.",
      };
    }
    return { accessToken: newToken, locationId: newLocationId, error: null };
  }

  return { accessToken, locationId, error: null };
}

export { ghlApi, GHL_API_BASE, normalizeGHLError, GHL_SCOPES };
