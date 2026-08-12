"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import {
  ensureGHLToken,
  GHL_API_BASE,
  ghlSafeErrorMessage,
  normalizeGHLError,
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
import {
  buildGHLCreateContactPayload,
  buildGHLUpdateContactPayload,
  type GHLContactPayloadSource,
} from "@/lib/integrations/gohighlevel-contact-payloads";
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

async function getProviderContactMapping(
  orgId: string,
  provider: string,
  leadId: string,
): Promise<string | null> {
  const supabase = await createServiceAdminClient();
  const { data } = await supabase
    .from("provider_resource_mappings")
    .select("external_id")
    .eq("organization_id", orgId)
    .eq("provider", provider)
    .eq("resource_type", "contact")
    .eq("local_id", leadId)
    .maybeSingle();
  return data?.external_id ?? null;
}

async function saveProviderContactMapping(
  orgId: string,
  provider: string,
  leadId: string,
  externalId: string,
): Promise<void> {
  const supabase = await createServiceAdminClient();
  await supabase.from("provider_resource_mappings").upsert(
    {
      organization_id: orgId,
      provider,
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
  provider: string,
  action: string,
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
    .eq("provider", provider)
    .eq("action", action)
    .eq("status", "processing")
    .eq("lead_id", leadId)
    .lt("started_at", staleThreshold);

  const eventId = `lead_${leadId}_${provider}_sync_${Date.now()}`;

  const { data, error } = await supabase
    .from("automation_executions")
    .insert({
      organization_id: orgId,
      event_id: eventId,
      event_type: "integration.sync",
      provider,
      action,
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

  const sync = await checkSyncIdempotency(
    orgId,
    leadId,
    "hubspot",
    "sync_contact",
  );
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

    const storedMapping = await getProviderContactMapping(
      orgId,
      "hubspot",
      leadId,
    );

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

    await saveProviderContactMapping(
      orgId,
      "hubspot",
      leadId,
      hubspotContactId,
    );

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
// GoHighLevel contact sync (hardened — idempotency, audit, health, mappings, errors)
// ---------------------------------------------------------------------------

export async function syncLeadToGoHighLevel(leadId: string) {
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
    return { error: "Lead has no email address for GoHighLevel sync" };
  }

  const sync = await checkSyncIdempotency(
    orgId,
    leadId,
    "gohighlevel",
    "sync_contact",
  );
  if (!sync.allowed) {
    return { error: "A sync is already in progress for this lead." };
  }
  const executionId = sync.executionId!;

  const {
    accessToken,
    locationId,
    error: tokenError,
  } = await ensureGHLToken(orgId);
  if (!accessToken || !locationId) {
    await markSyncComplete(executionId, false, tokenError ?? undefined);
    return { error: tokenError ?? "GoHighLevel is not connected." };
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
    const contactPayloadSource: GHLContactPayloadSource = {
      email: lead.email,
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      companyName: lead.company,
      score,
      temperature,
    };

    let ghlContactId: string | null = null;
    let created = false;

    const storedMapping = await getProviderContactMapping(
      orgId,
      "gohighlevel",
      leadId,
    );

    if (storedMapping) {
      const getRes = await fetch(`${GHL_API_BASE}/contacts/${storedMapping}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
        signal: controller.signal,
      });

      if (getRes.ok) {
        const updateBody = buildGHLUpdateContactPayload(contactPayloadSource);

        const updateRes = await fetch(
          `${GHL_API_BASE}/contacts/${storedMapping}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Version: "2021-07-28",
            },
            body: JSON.stringify(updateBody),
            signal: controller.signal,
          },
        );

        if (updateRes.ok) {
          ghlContactId = storedMapping;
          created = false;
        } else {
          const errorText = await updateRes.text();
          let errorBody: unknown = errorText;
          try {
            errorBody = JSON.parse(errorText);
          } catch {
            /* not JSON */
          }
          const message = ghlSafeErrorMessage(updateRes.status, errorBody);
          clearTimeout(timeout);
          await markSyncComplete(executionId, false, message);
          await markConnectionError(
            orgId,
            "gohighlevel",
            normalizeGHLError(updateRes.status),
          );
          return { error: message };
        }
      } else if (getRes.status !== 404) {
        const errorText = await getRes.text();
        let errorBody: unknown = errorText;
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          /* not JSON */
        }
        const message = ghlSafeErrorMessage(getRes.status, errorBody);
        clearTimeout(timeout);
        await markSyncComplete(executionId, false, message);
        await markConnectionError(
          orgId,
          "gohighlevel",
          normalizeGHLError(getRes.status),
        );
        return { error: message };
      }
    }

    if (!ghlContactId) {
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

      const lookupText = await lookupRes.text();
      let lookupBody: unknown = lookupText;
      try {
        lookupBody = JSON.parse(lookupText);
      } catch {
        /* not JSON */
      }

      if (!lookupRes.ok) {
        const message = ghlSafeErrorMessage(lookupRes.status, lookupBody);
        clearTimeout(timeout);
        await markSyncComplete(executionId, false, message);
        await markConnectionError(
          orgId,
          "gohighlevel",
          normalizeGHLError(lookupRes.status),
        );
        return { error: message };
      }

      const lookupData = lookupBody as {
        contacts?: Array<{ id: string }>;
      };
      const existingId = lookupData.contacts?.[0]?.id ?? null;

      if (existingId) {
        const updateBody = buildGHLUpdateContactPayload(contactPayloadSource);

        const updateRes = await fetch(
          `${GHL_API_BASE}/contacts/${existingId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Version: "2021-07-28",
            },
            body: JSON.stringify(updateBody),
            signal: controller.signal,
          },
        );

        if (!updateRes.ok) {
          const errorText = await updateRes.text();
          let errorBody: unknown = errorText;
          try {
            errorBody = JSON.parse(errorText);
          } catch {
            /* not JSON */
          }
          const message = ghlSafeErrorMessage(updateRes.status, errorBody);
          clearTimeout(timeout);
          await markSyncComplete(executionId, false, message);
          await markConnectionError(
            orgId,
            "gohighlevel",
            normalizeGHLError(updateRes.status),
          );
          return { error: message };
        }

        ghlContactId = existingId;
        created = false;
      } else {
        const createBody = buildGHLCreateContactPayload(
          contactPayloadSource,
          locationId,
        );

        const createRes = await fetch(`${GHL_API_BASE}/contacts/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify(createBody),
          signal: controller.signal,
        });

        if (!createRes.ok) {
          const errorText = await createRes.text();
          let errorBody: unknown = errorText;
          try {
            errorBody = JSON.parse(errorText);
          } catch {
            /* not JSON */
          }
          const message = ghlSafeErrorMessage(createRes.status, errorBody);
          clearTimeout(timeout);
          await markSyncComplete(executionId, false, message);
          await markConnectionError(
            orgId,
            "gohighlevel",
            normalizeGHLError(createRes.status),
          );
          return { error: message };
        }

        const createData = (await createRes.json()) as {
          contact: { id: string };
        };
        ghlContactId = createData.contact.id;
        created = true;
      }
    }

    clearTimeout(timeout);

    await saveProviderContactMapping(
      orgId,
      "gohighlevel",
      leadId,
      ghlContactId,
    );

    const supabase = await createServiceAdminClient();
    await supabase.from("conversations").insert({
      organization_id: orgId,
      lead_id: leadId,
      type: "note",
      direction: "outbound",
      subject: "integration.gohighlevel.contact_synced",
      content: created
        ? `Contact created in GoHighLevel (${ghlContactId})`
        : `Contact updated in GoHighLevel (${ghlContactId})`,
      metadata: {
        provider: "gohighlevel",
        contact_id: ghlContactId,
        created,
      },
    });

    await recordAuditEvent(orgId, "gohighlevel", "contact_synced", profileId, {
      lead_id: leadId,
      contact_id: ghlContactId,
      created,
    });

    await markConnectionHealthy(orgId, "gohighlevel");
    await markSyncComplete(executionId, true);

    revalidatePath(`/leads/${leadId}`);

    return { error: null, contactId: ghlContactId, created };
  } catch {
    const message = "GoHighLevel sync failed. Please try again.";
    await markSyncComplete(executionId, false, message);
    return { error: message };
  }
}
