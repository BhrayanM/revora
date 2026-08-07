import "server-only";

import { createHmac } from "crypto";

import type { LeadCreatedEvent, LeadUpdatedEvent } from "@/lib/webhooks/types";

function getWebhookConfig() {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  return { url, secret };
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function postWebhook(
  url: string,
  payload: LeadCreatedEvent | LeadUpdatedEvent,
  secret?: string,
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Event-Type": payload.event,
    "X-Event-Id": payload.event_id,
  };

  if (secret) {
    headers["X-Signature"] = signPayload(body, secret);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err) {
    console.error(
      "[Webhook] Failed to deliver event",
      payload.event,
      payload.event_id,
      err instanceof Error ? err.message : "Unknown error",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function emitLeadEvent(
  event: LeadCreatedEvent | LeadUpdatedEvent,
): Promise<void> {
  const config = getWebhookConfig();

  if (!config.url) {
    return;
  }

  await postWebhook(config.url, event, config.secret);
}
