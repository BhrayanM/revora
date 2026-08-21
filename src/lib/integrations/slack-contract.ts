import "server-only";

import type { IntegrationErrorCategory } from "@/lib/integrations/types";

export interface SlackOAuthGrant {
  accessToken: string;
  scope: string[];
  teamId: string;
  teamName: string;
  channelId: string;
  channelName: string;
  webhookUrl: string;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isSlackWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://hooks.slack.com" &&
      url.pathname.startsWith("/services/") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function buildSlackAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: "incoming-webhook",
    state: input.state,
  }).toString();
  return url.toString();
}

export function parseSlackOAuthPayload(payload: unknown): SlackOAuthGrant {
  if (!payload || typeof payload !== "object") {
    throw new Error("Slack returned an unexpected response.");
  }

  const data = payload as Record<string, unknown>;
  if (data["ok"] !== true) {
    throw new Error("Slack authorization failed. Please try again.");
  }

  const team = data["team"] as Record<string, unknown> | undefined;
  const webhook = data["incoming_webhook"] as
    Record<string, unknown> | undefined;
  const accessToken = asNonEmptyString(data["access_token"]);
  const teamId = asNonEmptyString(team?.["id"]);
  const teamName = asNonEmptyString(team?.["name"]);
  const channelId = asNonEmptyString(webhook?.["channel_id"]);
  const channel = asNonEmptyString(webhook?.["channel"]);
  const webhookUrl = asNonEmptyString(webhook?.["url"]);

  if (
    !accessToken ||
    !teamId ||
    !teamName ||
    !channelId ||
    !channel ||
    !webhookUrl ||
    !isSlackWebhookUrl(webhookUrl)
  ) {
    throw new Error("Slack returned an unexpected response.");
  }

  const scope = (asNonEmptyString(data["scope"]) ?? "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (!scope.includes("incoming-webhook")) {
    throw new Error("Slack returned an unexpected response.");
  }

  return {
    accessToken,
    scope,
    teamId,
    teamName,
    channelId,
    channelName: channel.replace(/^#/, ""),
    webhookUrl,
  };
}

export function normalizeSlackError(
  status: number,
  slackError?: string,
): IntegrationErrorCategory {
  if (
    status === 401 ||
    [
      "not_authed",
      "invalid_auth",
      "token_revoked",
      "account_inactive",
    ].includes(slackError ?? "")
  ) {
    return "INVALID_CREDENTIALS";
  }
  if (status === 429 || slackError === "rate_limited") return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  if (["missing_scope", "not_allowed_token_type"].includes(slackError ?? "")) {
    return "CONFIGURATION_ERROR";
  }
  return "INVALID_RESPONSE";
}
