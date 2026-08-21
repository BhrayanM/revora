import "server-only";

import {
  parseMakeCredentials,
  sendMakeEvent,
} from "@/lib/integrations/adapters/make";
import {
  parseN8nCredentials,
  sendN8nEvent,
} from "@/lib/integrations/adapters/n8n";
import {
  parseZapierCredentials,
  sendZapierEvent,
} from "@/lib/integrations/adapters/zapier";
import type {
  AutomationWebhookEvent,
  AutomationWebhookProviderId,
} from "@/lib/integrations/types";
import type { SafeWebhookDeliveryResult } from "@/lib/integrations/webhook-transport";

export function normalizeAutomationWebhookCredentials(
  provider: AutomationWebhookProviderId,
  credentials: Record<string, unknown>,
): Record<string, string> {
  if (provider === "n8n") return { ...parseN8nCredentials(credentials) };
  if (provider === "zapier") return { ...parseZapierCredentials(credentials) };
  return { ...parseMakeCredentials(credentials) };
}

export async function sendAutomationWebhookEvent(params: {
  provider: AutomationWebhookProviderId;
  credentials: Record<string, unknown>;
  event: AutomationWebhookEvent;
}): Promise<SafeWebhookDeliveryResult> {
  if (params.provider === "n8n") {
    return sendN8nEvent(parseN8nCredentials(params.credentials), params.event);
  }

  if (params.provider === "zapier") {
    return sendZapierEvent(
      parseZapierCredentials(params.credentials),
      params.event,
    );
  }

  return sendMakeEvent(parseMakeCredentials(params.credentials), params.event);
}
