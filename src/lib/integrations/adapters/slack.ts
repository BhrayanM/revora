import "server-only";

import {
  disconnectConnection,
  getDecryptedCredentials,
  markConnectionError,
  markConnectionHealthy,
  saveConnection,
} from "@/lib/integrations/connections";
import {
  generateOAuthState,
  recordAuditEvent,
  validateOAuthState,
} from "@/lib/integrations/oauth";
import {
  buildSlackAuthorizationUrl,
  normalizeSlackError,
  parseSlackOAuthPayload,
} from "@/lib/integrations/slack-contract";
import { getSafeIntegrationError } from "@/lib/integrations/types";
import type { IntegrationErrorCategory } from "@/lib/integrations/types";

const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_AUTH_TEST_URL = "https://slack.com/api/auth.test";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

function getSlackConfig() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Slack OAuth is not configured.");
  }

  return { clientId, clientSecret, redirectUri };
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Slack response exceeded the allowed size.");
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
      throw new Error("Slack response exceeded the allowed size.");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    "utf8",
  );
}

async function requestSlack(
  url: string,
  options: RequestInit,
): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      redirect: "error",
      signal: controller.signal,
    });
    const body = await readBoundedText(response);
    let data: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === "object") {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      data = null;
    }
    return { status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function slackErrorFromResponse(
  status: number,
  data: Record<string, unknown> | null,
): IntegrationErrorCategory {
  const providerError =
    typeof data?.["error"] === "string" ? data["error"] : undefined;
  return normalizeSlackError(status, providerError);
}

async function verifySlackToken(accessToken: string, expectedTeamId?: string) {
  const response = await requestSlack(SLACK_AUTH_TEST_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const teamId =
    typeof response.data?.["team_id"] === "string"
      ? response.data["team_id"]
      : null;
  const ok =
    response.status >= 200 &&
    response.status < 300 &&
    response.data?.["ok"] === true &&
    (!expectedTeamId || teamId === expectedTeamId);

  return {
    ok,
    status: response.status,
    errorCode: ok
      ? null
      : slackErrorFromResponse(response.status, response.data),
  };
}

export async function sendSlackWebhookMessage(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<{
  ok: boolean;
  status: number | null;
  errorCode: IntegrationErrorCategory | null;
}> {
  let url: URL;
  try {
    url = new URL(webhookUrl);
  } catch {
    return { ok: false, status: null, errorCode: "CONFIGURATION_ERROR" };
  }

  if (
    url.origin !== "https://hooks.slack.com" ||
    !url.pathname.startsWith("/services/") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return { ok: false, status: null, errorCode: "CONFIGURATION_ERROR" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "error",
      signal: controller.signal,
    });
    await readBoundedText(response);
    return {
      ok: response.ok,
      status: response.status,
      errorCode: response.ok ? null : normalizeSlackError(response.status),
    };
  } catch {
    return { ok: false, status: null, errorCode: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSlackAuthorizationUrl(
  organizationId: string,
  returnPath: string,
  userId?: string,
): Promise<{ url: string; state: string }> {
  const { clientId, redirectUri } = getSlackConfig();
  const { state } = await generateOAuthState(
    organizationId,
    "slack",
    returnPath,
    userId,
  );

  return {
    url: buildSlackAuthorizationUrl({ clientId, redirectUri, state }),
    state,
  };
}

export async function handleSlackCallback(
  code: string,
  rawState: string,
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null }> {
  const validated = await validateOAuthState(rawState, "slack", organizationId);
  if (!validated.valid) {
    return { error: validated.error ?? "Invalid OAuth state" };
  }

  try {
    const { clientId, clientSecret, redirectUri } = getSlackConfig();
    const response = await requestSlack(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    let grant;
    try {
      grant = parseSlackOAuthPayload(response.data);
    } catch {
      const errorCode = slackErrorFromResponse(response.status, response.data);
      await recordAuditEvent(
        organizationId,
        "slack",
        "connection_failed",
        profileId,
        { error_code: errorCode, http_status: response.status },
      );
      return { error: "Slack authorization failed. Please try again." };
    }

    const verification = await verifySlackToken(
      grant.accessToken,
      grant.teamId,
    );
    if (!verification.ok) {
      await recordAuditEvent(
        organizationId,
        "slack",
        "connection_failed",
        profileId,
        {
          error_code: verification.errorCode,
          http_status: verification.status,
        },
      );
      return { error: "Slack authorization could not be verified." };
    }

    const saved = await saveConnection(
      organizationId,
      "slack",
      {
        access_token: grant.accessToken,
        webhook_url: grant.webhookUrl,
      },
      profileId,
      {
        config: {
          channel_id: grant.channelId,
          channel_name: grant.channelName,
        },
        externalAccountId: grant.teamId,
        externalAccountName: `${grant.teamName} · #${grant.channelName}`,
        healthStatus: "healthy",
        scopes: grant.scope,
      },
    );

    if (saved.error) {
      await recordAuditEvent(
        organizationId,
        "slack",
        "connection_failed",
        profileId,
        { error_code: "PERSISTENCE_ERROR" },
      );
      return { error: "Slack connection could not be saved." };
    }

    await recordAuditEvent(organizationId, "slack", "connected", profileId);
    return { error: null };
  } catch {
    await recordAuditEvent(
      organizationId,
      "slack",
      "connection_failed",
      profileId,
      { error_code: "NETWORK_ERROR" },
    );
    return { error: "Slack connection failed. Please try again." };
  }
}

export async function testSlackConnection(
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  const credentials = await getDecryptedCredentials(organizationId, "slack");
  const accessToken = credentials?.["access_token"];
  const webhookUrl = credentials?.["webhook_url"];
  if (typeof accessToken !== "string" || typeof webhookUrl !== "string") {
    return { success: false, error: "Integration not configured" };
  }

  try {
    const verification = await verifySlackToken(accessToken);
    if (!verification.ok) {
      const errorCode = verification.errorCode ?? "INVALID_RESPONSE";
      await markConnectionError(organizationId, "slack", errorCode);
      return {
        success: false,
        error: getSafeIntegrationError(errorCode).userMessage,
      };
    }

    const delivery = await sendSlackWebhookMessage(webhookUrl, {
      text: "Revora — Integration test",
    });
    if (!delivery.ok) {
      const errorCode = delivery.errorCode ?? "INVALID_RESPONSE";
      await markConnectionError(organizationId, "slack", errorCode);
      return {
        success: false,
        error: getSafeIntegrationError(errorCode).userMessage,
      };
    }

    await markConnectionHealthy(organizationId, "slack");
    return { success: true };
  } catch {
    await markConnectionError(organizationId, "slack", "NETWORK_ERROR");
    return {
      success: false,
      error: getSafeIntegrationError("NETWORK_ERROR").userMessage,
    };
  }
}

export async function disconnectSlack(
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null }> {
  const result = await disconnectConnection(organizationId, "slack");
  if (!result.error) {
    await recordAuditEvent(organizationId, "slack", "disconnected", profileId);
  }
  return result;
}
