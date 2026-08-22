"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { validateWorkspaceSettings } from "@/lib/product-ux/preferences";
import { createClient } from "@/lib/supabase/server";

export async function updateOrgSettings(formData: FormData) {
  const authorization = await requireCurrentOrganizationPermission(
    "organization.settings.manage",
  );
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;

  const supabase = await createClient();

  const currentSettings = (org.settings as Record<string, unknown>) ?? {};
  const validation = validateWorkspaceSettings({
    organizationName: formData.get("org_name"),
    website: formData.get("website"),
    contactEmail: formData.get("email"),
    language: formData.get("language"),
    timezone: formData.get("timezone"),
  });

  if (!validation.ok) {
    return {
      error: validation.error,
      fieldErrors: validation.fieldErrors,
    };
  }

  const newSettings = {
    ...currentSettings,
    org_name: validation.value.organizationName,
    website: validation.value.website,
    timezone: validation.value.timezone,
    language: validation.value.language,
    email: validation.value.contactEmail,
  };

  const { error } = await supabase
    .from("organizations")
    .update({ name: newSettings.org_name as string, settings: newSettings })
    .eq("id", org.id);

  if (error) {
    console.error(
      "[Settings] Failed to update organization settings:",
      error.message,
    );
    return { error: "Unable to save workspace settings." };
  }

  revalidatePath("/settings");
  return { error: null, fieldErrors: {} };
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

  // Send current_password for validation. Supabase validates it when
  // "Require current password when changing password" is enabled in the
  // Supabase Dashboard. If that setting is OFF, current_password is ignored.
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  });

  if (updateError) return { error: updateError.message };
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
    return { error: null, redirect: "/login" };
  }

  return { error: null };
}
