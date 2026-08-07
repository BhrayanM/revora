export interface LeadCreatedEvent {
  event: "lead.created";
  version: 1;
  event_id: string;
  timestamp: string;
  organization_id: string;
  source: string;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    source: string;
    source_external_id: string | null;
    message: string | null;
    status: string;
    score: number;
  };
}

export interface LeadUpdatedEvent {
  event: "lead.updated";
  version: 1;
  event_id: string;
  timestamp: string;
  organization_id: string;
  lead_id: string;
  changes: Record<string, unknown>;
}

export type WebhookEvent = LeadCreatedEvent | LeadUpdatedEvent;
