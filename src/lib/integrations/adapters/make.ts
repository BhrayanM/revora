import "server-only";

import type { AutomationWebhookEvent } from "@/lib/integrations/types";
import {
  deliverAutomationWebhook,
  type SafeWebhookDeliveryResult,
} from "@/lib/integrations/webhook-transport";

export interface MakeCredentials {
  webhook_url: string;
  api_key: string;
}

export function parseMakeCredentials(
  value: Record<string, unknown>,
): MakeCredentials {
  const webhookUrl =
    typeof value.webhook_url === "string" ? value.webhook_url.trim() : "";
  const apiKey = typeof value.api_key === "string" ? value.api_key.trim() : "";

  if (!webhookUrl) throw new Error("Custom webhook URL is required.");
  if (apiKey.length < 8) throw new Error("Make API key is required.");

  return { webhook_url: webhookUrl, api_key: apiKey };
}

export async function sendMakeEvent(
  credentials: MakeCredentials,
  event: AutomationWebhookEvent,
): Promise<SafeWebhookDeliveryResult> {
  return deliverAutomationWebhook({
    provider: "make",
    url: credentials.webhook_url,
    event,
    authHeaders: { "x-make-apikey": credentials.api_key },
  });
}
