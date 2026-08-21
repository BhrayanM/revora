import "server-only";

import type { AutomationWebhookEvent } from "@/lib/integrations/types";
import {
  deliverAutomationWebhook,
  type SafeWebhookDeliveryResult,
} from "@/lib/integrations/webhook-transport";

export interface ZapierCredentials {
  webhook_url: string;
}

export function parseZapierCredentials(
  value: Record<string, unknown>,
): ZapierCredentials {
  const webhookUrl =
    typeof value.webhook_url === "string" ? value.webhook_url.trim() : "";
  if (!webhookUrl) throw new Error("Catch Hook URL is required.");
  return { webhook_url: webhookUrl };
}

export async function sendZapierEvent(
  credentials: ZapierCredentials,
  event: AutomationWebhookEvent,
): Promise<SafeWebhookDeliveryResult> {
  return deliverAutomationWebhook({
    provider: "zapier",
    url: credentials.webhook_url,
    event,
  });
}
