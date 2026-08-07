"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOrganization } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateOrgSettings(formData: FormData) {
  const org = await getCurrentOrganization();
  if (!org) return { error: "No organization found" };

  const supabase = await createClient();

  const currentSettings = (org.settings as Record<string, unknown>) ?? {};

  const newSettings = {
    ...currentSettings,
    org_name: (formData.get("org_name") as string) || org.name,
    website: formData.get("website") as string,
    timezone: formData.get("timezone") as string,
    language: formData.get("language") as string,
    email: formData.get("email") as string,
  };

  const { error } = await supabase
    .from("organizations")
    .update({ name: newSettings.org_name as string, settings: newSettings })
    .eq("id", org.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}
