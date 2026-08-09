import { createHash } from "crypto";

import { type NextRequest, NextResponse } from "next/server";

import { hashApiKey } from "@/lib/lead-ingestion/api-keys";
import { normalizeLead } from "@/lib/lead-ingestion/normalize";
import { checkRateLimit } from "@/lib/lead-ingestion/rate-limit";
import { validateInboundPayload } from "@/lib/lead-ingestion/validate";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { emitLeadEventReliable } from "@/lib/webhooks/reliable-emit";

type LeadSource = Database["public"]["Tables"]["leads"]["Insert"]["source"];

function mapSource(keySource: "website" | "tally" | "n8n" | "api"): LeadSource {
  const mapping: Record<string, LeadSource> = {
    website: "website",
    tally: "other",
    n8n: "other",
    api: "other",
  };
  return mapping[keySource] ?? "other";
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limitKey = `leads-api:${ip}`;
  const rateLimit = checkRateLimit(limitKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !apiKey.startsWith("ag_live_")) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data: payload, error: validationError } =
    validateInboundPayload(body);
  if (validationError || !payload) {
    return NextResponse.json(
      { error: validationError ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const keyHash = hashApiKey(apiKey);
  const supabase = await createServiceClient();

  const { data: sourceKey, error: keyError } = await supabase
    .from("source_api_keys")
    .select("organization_id, source")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (keyError || !sourceKey) {
    return NextResponse.json(
      { error: "Invalid or inactive API key" },
      { status: 401 },
    );
  }

  const keySource = sourceKey.source as "website" | "tally" | "n8n" | "api";
  const orgId = sourceKey.organization_id;
  const leadSource = mapSource(keySource);

  const normalized = normalizeLead(payload, keySource);

  if (normalized.source_external_id) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id, status")
      .eq("organization_id", orgId)
      .eq("source_external_id", normalized.source_external_id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("source_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_hash", keyHash);

      return NextResponse.json(
        {
          success: true,
          lead: { id: existing.id, status: existing.status },
          qualification: { status: "not_started" },
        },
        { status: 200 },
      );
    }
  }

  const [{ data: workspace }, { data: pipeline }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pipelines")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_default", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!workspace || !pipeline) {
    console.error("[Leads API] Organization CRM defaults are not configured");
    return NextResponse.json(
      { error: "Organization CRM defaults are not configured" },
      { status: 409 },
    );
  }

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("pipeline_id", pipeline.id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!stage) {
    console.error("[Leads API] Default pipeline has no stages");
    return NextResponse.json(
      { error: "Organization CRM defaults are not configured" },
      { status: 409 },
    );
  }

  const insertPayload: Database["public"]["Tables"]["leads"]["Insert"] = {
    organization_id: orgId,
    workspace_id: workspace.id,
    pipeline_id: pipeline.id,
    pipeline_stage_id: stage.id,
    first_name: normalized.first_name,
    last_name: normalized.last_name,
    email: normalized.email,
    phone: normalized.phone,
    company: normalized.company,
    source: leadSource,
    source_external_id: normalized.source_external_id,
    status: "new",
    score: 0,
    metadata: {
      ...normalized.metadata,
      message: normalized.message,
      ingested_via: keySource,
      ingested_at: new Date().toISOString(),
    },
  };

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select("id, status, first_name, last_name, email, phone, company, score")
    .single();

  if (insertError || !lead) {
    console.error("[Leads API] Insert failed:", insertError);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 },
    );
  }

  await supabase
    .from("source_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

  const eventId = createHash("sha256")
    .update(`lead.created:${lead.id}:${Date.now()}`)
    .digest("hex")
    .slice(0, 16);

  emitLeadEventReliable(
    {
      event: "lead.created",
      version: 1,
      event_id: eventId,
      timestamp: new Date().toISOString(),
      organization_id: orgId,
      source: keySource,
      lead: {
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: keySource,
        source_external_id: normalized.source_external_id,
        message: normalized.message,
        status: lead.status,
        score: lead.score,
      },
    },
    orgId,
    lead.id,
  ).catch((err) => {
    console.error("[Webhook] emitLeadEvent failed:", err);
  });

  return NextResponse.json(
    {
      success: true,
      lead: { id: lead.id, status: lead.status },
      qualification: { status: "not_started" },
    },
    { status: 201 },
  );
}
