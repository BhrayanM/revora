import "server-only";

import { createHmac } from "crypto";

import {
  startExecution,
  completeExecution,
  computeRetryDelay,
} from "@/lib/automation/executions";
import type { LeadCreatedEvent, LeadUpdatedEvent } from "@/lib/webhooks/types";

function getWebhookConfig() {
  return {
    url: process.env.N8N_WEBHOOK_URL,
    secret: process.env.N8N_WEBHOOK_SECRET,
  };
}

async function deliverWebhook(
  url: string,
  payload: LeadCreatedEvent | LeadUpdatedEvent,
  secret?: string,
): Promise<boolean> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Event-Type": payload.event,
    "X-Event-Id": payload.event_id,
  };

  if (secret) {
    headers["X-Signature"] = createHmac("sha256", secret)
      .update(body)
      .digest("hex");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    return res.ok;
  } catch (err) {
    console.error(
      "[Webhook] Delivery failed:",
      payload.event,
      payload.event_id,
      err instanceof Error ? err.message : "Unknown",
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function emitLeadEventReliable(
  event: LeadCreatedEvent | LeadUpdatedEvent,
  organizationId: string,
  leadId?: string,
): Promise<void> {
  const config = getWebhookConfig();
  if (!config.url) return;

  const execution = await startExecution({
    organizationId,
    eventType: event.event,
    eventId: event.event_id,
    leadId,
    provider: "n8n",
    action: "webhook_delivery",
  });

  if (!execution) {
    return;
  }

  const ok = await deliverWebhook(config.url, event, config.secret);

  if (ok) {
    await completeExecution(execution.id, "success");
  } else {
    const retryDelay = computeRetryDelay(execution.attempts);
    const supabase = await (
      await import("@/lib/supabase/server")
    ).createServiceClient();

    await supabase
      .from("automation_executions")
      .update({
        status: "failed",
        attempts: execution.attempts + 1,
        error_message: "Webhook delivery failed",
        next_retry_at: new Date(Date.now() + retryDelay).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", execution.id);
  }
}
