import "server-only";

import type {
  CRMContact,
  CRMLeadContext,
  CRMProvider,
  CRMSyncResult,
} from "@/lib/crm/types";

interface HubSpotConfig {
  accessToken: string;
}

export function createHubSpotProvider(config: HubSpotConfig): CRMProvider {
  const baseUrl = "https://api.hubapi.com";

  async function request(
    path: string,
    options: RequestInit,
  ): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  async function findContactByEmail(email: string): Promise<string | null> {
    const res = await request(`/crm/v3/objects/contacts/search`, {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        properties: ["email"],
        limit: 1,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { results?: Array<{ id: string }> };
    return data.results?.[0]?.id ?? null;
  }

  async function createContact(
    contact: CRMContact,
    context: CRMLeadContext,
  ): Promise<CRMSyncResult> {
    const properties: Record<string, string> = {
      email: contact.email,
      firstname: contact.first_name,
      lastname: contact.last_name,
    };

    if (contact.phone) properties["phone"] = contact.phone;
    if (contact.company) properties["company"] = contact.company;
    if (context.score) properties["ai_score__c"] = String(context.score);
    if (context.temperature)
      properties["lead_temperature__c"] = context.temperature;

    const res = await request("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { created: false, error: `HubSpot create failed: ${err}` };
    }

    const data = (await res.json()) as { id: string };
    return { contactId: data.id, created: true };
  }

  async function updateContact(
    contactId: string,
    contact: CRMContact,
    context: CRMLeadContext,
  ): Promise<CRMSyncResult> {
    const properties: Record<string, string> = {};
    if (contact.phone) properties["phone"] = contact.phone;
    if (contact.company) properties["company"] = contact.company;
    if (context.score) properties["ai_score__c"] = String(context.score);
    if (context.temperature)
      properties["lead_temperature__c"] = context.temperature;

    const res = await request(`/crm/v3/objects/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { created: false, error: `HubSpot update failed: ${err}` };
    }

    return { contactId, created: false };
  }

  return {
    async upsertContact(
      contact: CRMContact,
      context: CRMLeadContext,
    ): Promise<CRMSyncResult> {
      if (!contact.email) {
        return { created: false, error: "Email is required for HubSpot sync" };
      }

      try {
        const existingId = await findContactByEmail(contact.email);
        if (existingId) {
          return updateContact(existingId, contact, context);
        }
        return createContact(contact, context);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { created: false, error: message };
      }
    },
  };
}
