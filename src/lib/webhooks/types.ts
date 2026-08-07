export interface LeadCreatedEvent {
  event: "lead.created";
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
    status: string;
    score: number;
  };
}

export interface LeadUpdatedEvent {
  event: "lead.updated";
  event_id: string;
  timestamp: string;
  organization_id: string;
  lead_id: string;
  changes: Record<string, unknown>;
}

export type WebhookEvent = LeadCreatedEvent | LeadUpdatedEvent;
