import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

// A development safety ceiling rather than a commercial entitlement. The
// database function makes reservations atomically across all app instances.
const ORGANIZATION_AI_QUALIFICATION_HOURLY_LIMIT = 20;

export interface ExecutionRecord {
  id: string;
  organization_id: string;
  event_type: string;
  event_id: string;
  lead_id: string | null;
  provider: string;
  action: string;
  status: "pending" | "processing" | "success" | "failed";
  attempts: number;
  error_message: string | null;
  completed_at: string | null;
  next_retry_at: string | null;
}

export async function startExecution(params: {
  organizationId: string;
  eventType: string;
  eventId: string;
  leadId?: string;
  provider: string;
  action: string;
}): Promise<ExecutionRecord | null> {
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("automation_executions")
    .select("id, status")
    .eq("organization_id", params.organizationId)
    .eq("event_id", params.eventId)
    .eq("provider", params.provider)
    .eq("action", params.action)
    .eq("status", "success")
    .maybeSingle();

  if (existing) {
    return null;
  }

  const { data, error } = await supabase
    .from("automation_executions")
    .upsert(
      {
        organization_id: params.organizationId,
        event_type: params.eventType,
        event_id: params.eventId,
        lead_id: params.leadId ?? null,
        provider: params.provider,
        action: params.action,
        status: "processing",
        attempts: 1,
        started_at: new Date().toISOString(),
      },
      { onConflict: "organization_id, event_id, provider, action" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[Executions] Failed to start:", error?.message);
    return null;
  }

  return data as ExecutionRecord;
}

export async function startLeadQualificationExecution(params: {
  organizationId: string;
  leadId: string;
}): Promise<{ execution: ExecutionRecord | null; error: string | null }> {
  const supabase = await createServiceClient();
  const minuteBucket = Math.floor(Date.now() / 60_000);

  const { data, error } = await supabase
    .from("automation_executions")
    .insert({
      organization_id: params.organizationId,
      event_type: "lead.qualified",
      event_id: `lead.qualified:${params.leadId}:${minuteBucket}`,
      lead_id: params.leadId,
      provider: "openai",
      action: "lead_qualification",
      status: "processing",
      attempts: 1,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        execution: null,
        error:
          "A qualification is already running or was just completed. Try again in a minute.",
      };
    }

    console.error("[Executions] Failed to start AI qualification:", error.code);
    return {
      execution: null,
      error: "Unable to start AI qualification. Please try again.",
    };
  }

  const { data: reserved, error: reservationError } = await supabase.rpc(
    "reserve_organization_ai_qualification_slot",
    {
      p_organization_id: params.organizationId,
      p_limit: ORGANIZATION_AI_QUALIFICATION_HOURLY_LIMIT,
    },
  );

  if (reservationError || !reserved) {
    const message = reservationError
      ? "Unable to start AI qualification. Please try again."
      : "Unable to start AI qualification because the organization safety limit has been reached. Try again after the current hour.";

    console.error(
      "[Executions] AI qualification reservation was not granted:",
      reservationError?.code ?? "limit_reached",
    );
    await completeExecution(data.id, "failed", message);

    return { execution: null, error: message };
  }

  return { execution: data as ExecutionRecord, error: null };
}

export async function completeExecution(
  executionId: string,
  status: "success" | "failed",
  errorMessage?: string,
  responseMetadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createServiceClient();

  await supabase
    .from("automation_executions")
    .update({
      status,
      error_message: errorMessage ?? null,
      response_metadata: responseMetadata ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", executionId);
}

export function computeRetryDelay(attempt: number): number {
  const delays = [0, 5_000, 30_000, 120_000, 600_000];
  return delays[Math.min(attempt, delays.length - 1)] ?? 600_000;
}
