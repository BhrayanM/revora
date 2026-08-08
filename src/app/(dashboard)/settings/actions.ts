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

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (newPassword.length < 10) {
    return { error: "Password must be at least 10 characters" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" };
  }

  if (currentPassword === newPassword) {
    return { error: "New password must be different from current password" };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { error: null };
}

export async function signOutSessions(scope: "others" | "global") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.auth.signOut({ scope });
  if (error) return { error: error.message };

  if (scope === "global") {
    // Server redirect handled client-side after action
    return { error: null, redirect: "/login" };
  }

  return { error: null };
}
