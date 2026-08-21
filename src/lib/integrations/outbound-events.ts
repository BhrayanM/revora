import "server-only";

import { randomUUID } from "crypto";

import type {
  IntegrationTestEvent,
  OutboundEvent,
  OutboundEventType,
} from "@/lib/integrations/types";
import type { Database } from "@/lib/supabase/types";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export function buildLeadOutboundEvent(params: {
  type: OutboundEventType;
  organizationId: string;
  lead: LeadRow;
  changedFields?: string[];
}): OutboundEvent {
  return {
    version: "1",
    id: randomUUID(),
    type: params.type,
    occurred_at: new Date().toISOString(),
    organization_id: params.organizationId,
    data: {
      lead: {
        id: params.lead.id,
        first_name: params.lead.first_name,
        last_name: params.lead.last_name,
        email: params.lead.email,
        phone: params.lead.phone,
        company: params.lead.company,
        source: params.lead.source,
        status: params.lead.status,
        score: params.lead.score,
        pipeline_stage_id: params.lead.pipeline_stage_id,
      },
      ...(params.changedFields && params.changedFields.length > 0
        ? { changed_fields: [...new Set(params.changedFields)].sort() }
        : {}),
    },
  };
}

export function buildIntegrationTestEvent(
  organizationId: string,
  provider: IntegrationTestEvent["data"]["provider"],
): IntegrationTestEvent {
  return {
    version: "1",
    id: randomUUID(),
    type: "integration.test",
    occurred_at: new Date().toISOString(),
    organization_id: organizationId,
    data: { provider },
  };
}
