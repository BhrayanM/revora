import "server-only";

import type {
  CRMContact,
  CRMLeadContext,
  CRMSyncResult,
} from "@/lib/crm/types";
import type { CRMProvider } from "@/lib/crm/types";

interface GHLConfig {
  apiKey: string;
  locationId: string;
}

export function createGoHighLevelProvider(config: GHLConfig): CRMProvider {
  const baseUrl = "https://rest.gohighlevel.com/v1";

  async function request(
    path: string,
    options: RequestInit,
  ): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  async function findContactByEmail(email: string): Promise<string | null> {
    const res = await request(
      `/contacts/lookup?email=${encodeURIComponent(email)}`,
      { method: "GET" },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { contacts?: Array<{ id: string }> };
    return data.contacts?.[0]?.id ?? null;
  }

  async function createContact(
    contact: CRMContact,
    context: CRMLeadContext,
  ): Promise<CRMSyncResult> {
    const body: Record<string, unknown> = {
      email: contact.email,
      firstName: contact.first_name,
      lastName: contact.last_name,
      phone: contact.phone ?? undefined,
      companyName: contact.company ?? undefined,
      customFields: {
        ai_score: String(context.score),
        lead_temperature: context.temperature,
        lead_source: context.source,
      },
      tags: ["ai-growth-platform", context.temperature.toLowerCase()],
    };

    const res = await request("/contacts/", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { created: false, error: `GoHighLevel create failed: ${err}` };
    }

    const data = (await res.json()) as { contact: { id: string } };
    return { contactId: data.contact.id, created: true };
  }

  async function updateContact(
    contactId: string,
    contact: CRMContact,
    context: CRMLeadContext,
  ): Promise<CRMSyncResult> {
    const body: Record<string, unknown> = {
      phone: contact.phone ?? undefined,
      companyName: contact.company ?? undefined,
      customFields: {
        ai_score: String(context.score),
        lead_temperature: context.temperature,
      },
    };

    const res = await request(`/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { created: false, error: `GoHighLevel update failed: ${err}` };
    }

    return { contactId, created: false };
  }

  return {
    async upsertContact(
      contact: CRMContact,
      context: CRMLeadContext,
    ): Promise<CRMSyncResult> {
      if (!contact.email) {
        return {
          created: false,
          error: "Email is required for GoHighLevel sync",
        };
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
