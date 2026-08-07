export interface CRMContact {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  company?: string | null;
}

export interface CRMLeadContext {
  score: number;
  temperature: string;
  source: string;
  summary?: string;
  recommended_action?: string;
}

export interface CRMSyncResult {
  contactId?: string;
  created: boolean;
  error?: string;
}

export interface CRMProvider {
  upsertContact(
    contact: CRMContact,
    context: CRMLeadContext,
  ): Promise<CRMSyncResult>;
}
