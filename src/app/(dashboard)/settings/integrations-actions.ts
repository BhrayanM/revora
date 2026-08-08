"use server";

import { getCurrentOrganization } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const VALID_PROVIDERS = [
  "hubspot",
  "gohighlevel",
  "slack",
  "twilio",
  "sendgrid",
  "openai",
  "n8n",
] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

export async function getOrganizationIntegrations() {
  const org = await getCurrentOrganization();
  if (!org) return { data: null, error: "No organization found" };

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("provider, is_active, config, created_at, updated_at")
    .eq("organization_id", org.id);

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getIntegration(provider: Provider) {
  const org = await getCurrentOrganization();
  if (!org) return { data: null, error: "No organization found" };

  if (!VALID_PROVIDERS.includes(provider)) {
    return { data: null, error: `Invalid provider: ${provider}` };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("provider, is_active, config, created_at, updated_at")
    .eq("organization_id", org.id)
    .eq("provider", provider)
    .single();

  if (error) return { data: null, error: null };
  return { data, error: null };
}

export async function saveIntegration(
  provider: Provider,
  credentials: Record<string, unknown>,
) {
  const org = await getCurrentOrganization();
  if (!org) return { error: "No organization found" };
  if (!VALID_PROVIDERS.includes(provider)) {
    return { error: `Invalid provider: ${provider}` };
  }

  const supabase = await createServiceClient();
  const { error } = await supabase.from("integrations").upsert(
    {
      organization_id: org.id,
      provider,
      credentials: credentials as Record<string, unknown>,
      is_active: true,
    },
    { onConflict: "organization_id, provider" },
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteIntegration(provider: Provider) {
  const org = await getCurrentOrganization();
  if (!org) return { error: "No organization found" };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("organization_id", org.id)
    .eq("provider", provider);

  if (error) return { error: error.message };
  return { error: null };
}

export async function testIntegration(provider: Provider) {
  const org = await getCurrentOrganization();
  if (!org) return { error: "No organization found" };

  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("integrations")
    .select("credentials")
    .eq("organization_id", org.id)
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  if (!data?.credentials) {
    return { success: false, error: "Integration not configured" };
  }

  try {
    const creds = data.credentials as Record<string, unknown>;

    if (provider === "hubspot" && creds["access_token"]) {
      const res = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        {
          headers: { Authorization: `Bearer ${creds["access_token"]}` },
        },
      );
      return { success: res.ok, provider };
    }

    if (provider === "gohighlevel" && creds["api_key"]) {
      const res = await fetch(
        "https://rest.gohighlevel.com/v1/contacts/?limit=1",
        {
          headers: { Authorization: `Bearer ${creds["api_key"]}` },
        },
      );
      return { success: res.ok, provider };
    }

    if (provider === "slack" && creds["webhook_url"]) {
      const res = await fetch(creds["webhook_url"] as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "AI Growth — Integration test" }),
      });
      return { success: res.ok, provider };
    }

    return { success: false, error: `No test method for ${provider}` };
  } catch {
    return { success: false, error: "Connection test failed" };
  }
}
