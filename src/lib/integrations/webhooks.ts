import "server-only";

import type { IntegrationProviderId } from "@/lib/integrations/types";
import { createServiceAdminClient } from "@/lib/supabase/server";

const WEBHOOK_CLAIM_LEASE_MS = 4 * 60 * 1000;

export type WebhookEventClaim =
  | { status: "claimed"; id: string; attemptCount: number }
  | { status: "duplicate"; id: string; leadId: string | null }
  | { status: "payload_conflict"; id: string }
  | { status: "in_progress"; id: string };

function repositoryError(operation: string, code?: string): Error {
  return new Error(`${operation} failed${code ? ` (${code})` : ""}.`);
}

export async function claimWebhookEvent(params: {
  organizationId: string;
  integrationId?: string;
  provider: IntegrationProviderId;
  externalEventId: string;
  eventType: string;
  payloadHash?: string;
  now?: Date;
}): Promise<WebhookEventClaim> {
  const supabase = await createServiceAdminClient();
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();
  const incomingPayloadHash = params.payloadHash ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from("integration_webhook_events")
    .insert({
      organization_id: params.organizationId,
      integration_id: params.integrationId ?? null,
      provider: params.provider,
      external_event_id: params.externalEventId,
      event_type: params.eventType,
      payload_hash: incomingPayloadHash,
      status: "received",
      attempt_count: 1,
      last_attempt_at: nowIso,
    })
    .select("id, attempt_count")
    .single();

  if (!insertError && inserted) {
    return {
      status: "claimed",
      id: inserted.id,
      attemptCount: inserted.attempt_count,
    };
  }
  if (!insertError || insertError.code !== "23505") {
    throw repositoryError("Webhook event claim", insertError?.code);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("integration_webhook_events")
    .select("id, status, payload_hash, lead_id, attempt_count, last_attempt_at")
    .eq("organization_id", params.organizationId)
    .eq("provider", params.provider)
    .eq("external_event_id", params.externalEventId)
    .maybeSingle();

  if (lookupError || !existing) {
    throw repositoryError("Webhook event replay lookup", lookupError?.code);
  }
  if (existing.payload_hash !== incomingPayloadHash) {
    return { status: "payload_conflict", id: existing.id };
  }
  if (
    existing.status === "processed" ||
    existing.status === "duplicate" ||
    existing.status === "ignored"
  ) {
    return {
      status: "duplicate",
      id: existing.id,
      leadId: existing.lead_id,
    };
  }

  const lastAttemptMs = Date.parse(existing.last_attempt_at);
  const claimIsStale =
    existing.status === "received" &&
    Number.isFinite(lastAttemptMs) &&
    lastAttemptMs <= now.getTime() - WEBHOOK_CLAIM_LEASE_MS;
  const mayRetry = existing.status === "failed" || claimIsStale;
  if (!mayRetry) {
    return { status: "in_progress", id: existing.id };
  }

  const nextAttemptCount = existing.attempt_count + 1;
  let retry = supabase
    .from("integration_webhook_events")
    .update({
      integration_id: params.integrationId ?? null,
      event_type: params.eventType,
      status: "received",
      error_code: null,
      processed_at: null,
      attempt_count: nextAttemptCount,
      last_attempt_at: nowIso,
    })
    .eq("id", existing.id)
    .eq("organization_id", params.organizationId)
    .eq("status", existing.status)
    .eq("attempt_count", existing.attempt_count)
    .eq("last_attempt_at", existing.last_attempt_at);

  if (claimIsStale) {
    retry = retry.lt(
      "last_attempt_at",
      new Date(now.getTime() - WEBHOOK_CLAIM_LEASE_MS).toISOString(),
    );
  }

  const { data: reclaimed, error: retryError } = await retry
    .select("id")
    .maybeSingle();
  if (retryError) {
    throw repositoryError("Webhook event retry", retryError.code);
  }
  if (!reclaimed) {
    return { status: "in_progress", id: existing.id };
  }

  return {
    status: "claimed",
    id: reclaimed.id,
    attemptCount: nextAttemptCount,
  };
}

export async function markWebhookProcessed(
  eventId: string,
  leadId: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  const { error } = await supabase
    .from("integration_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      lead_id: leadId,
      error_code: null,
    })
    .eq("id", eventId);

  if (error) {
    throw repositoryError("Webhook event completion", error.code);
  }
}

export async function markWebhookFailed(
  eventId: string,
  errorCode: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  const safeErrorCode = errorCode.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 100);
  const { error } = await supabase
    .from("integration_webhook_events")
    .update({
      status: "failed",
      error_code: safeErrorCode || "UNKNOWN_ERROR",
    })
    .eq("id", eventId);

  if (error) {
    throw repositoryError("Webhook event failure update", error.code);
  }
}
