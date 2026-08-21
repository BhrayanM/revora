import "server-only";

import type { AutomationWebhookEvent } from "@/lib/integrations/types";
import {
  deliverAutomationWebhook,
  type SafeWebhookDeliveryResult,
} from "@/lib/integrations/webhook-transport";

export interface N8nCredentials {
  webhook_url: string;
  webhook_secret: string;
}

export function parseN8nCredentials(
  value: Record<string, unknown>,
): N8nCredentials {
  const webhookUrl =
    typeof value.webhook_url === "string" ? value.webhook_url.trim() : "";
  const webhookSecret =
    typeof value.webhook_secret === "string" ? value.webhook_secret.trim() : "";

  if (!webhookUrl) throw new Error("Webhook URL is required.");
  if (webhookSecret.length < 16) {
    throw new Error("Webhook secret must be at least 16 characters.");
  }

  return { webhook_url: webhookUrl, webhook_secret: webhookSecret };
}

export async function sendN8nEvent(
  credentials: N8nCredentials,
  event: AutomationWebhookEvent,
): Promise<SafeWebhookDeliveryResult> {
  return deliverAutomationWebhook({
    provider: "n8n",
    url: credentials.webhook_url,
    event,
    authHeaders: {
      "X-Revora-Webhook-Secret": credentials.webhook_secret,
    },
  });
}
