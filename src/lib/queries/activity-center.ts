import {
  buildActivityFeed,
  type ActivityItem,
  type AutomationActivityRow,
  type ConversationActivityRow,
  type IntegrationActivityRow,
} from "@/lib/product-ux/activity";
import { createClient } from "@/lib/supabase/server";

const SOURCE_LIMIT = 40;

export interface ActivityCenterResult {
  data: ActivityItem[];
  error: string | null;
  partial: boolean;
}

export async function getOrganizationActivity(
  organizationId: string,
): Promise<ActivityCenterResult> {
  const supabase = await createClient();
  const [conversationResponse, automationResponse, integrationResponse] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id, lead_id, subject, created_at")
        .eq("organization_id", organizationId)
        .eq("type", "note")
        .order("created_at", { ascending: false })
        .limit(SOURCE_LIMIT),
      supabase
        .from("automation_executions")
        .select("id, provider, action, status, attempts, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(SOURCE_LIMIT),
      supabase
        .from("integration_audit_events")
        .select("id, provider, event_type, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(SOURCE_LIMIT),
    ]);

  const sourceErrors = [
    conversationResponse.error,
    automationResponse.error,
    integrationResponse.error,
  ].filter(Boolean);
  if (sourceErrors.length > 0) {
    console.error("[ActivityCenter] Source query failed");
  }
  if (sourceErrors.length === 3) {
    return {
      data: [],
      error: "Activity is temporarily unavailable",
      partial: false,
    };
  }

  const conversationRows: ConversationActivityRow[] = (
    conversationResponse.data ?? []
  ).map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    subject: row.subject,
    createdAt: row.created_at,
  }));
  const leadIds = [...new Set(conversationRows.map((row) => row.leadId))];
  const leadNames = new Map<string, string>();
  let leadLookupFailed = false;
  if (leadIds.length > 0) {
    const leadResponse = await supabase
      .from("leads")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .in("id", leadIds)
      .limit(SOURCE_LIMIT);
    if (leadResponse.error) {
      leadLookupFailed = true;
      console.error(
        "[ActivityCenter] Lead lookup failed:",
        "Lead lookup unavailable",
      );
    } else {
      for (const lead of leadResponse.data ?? []) {
        const name = `${lead.first_name} ${lead.last_name}`.trim();
        leadNames.set(lead.id, name || "Unnamed lead");
      }
    }
  }

  const automationRows: AutomationActivityRow[] = (
    automationResponse.data ?? []
  ).map((row) => ({
    id: row.id,
    provider: row.provider,
    action: row.action,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at,
  }));
  const integrationRows: IntegrationActivityRow[] = (
    integrationResponse.data ?? []
  ).map((row) => ({
    id: row.id,
    provider: row.provider,
    eventType: row.event_type,
    createdAt: row.created_at,
  }));

  return {
    data: buildActivityFeed({
      conversations: conversationRows,
      automations: automationRows,
      integrations: integrationRows,
      leadNames,
    }),
    error: null,
    partial: sourceErrors.length > 0 || leadLookupFailed,
  };
}
