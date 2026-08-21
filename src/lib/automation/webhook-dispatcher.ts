import "server-only";

import { sendAutomationWebhookEvent } from "@/lib/integrations/automation-webhook-adapters";
import {
  listActiveAutomationWebhookConnections,
  markWebhookConnectionError,
  markWebhookConnectionHealthy,
} from "@/lib/integrations/connections";
import { recordAuditEvent } from "@/lib/integrations/oauth";
import type {
  AutomationWebhookEvent,
  AutomationWebhookProviderId,
  IntegrationTestEvent,
  OutboundEvent,
} from "@/lib/integrations/types";
import { createServiceAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const WEBHOOK_ACTION = "webhook_delivery";
const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MS = 15 * 60 * 1_000;
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000, 600_000];

interface EventMetadata {
  event_snapshot: AutomationWebhookEvent;
  outcome?: {
    http_status: number | null;
    error_code: string | null;
    retryable: boolean;
  };
}

function logDatabaseError(operation: string, code?: string): void {
  console.error(
    `[Automation Webhook] ${operation} failed:`,
    code ?? "UNKNOWN_DATABASE_ERROR",
  );
}

function safeErrorMessage(code: string | null): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "The webhook rejected its configured credentials.";
    case "ENDPOINT_INACTIVE":
      return "The configured webhook endpoint is inactive or unavailable.";
    case "RATE_LIMITED":
      return "The webhook provider rate limited the request.";
    case "INVALID_WEBHOOK_URL":
      return "The configured webhook URL failed security validation.";
    case "REQUEST_TIMEOUT":
      return "The webhook request timed out.";
    case "RESPONSE_TOO_LARGE":
      return "The webhook response exceeded the allowed size.";
    case "REDIRECT_NOT_ALLOWED":
      return "The webhook endpoint attempted an unsupported redirect.";
    case "REQUEST_REJECTED":
      return "The webhook provider rejected the request.";
    default:
      return "Webhook delivery failed.";
  }
}

function parseEventMetadata(value: Json): EventMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value.event_snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  const candidate = snapshot as Record<string, Json | undefined>;
  if (
    candidate.version !== "1" ||
    typeof candidate.id !== "string" ||
    typeof candidate.type !== "string" ||
    typeof candidate.occurred_at !== "string" ||
    typeof candidate.organization_id !== "string" ||
    !candidate.data ||
    typeof candidate.data !== "object" ||
    Array.isArray(candidate.data)
  ) {
    return null;
  }

  return value as unknown as EventMetadata;
}

function retryDelay(attempt: number, providerDelay: number | null): number {
  if (providerDelay !== null) return providerDelay;
  return RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]!;
}

async function enqueueProviderDelivery(params: {
  provider: AutomationWebhookProviderId;
  event: AutomationWebhookEvent;
  leadId?: string;
}): Promise<string | null> {
  const supabase = await createServiceAdminClient();
  const metadata: EventMetadata = { event_snapshot: params.event };

  const { data, error } = await supabase
    .from("automation_executions")
    .insert({
      organization_id: params.event.organization_id,
      event_type: params.event.type,
      event_id: params.event.id,
      lead_id: params.leadId ?? null,
      provider: params.provider,
      action: WEBHOOK_ACTION,
      status: "pending",
      attempts: 0,
      response_metadata: metadata as unknown as Json,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code !== "23505") {
      logDatabaseError("Enqueue delivery", error.code);
    }
    return null;
  }

  return data.id;
}

export async function processWebhookExecution(
  executionId: string,
): Promise<"success" | "failed" | "skipped"> {
  const supabase = await createServiceAdminClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("automation_executions")
    .select("*")
    .eq("id", executionId)
    .eq("action", WEBHOOK_ACTION)
    .maybeSingle();

  if (candidateError) {
    logDatabaseError("Load execution", candidateError.code);
    return "skipped";
  }

  if (!candidate || !["pending", "failed"].includes(candidate.status)) {
    return "skipped";
  }

  if (
    candidate.status === "failed" &&
    (!candidate.next_retry_at || new Date(candidate.next_retry_at) > new Date())
  ) {
    return "skipped";
  }

  const nextAttempt = candidate.attempts + 1;
  const { data: claimed, error: claimError } = await supabase
    .from("automation_executions")
    .update({
      status: "processing",
      attempts: nextAttempt,
      started_at: new Date().toISOString(),
      completed_at: null,
      next_retry_at: null,
      error_message: null,
    })
    .eq("id", executionId)
    .eq("attempts", candidate.attempts)
    .in("status", ["pending", "failed"])
    .select("*")
    .maybeSingle();

  if (claimError) {
    logDatabaseError("Claim execution", claimError.code);
    return "skipped";
  }

  if (!claimed) return "skipped";

  const metadata = parseEventMetadata(claimed.response_metadata);
  const snapshotMatchesExecution =
    metadata?.event_snapshot.organization_id === claimed.organization_id &&
    metadata.event_snapshot.id === claimed.event_id &&
    metadata.event_snapshot.type === claimed.event_type;
  const verifiedMetadata = snapshotMatchesExecution ? metadata : null;
  const provider = claimed.provider as AutomationWebhookProviderId;
  const supportedProvider = ["n8n", "zapier", "make"].includes(provider);
  const connection = supportedProvider
    ? (
        await listActiveAutomationWebhookConnections(claimed.organization_id)
      ).find((item) => item.provider === provider)
    : undefined;

  let result:
    Awaited<ReturnType<typeof sendAutomationWebhookEvent>> | undefined;

  if (verifiedMetadata && connection) {
    try {
      result = await sendAutomationWebhookEvent({
        provider,
        credentials: connection.credentials,
        event: verifiedMetadata.event_snapshot,
      });
    } catch {
      result = {
        ok: false,
        status: null,
        retryable: false,
        errorCode: "INVALID_CREDENTIALS",
        retryAfterMs: null,
      };
    }
  }

  const outcome = result ?? {
    ok: false,
    status: null,
    retryable: false,
    errorCode: verifiedMetadata
      ? "CONNECTION_NOT_ACTIVE"
      : "INVALID_EVENT_SNAPSHOT",
    retryAfterMs: null,
  };
  const completedAt = new Date().toISOString();
  const responseMetadata: EventMetadata | Record<string, unknown> =
    verifiedMetadata
      ? {
          ...verifiedMetadata,
          outcome: {
            http_status: outcome.status,
            error_code: outcome.errorCode,
            retryable: outcome.retryable,
          },
        }
      : {
          outcome: {
            http_status: outcome.status,
            error_code: outcome.errorCode,
            retryable: outcome.retryable,
          },
        };

  if (outcome.ok) {
    const { data: completed, error: completionError } = await supabase
      .from("automation_executions")
      .update({
        status: "success",
        completed_at: completedAt,
        error_message: null,
        next_retry_at: null,
        response_metadata: responseMetadata as unknown as Json,
      })
      .eq("id", claimed.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();

    if (completionError || !completed) {
      logDatabaseError("Persist successful delivery", completionError?.code);
      return "failed";
    }

    await markWebhookConnectionHealthy(claimed.organization_id, provider);
    await recordAuditEvent(
      claimed.organization_id,
      provider,
      "webhook_delivered",
      undefined,
      {
        event_id: claimed.event_id,
        event_type: claimed.event_type,
        http_status: outcome.status,
        attempt: nextAttempt,
      },
    );
    return "success";
  }

  const willRetry = outcome.retryable && nextAttempt < MAX_ATTEMPTS;
  const nextRetryAt = willRetry
    ? new Date(
        Date.now() + retryDelay(nextAttempt, outcome.retryAfterMs),
      ).toISOString()
    : null;
  const errorCode = outcome.errorCode ?? "DELIVERY_FAILED";

  const { data: failedExecution, error: failureUpdateError } = await supabase
    .from("automation_executions")
    .update({
      status: "failed",
      completed_at: completedAt,
      error_message: safeErrorMessage(errorCode),
      next_retry_at: nextRetryAt,
      response_metadata: responseMetadata as unknown as Json,
    })
    .eq("id", claimed.id)
    .eq("status", "processing")
    .select("id")
    .maybeSingle();

  if (failureUpdateError || !failedExecution) {
    logDatabaseError("Persist failed delivery", failureUpdateError?.code);
    return "failed";
  }

  await markWebhookConnectionError(
    claimed.organization_id,
    provider,
    errorCode,
  );
  await recordAuditEvent(
    claimed.organization_id,
    provider,
    "webhook_delivery_failed",
    undefined,
    {
      event_id: claimed.event_id,
      event_type: claimed.event_type,
      http_status: outcome.status,
      error_code: errorCode,
      retry_scheduled: willRetry,
      attempt: nextAttempt,
    },
  );
  return "failed";
}

export async function dispatchOutboundEvent(
  event: OutboundEvent,
): Promise<{ queued: number; succeeded: number; failed: number }> {
  const connections = await listActiveAutomationWebhookConnections(
    event.organization_id,
  );

  const executionIds = (
    await Promise.all(
      connections.map((connection) =>
        enqueueProviderDelivery({
          provider: connection.provider,
          event,
          leadId: event.data.lead.id,
        }),
      ),
    )
  ).filter((id): id is string => Boolean(id));

  const outcomes = await Promise.all(
    executionIds.map((id) => processWebhookExecution(id)),
  );

  return {
    queued: executionIds.length,
    succeeded: outcomes.filter((outcome) => outcome === "success").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
  };
}

export async function dispatchIntegrationTestEvent(
  event: IntegrationTestEvent,
): Promise<"success" | "failed" | "skipped"> {
  const executionId = await enqueueProviderDelivery({
    provider: event.data.provider,
    event,
  });

  if (!executionId) return "skipped";
  return processWebhookExecution(executionId);
}

export async function processPendingWebhookDeliveries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const supabase = await createServiceAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data: stale, error: staleLookupError } = await supabase
    .from("automation_executions")
    .select("id")
    .eq("action", WEBHOOK_ACTION)
    .eq("status", "processing")
    .lt("started_at", staleBefore)
    .limit(25);

  if (staleLookupError) {
    logDatabaseError("Load stale executions", staleLookupError.code);
  }

  for (const row of stale ?? []) {
    const { error } = await supabase
      .from("automation_executions")
      .update({
        status: "failed",
        error_message: "Webhook worker stopped before delivery completed.",
        next_retry_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "processing");
    if (error) logDatabaseError("Recover stale execution", error.code);
  }

  const now = new Date().toISOString();
  const [pendingResult, retryableResult] = await Promise.all([
    supabase
      .from("automation_executions")
      .select("id")
      .eq("action", WEBHOOK_ACTION)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(25),
    supabase
      .from("automation_executions")
      .select("id")
      .eq("action", WEBHOOK_ACTION)
      .eq("status", "failed")
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", now)
      .lt("attempts", MAX_ATTEMPTS)
      .order("next_retry_at", { ascending: true })
      .limit(25),
  ]);

  if (pendingResult.error) {
    logDatabaseError("Load pending executions", pendingResult.error.code);
  }
  if (retryableResult.error) {
    logDatabaseError("Load retryable executions", retryableResult.error.code);
  }

  const pending = pendingResult.data;
  const retryable = retryableResult.data;

  const ids = [
    ...new Set([...(pending ?? []), ...(retryable ?? [])].map((row) => row.id)),
  ].slice(0, 25);
  const outcomes = await Promise.all(
    ids.map((id) => processWebhookExecution(id)),
  );

  return {
    processed: outcomes.filter((outcome) => outcome !== "skipped").length,
    succeeded: outcomes.filter((outcome) => outcome === "success").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
  };
}
