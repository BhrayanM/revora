"use server";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { generateApiKey as createKey } from "@/lib/lead-ingestion/api-keys";
import { createClient } from "@/lib/supabase/server";

export async function createSourceApiKey(
  label: string,
  source: "website" | "tally" | "n8n" | "api",
) {
  const authorization =
    await requireCurrentOrganizationPermission("apiKeys.manage");
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;

  const { raw, hash } = createKey();

  const supabase = await createClient();
  const { error } = await supabase.from("source_api_keys").insert({
    organization_id: org.id,
    source,
    label,
    key_hash: hash,
    is_active: true,
  });

  if (error) return { error: error.message };

  return { data: { key: raw }, error: null };
}

export async function listSourceApiKeys() {
  const authorization =
    await requireCurrentOrganizationPermission("apiKeys.read");
  if (!authorization.data) return { data: null, error: authorization.error };

  const org = authorization.data.organization;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_api_keys")
    .select("id, source, label, is_active, last_used_at, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function revokeSourceApiKey(id: string) {
  const authorization =
    await requireCurrentOrganizationPermission("apiKeys.manage");
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;

  const supabase = await createClient();
  const { error } = await supabase
    .from("source_api_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };
  return { error: null };
}
