"use server";

import { revalidatePath } from "next/cache";

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

  revalidatePath("/settings");
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

  revalidatePath("/settings");
  return { error: null };
}
