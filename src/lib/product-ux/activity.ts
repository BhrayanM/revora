export interface ConversationActivityRow {
  id: string;
  leadId: string;
  subject: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AutomationActivityRow {
  id: string;
  provider: string;
  action: string;
  status: string;
  attempts: number;
  errorMessage?: string | null;
  createdAt: string;
}

export interface IntegrationActivityRow {
  id: string;
  provider: string;
  eventType: string;
  metadata: unknown;
  createdAt: string;
}

export interface ActivityFeedInput {
  conversations: ConversationActivityRow[];
  automations: AutomationActivityRow[];
  integrations: IntegrationActivityRow[];
  leadNames: Map<string, string>;
}

export interface ActivityItem {
  id: string;
  category: "lead" | "automation" | "integration";
  title: string;
  detail: string;
  timestamp: string;
  tone: "neutral" | "success" | "warning" | "error";
  href?: string;
}

const LEAD_EVENTS: Record<string, string> = {
  "lead.created": "Lead created",
  "lead.updated": "Lead updated",
  "lead.stage_changed": "Pipeline stage changed",
  "lead.qualified": "AI qualification completed",
};

const INTEGRATION_EVENTS: Record<
  string,
  { label: string; tone: ActivityItem["tone"] }
> = {
  connected: { label: "Integration connected", tone: "success" },
  disconnected: { label: "Integration disconnected", tone: "neutral" },
  reconnected: { label: "Integration reconnected", tone: "success" },
  credentials_rotated: {
    label: "Integration credentials updated",
    tone: "success",
  },
  connection_failed: { label: "Integration connection failed", tone: "error" },
  test_succeeded: { label: "Integration test passed", tone: "success" },
  test_failed: { label: "Integration test failed", tone: "error" },
  reauth_required: { label: "Integration needs reconnection", tone: "warning" },
  token_refreshed: {
    label: "Integration authorization refreshed",
    tone: "success",
  },
  token_refresh_failed: {
    label: "Integration authorization refresh failed",
    tone: "error",
  },
  webhook_verified: { label: "Webhook verified", tone: "success" },
  webhook_delivered: { label: "Webhook delivered", tone: "success" },
  webhook_delivery_failed: {
    label: "Webhook delivery failed",
    tone: "error",
  },
  contact_synced: { label: "Contact synchronized", tone: "success" },
  webhook_received: { label: "Webhook received", tone: "neutral" },
  webhook_duplicate: { label: "Duplicate webhook ignored", tone: "neutral" },
  webhook_rejected: { label: "Webhook rejected", tone: "warning" },
  lead_captured: { label: "Lead captured", tone: "success" },
  calendar_event_created: {
    label: "Calendar event created",
    tone: "success",
  },
  gmail_message_sent: { label: "Gmail message sent", tone: "success" },
  resource_cleanup_failed: {
    label: "Remote integration cleanup needs attention",
    tone: "warning",
  },
};

function safeLabel(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function getConversationEventType(row: ConversationActivityRow): string | null {
  if (
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata) &&
    typeof (row.metadata as Record<string, unknown>)["event_type"] === "string"
  ) {
    return (row.metadata as Record<string, string>)["event_type"] ?? null;
  }
  return row.subject;
}

export function buildActivityFeed(
  input: ActivityFeedInput,
  limit = 40,
): ActivityItem[] {
  const leadItems = input.conversations.flatMap((row): ActivityItem[] => {
    const eventType = getConversationEventType(row);
    const label = eventType ? LEAD_EVENTS[eventType] : undefined;
    const leadName = input.leadNames.get(row.leadId);
    if (!label || !leadName) return [];
    return [
      {
        id: `lead:${row.id}`,
        category: "lead",
        title: label,
        detail: leadName.slice(0, 160),
        timestamp: row.createdAt,
        tone: eventType === "lead.qualified" ? "success" : "neutral",
        href: `/leads/${encodeURIComponent(row.leadId)}`,
      },
    ];
  });

  const automationItems = input.automations.map((row): ActivityItem => ({
    id: `automation:${row.id}`,
    category: "automation",
    title:
      row.status === "failed"
        ? "Automation delivery failed"
        : row.status === "success"
          ? "Automation delivery completed"
          : "Automation delivery updated",
    detail: `${safeLabel(row.provider, "Provider")} · ${safeLabel(row.action, "Action")} · ${Math.max(1, row.attempts)} attempt${row.attempts === 1 ? "" : "s"}`,
    timestamp: row.createdAt,
    tone:
      row.status === "failed"
        ? "error"
        : row.status === "success"
          ? "success"
          : "warning",
  }));

  const integrationItems = input.integrations.flatMap((row): ActivityItem[] => {
    const event = INTEGRATION_EVENTS[row.eventType];
    if (!event) return [];
    return [
      {
        id: `integration:${row.id}`,
        category: "integration",
        title: event.label,
        detail: safeLabel(row.provider, "Provider"),
        timestamp: row.createdAt,
        tone: event.tone,
      },
    ];
  });

  return [...leadItems, ...automationItems, ...integrationItems]
    .filter((item) => Number.isFinite(Date.parse(item.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, Math.max(0, Math.min(limit, 100)));
}
