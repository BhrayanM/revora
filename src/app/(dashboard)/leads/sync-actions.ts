"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import {
  getGHLAccessToken,
  getGHLLocationId,
  GHL_API_BASE,
} from "@/lib/integrations/adapters/gohighlevel";
import {
  getHubSpotAccessToken,
  HUBSPOT_API_BASE,
} from "@/lib/integrations/adapters/hubspot";
import { getLeadById } from "@/lib/queries/leads";
import { createServiceAdminClient } from "@/lib/supabase/server";

export async function syncLeadToHubSpot(leadId: string) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;
  const orgId = org.id;

  const accessToken = await getHubSpotAccessToken(orgId);
  if (!accessToken) return { error: "HubSpot is not connected." };

  const { data: lead, error: leadError } = await getLeadById(leadId);
  if (leadError || !lead || lead.organization_id !== orgId) {
    return { error: "Lead not found" };
  }

  if (!lead.email) {
    return { error: "Lead has no email address for HubSpot sync" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const searchRes = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: "email", operator: "EQ", value: lead.email },
              ],
            },
          ],
          properties: ["email"],
          limit: 1,
        }),
        signal: controller.signal,
      },
    );

    const searchData = (await searchRes.json()) as {
      results?: Array<{ id: string }>;
    };
    const existingId = searchData.results?.[0]?.id ?? null;

    const qualification = (lead.metadata as Record<string, unknown>)
      ?.qualification as Record<string, unknown> | undefined;
    const temperature = qualification
      ? (qualification["temperature"] as string)
      : undefined;
    const score = lead.score || 0;

    const properties: Record<string, unknown> = {
      email: lead.email,
      firstname: lead.first_name,
      lastname: lead.last_name,
    };
    if (lead.phone) properties["phone"] = lead.phone;
    if (lead.company) properties["company"] = lead.company;
    if (score > 0) properties["ai_score__c"] = String(score);
    if (temperature) properties["lead_temperature__c"] = temperature;

    let contactId: string;
    let created: boolean;

    if (existingId) {
      const updateRes = await fetch(
        `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${existingId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ properties }),
          signal: controller.signal,
        },
      );
      if (!updateRes.ok) {
        clearTimeout(timeout);
        return { error: "HubSpot update failed" };
      }
      contactId = existingId;
      created = false;
    } else {
      const createRes = await fetch(
        `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ properties }),
          signal: controller.signal,
        },
      );
      if (!createRes.ok) {
        clearTimeout(timeout);
        return { error: "HubSpot create failed" };
      }
      const createData = (await createRes.json()) as { id: string };
      contactId = createData.id;
      created = true;
    }

    clearTimeout(timeout);

    const supabase = await createServiceAdminClient();
    await supabase.from("conversations").insert({
      organization_id: orgId,
      lead_id: leadId,
      type: "note",
      direction: "outbound",
      subject: "integration.hubspot.contact_synced",
      content: created
        ? `Contact created in HubSpot (${contactId})`
        : `Contact updated in HubSpot (${contactId})`,
      metadata: { provider: "hubspot", contact_id: contactId, created },
    });

    revalidatePath(`/leads/${leadId}`);

    return { error: null, contactId, created };
  } catch {
    return { error: "HubSpot sync failed. Please try again." };
  }
}

export async function syncLeadToGoHighLevel(leadId: string) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;
  const orgId = org.id;

  const accessToken = await getGHLAccessToken(orgId);
  if (!accessToken) return { error: "GoHighLevel is not connected." };

  const locationId = await getGHLLocationId(orgId);
  if (!locationId) return { error: "GoHighLevel location not configured." };

  const { data: lead, error: leadError } = await getLeadById(leadId);
  if (leadError || !lead || lead.organization_id !== orgId) {
    return { error: "Lead not found" };
  }

  if (!lead.email) {
    return { error: "Lead has no email address for GoHighLevel sync" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const qualification = (lead.metadata as Record<string, unknown>)
      ?.qualification as Record<string, unknown> | undefined;
    const temperature = qualification
      ? (qualification["temperature"] as string)
      : undefined;
    const score = lead.score || 0;

    const lookupRes = await fetch(
      `${GHL_API_BASE}/contacts/lookup?email=${encodeURIComponent(lead.email)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
        signal: controller.signal,
      },
    );

    const lookupData = (await lookupRes.json()) as {
      contacts?: Array<{ id: string }>;
    };
    const existingId = lookupData.contacts?.[0]?.id ?? null;

    const body: Record<string, unknown> = {
      email: lead.email,
      firstName: lead.first_name,
      lastName: lead.last_name,
      locationId,
    };
    if (lead.phone) body["phone"] = lead.phone;
    if (lead.company) body["companyName"] = lead.company;
    if (score > 0 || temperature) {
      body["customFields"] = {};
      if (score > 0)
        (body["customFields"] as Record<string, unknown>)["ai_score"] =
          String(score);
      if (temperature)
        (body["customFields"] as Record<string, unknown>)["lead_temperature"] =
          temperature;
    }
    if (temperature) {
      body["tags"] = ["revora", temperature.toLowerCase()];
    }

    let contactId: string;
    let created: boolean;

    if (existingId) {
      const updateRes = await fetch(`${GHL_API_BASE}/contacts/${existingId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!updateRes.ok) {
        clearTimeout(timeout);
        return { error: "GoHighLevel update failed" };
      }
      contactId = existingId;
      created = false;
    } else {
      const createRes = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!createRes.ok) {
        clearTimeout(timeout);
        return { error: "GoHighLevel create failed" };
      }
      const createData = (await createRes.json()) as {
        contact: { id: string };
      };
      contactId = createData.contact.id;
      created = true;
    }

    clearTimeout(timeout);

    const supabase = await createServiceAdminClient();
    await supabase.from("conversations").insert({
      organization_id: orgId,
      lead_id: leadId,
      type: "note",
      direction: "outbound",
      subject: "integration.gohighlevel.contact_synced",
      content: created
        ? `Contact created in GoHighLevel (${contactId})`
        : `Contact updated in GoHighLevel (${contactId})`,
      metadata: { provider: "gohighlevel", contact_id: contactId, created },
    });

    revalidatePath(`/leads/${leadId}`);

    return { error: null, contactId, created };
  } catch {
    return { error: "GoHighLevel sync failed. Please try again." };
  }
}
