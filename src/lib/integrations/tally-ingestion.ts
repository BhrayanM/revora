import "server-only";

import { createHash } from "node:crypto";

import { dispatchOutboundEvent } from "@/lib/automation/webhook-dispatcher";
import type { ActiveTallyConnection } from "@/lib/integrations/connections";
import { recordAuditEvent } from "@/lib/integrations/oauth";
import { buildLeadOutboundEvent } from "@/lib/integrations/outbound-events";
import {
  mapTallyEventToLeadInput,
  parseTallyWebhookEvent,
} from "@/lib/integrations/tally-contract";
import type { OutboundEvent } from "@/lib/integrations/types";
import {
  claimWebhookEvent,
  markWebhookFailed,
  markWebhookProcessed,
  type WebhookEventClaim,
} from "@/lib/integrations/webhooks";
import { normalizeLead } from "@/lib/lead-ingestion/normalize";
import { createServiceAdminClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type TallyIngestionResult =
  | { status: "created"; leadId: string }
  | { status: "duplicate"; leadId: string | null }
  | { status: "in_progress" }
  | { status: "payload_conflict" }
  | { status: "invalid_event" }
  | { status: "configuration_error" }
  | { status: "retryable_error" };

export interface TallyIngestionDependencies {
  claimEvent: (params: {
    organizationId: string;
    integrationId: string;
    provider: "tally";
    externalEventId: string;
    eventType: string;
    payloadHash: string;
    now: Date;
  }) => Promise<WebhookEventClaim>;
  resolveCrmDefaults: (organizationId: string) => Promise<{
    workspaceId: string;
    pipelineId: string;
    stageId: string;
  } | null>;
  insertLead: (
    payload: LeadInsert,
  ) => Promise<
    | { ok: true; lead: LeadRow }
    | { ok: false; conflict: boolean; errorCode: string }
  >;
  findLeadBySource: (
    organizationId: string,
    sourceExternalId: string,
  ) => Promise<{ id: string; status: string } | null>;
  markProcessed: (eventId: string, leadId: string) => Promise<void>;
  markFailed: (eventId: string, errorCode: string) => Promise<void>;
  dispatchOutbound: (event: OutboundEvent) => Promise<unknown>;
  recordAudit: (
    eventType:
      | "webhook_received"
      | "webhook_duplicate"
      | "webhook_rejected"
      | "lead_captured",
    metadata: Record<string, unknown>,
  ) => Promise<void>;
  clock: () => Date;
  hashPayload: (rawPayload: string) => string;
}

async function safeAudit(
  dependencies: TallyIngestionDependencies,
  eventType: Parameters<TallyIngestionDependencies["recordAudit"]>[0],
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await dependencies.recordAudit(eventType, metadata);
  } catch {
    // Audit delivery must never change webhook idempotency or expose payloads.
  }
}

async function failClaimSafely(
  dependencies: TallyIngestionDependencies,
  eventId: string,
  errorCode: string,
): Promise<boolean> {
  try {
    await dependencies.markFailed(eventId, errorCode);
    return true;
  } catch {
    return false;
  }
}

export async function ingestTallyWebhook(
  input: { rawPayload: string; connection: ActiveTallyConnection },
  dependencies: TallyIngestionDependencies,
): Promise<TallyIngestionResult> {
  let event;
  try {
    event = parseTallyWebhookEvent(JSON.parse(input.rawPayload) as unknown);
  } catch {
    return { status: "invalid_event" };
  }

  let mappedLead;
  try {
    mappedLead = mapTallyEventToLeadInput(
      event,
      input.connection.config.fieldMapping,
      input.connection.config.formId,
    );
  } catch {
    await safeAudit(dependencies, "webhook_rejected", {
      event_id: event.eventId,
      reason: "INVALID_EVENT",
    });
    return { status: "invalid_event" };
  }

  const now = dependencies.clock();
  let payloadHash: string;
  try {
    payloadHash = dependencies.hashPayload(input.rawPayload);
  } catch {
    return { status: "retryable_error" };
  }

  let claim: WebhookEventClaim;
  try {
    claim = await dependencies.claimEvent({
      organizationId: input.connection.organizationId,
      integrationId: input.connection.id,
      provider: "tally",
      externalEventId: event.eventId,
      eventType: event.eventType,
      payloadHash,
      now,
    });
  } catch {
    return { status: "retryable_error" };
  }

  if (claim.status === "payload_conflict") {
    await safeAudit(dependencies, "webhook_rejected", {
      event_id: event.eventId,
      reason: "PAYLOAD_CONFLICT",
    });
    return { status: "payload_conflict" };
  }
  if (claim.status === "duplicate") {
    await safeAudit(dependencies, "webhook_duplicate", {
      event_id: event.eventId,
      lead_id: claim.leadId,
    });
    return { status: "duplicate", leadId: claim.leadId };
  }
  if (claim.status === "in_progress") {
    await safeAudit(dependencies, "webhook_duplicate", {
      event_id: event.eventId,
      state: "in_progress",
    });
    return { status: "in_progress" };
  }

  await safeAudit(dependencies, "webhook_received", {
    event_id: event.eventId,
    attempt: claim.attemptCount,
  });

  let defaults: Awaited<
    ReturnType<TallyIngestionDependencies["resolveCrmDefaults"]>
  >;
  try {
    defaults = await dependencies.resolveCrmDefaults(
      input.connection.organizationId,
    );
  } catch {
    await failClaimSafely(dependencies, claim.id, "CRM_DEFAULTS_LOOKUP_FAILED");
    return { status: "retryable_error" };
  }
  if (!defaults) {
    const failureRecorded = await failClaimSafely(
      dependencies,
      claim.id,
      "CRM_DEFAULTS_MISSING",
    );
    await safeAudit(dependencies, "webhook_rejected", {
      event_id: event.eventId,
      reason: "CRM_DEFAULTS_MISSING",
    });
    return {
      status: failureRecorded ? "configuration_error" : "retryable_error",
    };
  }

  const normalized = normalizeLead(mappedLead, "tally");
  const metadata: Json = {
    ingested_via: "tally",
    tally_form_id: event.data.formId,
    tally_form_name: input.connection.config.formName,
    tally_submission_id: event.data.submissionId,
    tally_event_id: event.eventId,
    ingested_at: now.toISOString(),
  };
  const insertPayload: LeadInsert = {
    organization_id: input.connection.organizationId,
    workspace_id: defaults.workspaceId,
    pipeline_id: defaults.pipelineId,
    pipeline_stage_id: defaults.stageId,
    first_name: normalized.first_name,
    last_name: normalized.last_name,
    email: normalized.email,
    phone: normalized.phone,
    company: normalized.company,
    source: "other",
    source_external_id: normalized.source_external_id,
    status: "new",
    score: 0,
    metadata,
  };

  let insertion: Awaited<ReturnType<TallyIngestionDependencies["insertLead"]>>;
  try {
    insertion = await dependencies.insertLead(insertPayload);
  } catch {
    await failClaimSafely(dependencies, claim.id, "LEAD_INSERT_FAILED");
    return { status: "retryable_error" };
  }

  if (!insertion.ok) {
    if (insertion.conflict) {
      let existing: Awaited<
        ReturnType<TallyIngestionDependencies["findLeadBySource"]>
      >;
      try {
        existing = await dependencies.findLeadBySource(
          input.connection.organizationId,
          mappedLead.source_id,
        );
      } catch {
        await failClaimSafely(dependencies, claim.id, "LEAD_LOOKUP_FAILED");
        return { status: "retryable_error" };
      }
      if (existing) {
        try {
          await dependencies.markProcessed(claim.id, existing.id);
        } catch {
          await failClaimSafely(
            dependencies,
            claim.id,
            "EVENT_COMPLETION_FAILED",
          );
          return { status: "retryable_error" };
        }
        await safeAudit(dependencies, "webhook_duplicate", {
          event_id: event.eventId,
          lead_id: existing.id,
        });
        return { status: "duplicate", leadId: existing.id };
      }
    }
    await failClaimSafely(dependencies, claim.id, "LEAD_INSERT_FAILED");
    return { status: "retryable_error" };
  }

  try {
    await dependencies.markProcessed(claim.id, insertion.lead.id);
  } catch {
    await failClaimSafely(dependencies, claim.id, "EVENT_COMPLETION_FAILED");
    return { status: "retryable_error" };
  }

  await safeAudit(dependencies, "lead_captured", {
    event_id: event.eventId,
    lead_id: insertion.lead.id,
  });
  try {
    await dependencies.dispatchOutbound(
      buildLeadOutboundEvent({
        type: "lead.created",
        organizationId: input.connection.organizationId,
        lead: insertion.lead,
      }),
    );
  } catch {
    // The lead and event completion are durable; provider retries stay no-ops.
  }

  return { status: "created", leadId: insertion.lead.id };
}

export function createTallyIngestionDependencies(
  organizationId: string,
): TallyIngestionDependencies {
  return {
    claimEvent: claimWebhookEvent,
    async resolveCrmDefaults(scopedOrganizationId) {
      const supabase = await createServiceAdminClient();
      const [{ data: workspace }, { data: pipeline }] = await Promise.all([
        supabase
          .from("workspaces")
          .select("id")
          .eq("organization_id", scopedOrganizationId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("pipelines")
          .select("id")
          .eq("organization_id", scopedOrganizationId)
          .eq("is_default", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!workspace || !pipeline) return null;
      const { data: stage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipeline.id)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!stage) return null;
      return {
        workspaceId: workspace.id,
        pipelineId: pipeline.id,
        stageId: stage.id,
      };
    },
    async insertLead(payload) {
      const supabase = await createServiceAdminClient();
      const { data, error } = await supabase
        .from("leads")
        .insert(payload)
        .select("*")
        .single();
      if (error || !data) {
        return {
          ok: false,
          conflict: error?.code === "23505",
          errorCode: error?.code ?? "LEAD_INSERT_FAILED",
        };
      }
      return { ok: true, lead: data };
    },
    async findLeadBySource(scopedOrganizationId, sourceExternalId) {
      const supabase = await createServiceAdminClient();
      const { data, error } = await supabase
        .from("leads")
        .select("id, status")
        .eq("organization_id", scopedOrganizationId)
        .eq("source", "other")
        .eq("source_external_id", sourceExternalId)
        .limit(1)
        .maybeSingle();
      return error ? null : data;
    },
    markProcessed: markWebhookProcessed,
    markFailed: markWebhookFailed,
    dispatchOutbound: dispatchOutboundEvent,
    async recordAudit(eventType, metadata) {
      await recordAuditEvent(
        organizationId,
        "tally",
        eventType,
        undefined,
        metadata,
      );
    },
    clock: () => new Date(),
    hashPayload: (rawPayload) =>
      createHash("sha256").update(rawPayload, "utf8").digest("hex"),
  };
}
