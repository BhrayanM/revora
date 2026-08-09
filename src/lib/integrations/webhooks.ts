import "server-only";

import type { IntegrationProviderId } from "@/lib/integrations/types";
import { createServiceAdminClient } from "@/lib/supabase/server";

export async function recordWebhookEvent(params: {
  organizationId: string;
  integrationId?: string;
  provider: IntegrationProviderId;
  externalEventId: string;
  eventType: string;
  payloadHash?: string;
}): Promise<{ status: "received" | "duplicate"; id?: string }> {
  const supabase = await createServiceAdminClient();

  const { data: existing } = await supabase
    .from("integration_webhook_events")
    .select("id, status")
    .eq("provider", params.provider)
    .eq("external_event_id", params.externalEventId)
    .maybeSingle();

  if (existing) {
    return { status: "duplicate", id: existing.id };
  }

  const { data, error } = await supabase
    .from("integration_webhook_events")
    .insert({
      organization_id: params.organizationId,
      integration_id: params.integrationId ?? null,
      provider: params.provider,
      external_event_id: params.externalEventId,
      event_type: params.eventType,
      payload_hash: params.payloadHash ?? null,
      status: "received",
    })
    .select("id")
    .single();

  if (error) {
    return { status: "duplicate" };
  }

  return { status: "received", id: data?.id };
}

export async function markWebhookProcessed(eventId: string): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase
    .from("integration_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}

export async function markWebhookFailed(
  eventId: string,
  errorCode: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase
    .from("integration_webhook_events")
    .update({
      status: "failed",
      error_code: errorCode,
    })
    .eq("id", eventId);
}
