import "server-only";

import { decryptCredentialsObject } from "@/lib/integrations/encryption";
import { createServiceAdminClient } from "@/lib/supabase/server";

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
  const supabase = await createServiceAdminClient();

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

  const creds = data.credentials as Record<string, unknown>;
  const hasEncryptedKey = Object.keys(creds).some((k) =>
    k.startsWith("encrypted_"),
  );

  if (hasEncryptedKey) {
    return decryptCredentialsObject(creds);
  }

  return creds;
}
