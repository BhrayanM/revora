import "server-only";

import {
  disconnectGoogleWorkspaceConnections,
  getActiveGoogleWorkspaceConnection,
  getGoogleWorkspaceConnectionForDisconnect,
  markGoogleWorkspaceError,
  markGoogleWorkspaceHealthy,
  saveGoogleWorkspaceConnections,
  updateGoogleWorkspaceTokens,
  type ActiveGoogleWorkspaceConnection,
} from "@/lib/integrations/connections";
import {
  GOOGLE_WORKSPACE_SCOPES,
  buildGoogleCalendarEventRequest,
  buildGoogleRawEmail,
  buildGoogleWorkspaceAuthorizationUrl,
  normalizeGoogleCalendarAppointment,
  normalizeGoogleEmailInput,
  normalizeGoogleError,
  parseGoogleCalendarEventResponse,
  parseGoogleTokenPayload,
  parseGoogleUserInfo,
  parseGmailSendResponse,
  type GoogleCalendarAppointmentInput,
  type GoogleEmailInput,
  type GoogleIdentity,
  type NormalizedGoogleCalendarAppointment,
  type NormalizedGoogleEmailInput,
  type GoogleTokenGrant,
} from "@/lib/integrations/google-workspace-contract";
import {
  generateOAuthState,
  recordAuditEvent,
  validateOAuthState,
} from "@/lib/integrations/oauth";
import { getSafeIntegrationError } from "@/lib/integrations/types";
import type { IntegrationErrorCategory } from "@/lib/integrations/types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const TOKEN_REFRESH_SKEW_MS = 60_000;

export interface GoogleWorkspaceOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

type FetchImplementation = typeof fetch;
type GoogleProviderFailure = {
  ok: false;
  errorCode: IntegrationErrorCategory;
  status: number | null;
};

type GoogleResponse = {
  status: number;
  data: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getGoogleWorkspaceConfig(): GoogleWorkspaceOAuthConfig {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_WORKSPACE_REDIRECT_URI?.trim();
  if (
    !clientId ||
    clientId.length > 512 ||
    !clientSecret ||
    clientSecret.length > 4096 ||
    !redirectUri ||
    redirectUri.length > 2048
  ) {
    throw new Error("Google Workspace OAuth is not configured.");
  }

  let redirect: URL;
  try {
    redirect = new URL(redirectUri);
  } catch {
    throw new Error("Google Workspace OAuth is not configured.");
  }
  const localHttp =
    redirect.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(redirect.hostname);
  if (
    (redirect.protocol !== "https:" && !localHttp) ||
    redirect.username ||
    redirect.password ||
    redirect.search ||
    redirect.hash ||
    redirect.pathname !== "/api/integrations/google-workspace/callback"
  ) {
    throw new Error("Google Workspace OAuth is not configured.");
  }
  return { clientId, clientSecret, redirectUri: redirect.toString() };
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Google response exceeded the allowed size.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Google response exceeded the allowed size.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    "utf8",
  );
}

async function requestGoogle(
  url: string,
  options: RequestInit,
  fetchImplementation: FetchImplementation = fetch,
): Promise<GoogleResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImplementation(url, {
      ...options,
      redirect: "error",
      signal: controller.signal,
    });
    const text = await readBoundedText(response);
    let data: Record<string, unknown> | null = null;
    if (text) {
      try {
        const parsed: unknown = JSON.parse(text);
        data = isRecord(parsed) ? parsed : null;
      } catch {
        data = null;
      }
    }
    return { status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function providerError(
  data: Record<string, unknown> | null,
): string | undefined {
  const error = data?.["error"];
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error["status"] === "string") {
    return error["status"].toLowerCase();
  }
  return undefined;
}

function responseFailure(
  response: GoogleResponse,
  refreshContext = false,
): GoogleProviderFailure {
  return {
    ok: false,
    errorCode: normalizeGoogleError(
      response.status,
      providerError(response.data),
      refreshContext,
    ),
    status: response.status,
  };
}

function networkFailure(): GoogleProviderFailure {
  return { ok: false, errorCode: "NETWORK_ERROR", status: null };
}

export async function exchangeGoogleAuthorizationCode(
  config: GoogleWorkspaceOAuthConfig,
  code: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<{ ok: true; grant: GoogleTokenGrant } | GoogleProviderFailure> {
  try {
    const response = await requestGoogle(
      GOOGLE_TOKEN_URL,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: config.redirectUri,
        }).toString(),
      },
      fetchImplementation,
    );
    if (response.status < 200 || response.status >= 300) {
      return responseFailure(response);
    }
    try {
      return {
        ok: true,
        grant: parseGoogleTokenPayload(response.data, {
          requireRefreshToken: true,
        }),
      };
    } catch {
      return {
        ok: false,
        errorCode: "INVALID_RESPONSE",
        status: response.status,
      };
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("exceeded the allowed size")
    ) {
      return { ok: false, errorCode: "INVALID_RESPONSE", status: 200 };
    }
    return networkFailure();
  }
}

export async function refreshGoogleAccessToken(
  config: GoogleWorkspaceOAuthConfig,
  refreshToken: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<{ ok: true; grant: GoogleTokenGrant } | GoogleProviderFailure> {
  try {
    const response = await requestGoogle(
      GOOGLE_TOKEN_URL,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      },
      fetchImplementation,
    );
    if (response.status < 200 || response.status >= 300) {
      return responseFailure(response, true);
    }
    try {
      return {
        ok: true,
        grant: parseGoogleTokenPayload(response.data, {
          currentRefreshToken: refreshToken,
          currentScopes: [...GOOGLE_WORKSPACE_SCOPES],
        }),
      };
    } catch {
      return {
        ok: false,
        errorCode: "INVALID_RESPONSE",
        status: response.status,
      };
    }
  } catch {
    return networkFailure();
  }
}

export async function fetchGoogleUserIdentity(
  accessToken: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<{ ok: true; identity: GoogleIdentity } | GoogleProviderFailure> {
  try {
    const response = await requestGoogle(
      GOOGLE_USERINFO_URL,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
      fetchImplementation,
    );
    if (response.status < 200 || response.status >= 300) {
      return responseFailure(response);
    }
    try {
      return { ok: true, identity: parseGoogleUserInfo(response.data) };
    } catch {
      return {
        ok: false,
        errorCode: "INVALID_RESPONSE",
        status: response.status,
      };
    }
  } catch {
    return networkFailure();
  }
}

export async function verifyGoogleCalendarReadOnly(
  accessToken: string,
  now = new Date(),
  fetchImplementation: FetchImplementation = fetch,
): Promise<{ ok: true } | GoogleProviderFailure> {
  const url = new URL(GOOGLE_CALENDAR_EVENTS_URL);
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("timeMin", now.toISOString());
  try {
    const response = await requestGoogle(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
      fetchImplementation,
    );
    if (response.status < 200 || response.status >= 300) {
      return responseFailure(response);
    }
    if (
      response.data?.["kind"] !== "calendar#events" ||
      !Array.isArray(response.data["items"])
    ) {
      return {
        ok: false,
        errorCode: "INVALID_RESPONSE",
        status: response.status,
      };
    }
    return { ok: true };
  } catch {
    return networkFailure();
  }
}

export async function revokeGoogleGrant(
  token: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<{ ok: true } | GoogleProviderFailure> {
  try {
    const response = await requestGoogle(
      GOOGLE_REVOKE_URL,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token }).toString(),
      },
      fetchImplementation,
    );
    if (response.status < 200 || response.status >= 300) {
      return responseFailure(response);
    }
    return { ok: true };
  } catch {
    return networkFailure();
  }
}

export async function createGoogleCalendarAppointmentWithAccessToken(
  accessToken: string,
  appointment: NormalizedGoogleCalendarAppointment,
  fetchImplementation: FetchImplementation = fetch,
): Promise<
  | {
      ok: true;
      eventId: string;
      durationMinutes: number;
      hasAttendee: boolean;
    }
  | GoogleProviderFailure
> {
  const request = buildGoogleCalendarEventRequest(appointment);
  try {
    const response = await requestGoogle(
      request.url,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body),
      },
      fetchImplementation,
    );
    if (response.status < 200 || response.status >= 300) {
      return responseFailure(response);
    }
    try {
      const event = parseGoogleCalendarEventResponse(response.data);
      return {
        ok: true,
        eventId: event.eventId,
        durationMinutes: appointment.durationMinutes,
        hasAttendee: Boolean(appointment.attendee),
      };
    } catch {
      return {
        ok: false,
        errorCode: "INVALID_RESPONSE",
        status: response.status,
      };
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("exceeded the allowed size")
    ) {
      return { ok: false, errorCode: "INVALID_RESPONSE", status: 200 };
    }
    return networkFailure();
  }
}

export async function sendGoogleWorkspaceEmailWithAccessToken(
  accessToken: string,
  email: NormalizedGoogleEmailInput,
  fetchImplementation: FetchImplementation = fetch,
): Promise<{ ok: true; messageId: string } | GoogleProviderFailure> {
  const raw = buildGoogleRawEmail(email);
  try {
    const response = await requestGoogle(
      GMAIL_SEND_URL,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
      fetchImplementation,
    );
    if (response.status < 200 || response.status >= 300) {
      return responseFailure(response);
    }
    try {
      const message = parseGmailSendResponse(response.data);
      return { ok: true, messageId: message.messageId };
    } catch {
      return {
        ok: false,
        errorCode: "INVALID_RESPONSE",
        status: response.status,
      };
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("exceeded the allowed size")
    ) {
      return { ok: false, errorCode: "INVALID_RESPONSE", status: 200 };
    }
    return networkFailure();
  }
}

async function recordBundleAudit(
  organizationId: string,
  eventType: string,
  profileId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await Promise.all(
    (["google-calendar", "gmail"] as const).map((provider) =>
      recordAuditEvent(
        organizationId,
        provider,
        eventType,
        profileId,
        metadata,
      ),
    ),
  );
}

export async function getGoogleWorkspaceAuthorizationUrl(
  organizationId: string,
  returnPath: string,
  userId?: string,
): Promise<{ url: string; state: string }> {
  const config = getGoogleWorkspaceConfig();
  const { state } = await generateOAuthState(
    organizationId,
    "google-calendar",
    returnPath,
    userId,
  );
  return {
    url: buildGoogleWorkspaceAuthorizationUrl({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state,
    }),
    state,
  };
}

export async function handleGoogleWorkspaceCallback(
  code: string,
  rawState: string,
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null }> {
  const validated = await validateOAuthState(
    rawState,
    "google-calendar",
    organizationId,
  );
  if (!validated.valid) {
    return { error: validated.error ?? "Invalid OAuth state" };
  }

  try {
    const config = getGoogleWorkspaceConfig();
    const exchange = await exchangeGoogleAuthorizationCode(config, code);
    if (!exchange.ok) {
      await recordBundleAudit(organizationId, "connection_failed", profileId, {
        error_code: exchange.errorCode,
        http_status: exchange.status,
      });
      return { error: "Google authorization failed. Please try again." };
    }

    const identity = await fetchGoogleUserIdentity(exchange.grant.accessToken);
    if (!identity.ok) {
      await recordBundleAudit(organizationId, "connection_failed", profileId, {
        error_code: identity.errorCode,
        http_status: identity.status,
      });
      return { error: "Google identity could not be verified." };
    }

    const tokenExpiresAt = new Date(
      Date.now() + exchange.grant.expiresInSeconds * 1000,
    ).toISOString();
    const saved = await saveGoogleWorkspaceConnections({
      organizationId,
      accessToken: exchange.grant.accessToken,
      refreshToken: exchange.grant.refreshToken,
      subject: identity.identity.subject,
      email: identity.identity.email,
      scopes: exchange.grant.scopes,
      tokenExpiresAt,
      userId: profileId,
    });
    if (saved.error) {
      await revokeGoogleGrant(exchange.grant.refreshToken);
      await recordBundleAudit(organizationId, "connection_failed", profileId, {
        error_code: "PERSISTENCE_ERROR",
      });
      return { error: "Google Workspace connection could not be saved." };
    }

    await recordBundleAudit(organizationId, "connected", profileId);
    return { error: null };
  } catch {
    await recordBundleAudit(organizationId, "connection_failed", profileId, {
      error_code: "NETWORK_ERROR",
    });
    return { error: "Google Workspace connection failed. Please try again." };
  }
}

async function getValidGoogleWorkspaceAccessToken(
  organizationId: string,
): Promise<
  | {
      ok: true;
      accessToken: string;
      connection: ActiveGoogleWorkspaceConnection;
    }
  | { ok: false; errorCode: IntegrationErrorCategory }
> {
  const connection =
    await getGoogleWorkspaceConnectionForDisconnect(organizationId);
  if (!connection) {
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }
  if (
    new Date(connection.tokenExpiresAt).getTime() >
    Date.now() + TOKEN_REFRESH_SKEW_MS
  ) {
    return { ok: true, accessToken: connection.accessToken, connection };
  }

  let config: GoogleWorkspaceOAuthConfig;
  try {
    config = getGoogleWorkspaceConfig();
  } catch {
    await markGoogleWorkspaceError(organizationId, "CONFIGURATION_ERROR");
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }
  const refreshed = await refreshGoogleAccessToken(
    config,
    connection.refreshToken,
  );
  if (!refreshed.ok) {
    await markGoogleWorkspaceError(organizationId, refreshed.errorCode);
    await recordBundleAudit(organizationId, "token_refresh_failed", undefined, {
      error_code: refreshed.errorCode,
      http_status: refreshed.status,
    });
    return { ok: false, errorCode: refreshed.errorCode };
  }

  const tokenExpiresAt = new Date(
    Date.now() + refreshed.grant.expiresInSeconds * 1000,
  ).toISOString();
  const updated = await updateGoogleWorkspaceTokens({
    organizationId,
    accessToken: refreshed.grant.accessToken,
    refreshToken: refreshed.grant.refreshToken,
    tokenExpiresAt,
  });
  if (updated.error) {
    await markGoogleWorkspaceError(organizationId, "CONFIGURATION_ERROR");
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }
  await recordBundleAudit(organizationId, "token_refreshed");
  return {
    ok: true,
    accessToken: refreshed.grant.accessToken,
    connection: {
      ...connection,
      accessToken: refreshed.grant.accessToken,
      refreshToken: refreshed.grant.refreshToken,
      tokenExpiresAt,
    },
  };
}

async function verifyStoredGoogleIdentity(
  accessToken: string,
  connection: ActiveGoogleWorkspaceConnection,
): Promise<{ ok: true } | GoogleProviderFailure> {
  const result = await fetchGoogleUserIdentity(accessToken);
  if (!result.ok) return result;
  if (
    result.identity.subject !== connection.subject ||
    result.identity.email !== connection.email
  ) {
    return { ok: false, errorCode: "INVALID_RESPONSE", status: 200 };
  }
  return { ok: true };
}

async function failGoogleWorkspaceTest(
  organizationId: string,
  errorCode: IntegrationErrorCategory,
): Promise<{ success: false; error: string }> {
  await markGoogleWorkspaceError(organizationId, errorCode);
  return {
    success: false,
    error: getSafeIntegrationError(errorCode).userMessage,
  };
}

export async function testGoogleCalendarConnection(
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  const token = await getValidGoogleWorkspaceAccessToken(organizationId);
  if (!token.ok) {
    return failGoogleWorkspaceTest(organizationId, token.errorCode);
  }
  const identity = await verifyStoredGoogleIdentity(
    token.accessToken,
    token.connection,
  );
  if (!identity.ok) {
    return failGoogleWorkspaceTest(organizationId, identity.errorCode);
  }
  const calendar = await verifyGoogleCalendarReadOnly(token.accessToken);
  if (!calendar.ok) {
    return failGoogleWorkspaceTest(organizationId, calendar.errorCode);
  }
  await markGoogleWorkspaceHealthy(organizationId);
  return { success: true };
}

export async function testGmailConnection(
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  const token = await getValidGoogleWorkspaceAccessToken(organizationId);
  if (!token.ok) {
    return failGoogleWorkspaceTest(organizationId, token.errorCode);
  }
  const identity = await verifyStoredGoogleIdentity(
    token.accessToken,
    token.connection,
  );
  if (!identity.ok) {
    return failGoogleWorkspaceTest(organizationId, identity.errorCode);
  }
  await markGoogleWorkspaceHealthy(organizationId);
  return { success: true };
}

export async function createGoogleCalendarAppointment(
  organizationId: string,
  input: GoogleCalendarAppointmentInput,
  profileId?: string,
): Promise<
  { success: true; eventId: string } | { success: false; error: string }
> {
  let appointment: NormalizedGoogleCalendarAppointment;
  try {
    appointment = normalizeGoogleCalendarAppointment(input);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Appointment is invalid.",
    };
  }

  const token = await getValidGoogleWorkspaceAccessToken(organizationId);
  if (!token.ok) {
    return failGoogleWorkspaceTest(organizationId, token.errorCode);
  }
  const result = await createGoogleCalendarAppointmentWithAccessToken(
    token.accessToken,
    appointment,
  );
  if (!result.ok) {
    await markGoogleWorkspaceError(organizationId, result.errorCode);
    return {
      success: false,
      error: getSafeIntegrationError(result.errorCode).userMessage,
    };
  }
  await markGoogleWorkspaceHealthy(organizationId);
  await recordAuditEvent(
    organizationId,
    "google-calendar",
    "calendar_event_created",
    profileId,
    {
      event_id: result.eventId,
      attendee_present: result.hasAttendee,
      duration_minutes: result.durationMinutes,
    },
  );
  return { success: true, eventId: result.eventId };
}

export async function sendGoogleWorkspaceEmail(
  organizationId: string,
  input: GoogleEmailInput,
  profileId?: string,
): Promise<
  { success: true; messageId: string } | { success: false; error: string }
> {
  let email: NormalizedGoogleEmailInput;
  try {
    email = normalizeGoogleEmailInput(input);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email is invalid.",
    };
  }

  const token = await getValidGoogleWorkspaceAccessToken(organizationId);
  if (!token.ok) {
    return failGoogleWorkspaceTest(organizationId, token.errorCode);
  }
  const result = await sendGoogleWorkspaceEmailWithAccessToken(
    token.accessToken,
    email,
  );
  if (!result.ok) {
    await markGoogleWorkspaceError(organizationId, result.errorCode);
    return {
      success: false,
      error: getSafeIntegrationError(result.errorCode).userMessage,
    };
  }
  await markGoogleWorkspaceHealthy(organizationId);
  await recordAuditEvent(
    organizationId,
    "gmail",
    "gmail_message_sent",
    profileId,
    { message_id: result.messageId, recipient_count: 1 },
  );
  return { success: true, messageId: result.messageId };
}

export async function disconnectGoogleWorkspace(
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null; warning?: string }> {
  const connection = await getActiveGoogleWorkspaceConnection(organizationId);
  const remoteCleanup = connection
    ? await revokeGoogleGrant(connection.refreshToken)
    : null;
  const disconnected =
    await disconnectGoogleWorkspaceConnections(organizationId);
  if (disconnected.error) {
    return { error: "Google Workspace could not be disconnected locally." };
  }
  const cleanupStatus =
    remoteCleanup === null
      ? "not_available"
      : remoteCleanup.ok
        ? "succeeded"
        : "failed";
  await recordBundleAudit(organizationId, "disconnected", profileId, {
    remote_cleanup: cleanupStatus,
  });
  return {
    error: null,
    ...(!remoteCleanup || remoteCleanup.ok
      ? {}
      : {
          warning:
            "Google Workspace was disconnected; remote revocation could not be verified.",
        }),
  };
}
