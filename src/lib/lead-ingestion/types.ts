export interface InboundLeadPayload {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  source_id?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedLead {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: "website" | "tally" | "n8n" | "api";
  source_external_id: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
}

export interface LeadIngestionResult {
  lead: { id: string; status: string } | null;
  qualification: { status: "not_started" };
  idempotent: boolean;
}
