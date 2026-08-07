import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export async function getIntegrationCredentials(
  organizationId: string,
  provider:
    | "hubspot"
    | "slack"
    | "twilio"
    | "gohighlevel"
    | "n8n"
    | "sendgrid"
    | "openai",
): Promise<Record<string, unknown> | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("credentials")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data.credentials as Record<string, unknown>;
}
