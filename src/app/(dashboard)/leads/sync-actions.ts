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
  normalizeHubSpotError,
  refreshHubSpotToken,
} from "@/lib/integrations/adapters/hubspot";
import {
  getConnection,
  markConnectionError,
  markConnectionHealthy,
} from "@/lib/integrations/connections";
import { recordAuditEvent } from "@/lib/integrations/oauth";
import { getSafeIntegrationError } from "@/lib/integrations/types";
import type { IntegrationErrorCategory } from "@/lib/integrations/types";
import { getLeadById } from "@/lib/queries/leads";
import { createServiceAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Safe HubSpot error parsing
// ---------------------------------------------------------------------------

interface HubSpotErrorBody {
  status?: string;
  message?: string;
  category?: string;
  errors?: Array<{ code?: string; message?: string }>;
}

function parseHubSpotErrorBody(body: unknown): HubSpotErrorBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as HubSpotErrorBody;
}

function hubSpotSafeErrorMessage(
  status: number,
  body: HubSpotErrorBody | null,
): string {
  const errorCode = body?.errors?.[0]?.code;
  const providerMessage = body?.errors?.[0]?.message ?? body?.message;

  if (status === 400 && errorCode === "INVALID_EMAIL") {
    return `The email address is not accepted by HubSpot.`;
  }

  if (status === 400 && errorCode === "PROPERTY_DOESNT_EXIST") {
    return `A custom property is not configured in HubSpot.`;
  }

  if (status === 429) {
    return "HubSpot rate limit reached. Please try again shortly.";
  }

  const category = normalizeHubSpotError(status) as IntegrationErrorCategory;
  const safe = getSafeIntegrationError(category).userMessage;

  if (providerMessage) {
    return `${safe} (${providerMessage.substring(0, 200)})`;
  }

  return safe;
}

// ---------------------------------------------------------------------------
// Token refresh before sync
// ---------------------------------------------------------------------------

async function ensureHubSpotToken(orgId: string): Promise<{
  accessToken: string | null;
  error: string | null;
}> {
  const accessToken = await getHubSpotAccessToken(orgId);
  if (!accessToken) {
    return { accessToken: null, error: "HubSpot is not connected." };
  }

  const connection = await getConnection(orgId, "hubspot");
  if (!connection?.tokenExpiresAt) {
    return { accessToken, error: null };
  }

  const expiresAt = new Date(connection.tokenExpiresAt);
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer

  if (Date.now() + bufferMs >= expiresAt.getTime()) {
    const refresh = await refreshHubSpotToken(orgId);
    if (refresh.error) {
      await markConnectionError(orgId, "hubspot", "REFRESH_FAILED");
      return {
        accessToken: null,
        error: "HubSpot session expired. Please reconnect.",
      };
    }
    const newToken = await getHubSpotAccessToken(orgId);
    if (!newToken) {
      return { accessToken: null, error: "HubSpot token refresh failed." };
    }
    return { accessToken: newToken, error: null };
  }

  return { accessToken, error: null };
}

// ---------------------------------------------------------------------------
// Provider resource mapping
// ---------------------------------------------------------------------------

async function getHubSpotContactMapping(
  orgId: string,
  leadId: string,
): Promise<string | null> {
  const supabase = await createServiceAdminClient();
  const { data } = await supabase
    .from("provider_resource_mappings")
    .select("external_id")
    .eq("organization_id", orgId)
    .eq("provider", "hubspot")
    .eq("resource_type", "contact")
    .eq("local_id", leadId)
    .maybeSingle();
  return data?.external_id ?? null;
}

async function saveHubSpotContactMapping(
  orgId: string,
  leadId: string,
  externalId: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase.from("provider_resource_mappings").upsert(
    {
      organization_id: orgId,
      provider: "hubspot",
      resource_type: "contact",
      local_id: leadId,
      external_id: externalId,
    },
    { onConflict: "organization_id, provider, resource_type, local_id" },
  );
}

// ---------------------------------------------------------------------------
// Idempotency guard
// ---------------------------------------------------------------------------

async function checkSyncIdempotency(
  orgId: string,
  leadId: string,
): Promise<{ allowed: boolean; executionId: string | null }> {
  const supabase = await createServiceAdminClient();

  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await supabase
    .from("automation_executions")
    .update({
      status: "failed",
      error_message: "Sync timed out (stale processing)",
      completed_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .eq("provider", "hubspot")
    .eq("action", "sync_contact")
    .eq("status", "processing")
    .eq("lead_id", leadId)
    .lt("started_at", staleThreshold);

  const eventId = `lead_${leadId}_hubspot_sync_${Date.now()}`;

  const { data, error } = await supabase
    .from("automation_executions")
    .insert({
      organization_id: orgId,
      event_id: eventId,
      event_type: "integration.sync",
      provider: "hubspot",
      action: "sync_contact",
      lead_id: leadId,
      status: "processing",
      attempts: 1,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { allowed: false, executionId: null };
    }
    return { allowed: false, executionId: null };
  }

  return { allowed: true, executionId: data.id };
}

async function markSyncComplete(
  executionId: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase
    .from("automation_executions")
    .update({
      status: success ? "success" : "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage ?? null,
    })
    .eq("id", executionId);
}

// ---------------------------------------------------------------------------
// HubSpot contact sync (hardened)
// ---------------------------------------------------------------------------

export async function syncLeadToHubSpot(leadId: string) {
  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;
  const orgId = org.id;
  const profileId = authorization.data.membership.profile_id;

  const { data: lead, error: leadError } = await getLeadById(leadId);
  if (leadError || !lead || lead.organization_id !== orgId) {
    return { error: "Lead not found" };
  }

  if (!lead.email) {
    return { error: "Lead has no email address for HubSpot sync" };
  }

  const sync = await checkSyncIdempotency(orgId, leadId);
  if (!sync.allowed) {
    return { error: "A sync is already in progress for this lead." };
  }
  const executionId = sync.executionId!;

  const { accessToken, error: tokenError } = await ensureHubSpotToken(orgId);
  if (!accessToken) {
    await markSyncComplete(executionId, false, tokenError ?? undefined);
    return { error: tokenError ?? "HubSpot is not connected." };
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

    const properties: Record<string, unknown> = {
      email: lead.email,
      firstname: lead.first_name,
      lastname: lead.last_name,
    };
    if (lead.phone) properties["phone"] = lead.phone;
    if (lead.company) properties["company"] = lead.company;
    if (score > 0) properties["ai_score__c"] = String(score);
    if (temperature) properties["lead_temperature__c"] = temperature;

    let hubspotContactId: string | null = null;
    let created = false;

    const storedMapping = await getHubSpotContactMapping(orgId, leadId);

    if (storedMapping) {
      const getRes = await fetch(
        `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${storedMapping}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        },
      );

      if (getRes.ok) {
        const patchRes = await fetch(
          `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${storedMapping}`,
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

        if (patchRes.ok) {
          hubspotContactId = storedMapping;
          created = false;
        } else {
          const errorBody = parseHubSpotErrorBody(
            await patchRes.text().then((t) => {
              try {
                return JSON.parse(t);
              } catch {
                return null;
              }
            }),
          );
          const message = hubSpotSafeErrorMessage(patchRes.status, errorBody);
          clearTimeout(timeout);
          await markSyncComplete(executionId, false, message);
          await markConnectionError(
            orgId,
            "hubspot",
            normalizeHubSpotError(patchRes.status),
          );
          return { error: message };
        }
      }
    }

    if (!hubspotContactId) {
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
          const errorBody = parseHubSpotErrorBody(
            await updateRes.text().then((t) => {
              try {
                return JSON.parse(t);
              } catch {
                return null;
              }
            }),
          );
          const message = hubSpotSafeErrorMessage(updateRes.status, errorBody);
          clearTimeout(timeout);
          await markSyncComplete(executionId, false, message);
          await markConnectionError(
            orgId,
            "hubspot",
            normalizeHubSpotError(updateRes.status),
          );
          return { error: message };
        }

        hubspotContactId = existingId;
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
          const errorBody = parseHubSpotErrorBody(
            await createRes.text().then((t) => {
              try {
                return JSON.parse(t);
              } catch {
                return null;
              }
            }),
          );
          const message = hubSpotSafeErrorMessage(createRes.status, errorBody);
          clearTimeout(timeout);
          await markSyncComplete(executionId, false, message);
          await markConnectionError(
            orgId,
            "hubspot",
            normalizeHubSpotError(createRes.status),
          );
          return { error: message };
        }

        const createData = (await createRes.json()) as { id: string };
        hubspotContactId = createData.id;
        created = true;
      }
    }

    clearTimeout(timeout);

    await saveHubSpotContactMapping(orgId, leadId, hubspotContactId);

    const supabase = await createServiceAdminClient();
    await supabase.from("conversations").insert({
      organization_id: orgId,
      lead_id: leadId,
      type: "note",
      direction: "outbound",
      subject: "integration.hubspot.contact_synced",
      content: created
        ? `Contact created in HubSpot (${hubspotContactId})`
        : `Contact updated in HubSpot (${hubspotContactId})`,
      metadata: {
        provider: "hubspot",
        contact_id: hubspotContactId,
        created,
      },
    });

    await recordAuditEvent(orgId, "hubspot", "contact_synced", profileId, {
      lead_id: leadId,
      contact_id: hubspotContactId,
      created,
    });

    await markConnectionHealthy(orgId, "hubspot");
    await markSyncComplete(executionId, true);

    revalidatePath(`/leads/${leadId}`);

    return { error: null, contactId: hubspotContactId, created };
  } catch {
    const message = "HubSpot sync failed. Please try again.";
    await markSyncComplete(executionId, false, message);
    return { error: message };
  }
}

// ---------------------------------------------------------------------------
// GoHighLevel contact sync (unchanged except for safe error handling parity)
// ---------------------------------------------------------------------------

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
