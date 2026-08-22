"use server";

import { revalidatePath } from "next/cache";

import { hasCurrentLegalConsent } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await hasCurrentLegalConsent(supabase, user.id))) {
    return { error: "Current legal consent is required" };
  }

  const rawName = formData.get("full_name");
  const full_name = typeof rawName === "string" ? rawName.trim() : "";
  if (
    !full_name ||
    full_name.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(full_name)
  ) {
    return { error: "Enter a valid name." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name })
    .eq("id", user.id);

  if (error) {
    console.error("[Profile] Update failed:", error.message);
    return { error: "Unable to update profile." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function changeEmail(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await hasCurrentLegalConsent(supabase, user.id))) {
    return { error: "Current legal consent is required" };
  }

  const newEmail = (formData.get("new_email") as string)?.trim().toLowerCase();
  if (!newEmail) return { error: "Email is required" };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 254) {
    return { error: "Invalid email format" };
  }

  if (user.email === newEmail) {
    return { error: "New email is the same as your current email" };
  }

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/email-change`,
    },
  );

  if (error) {
    console.error("[Profile] Email update failed:", error.message);
    return { error: "Unable to start the email change." };
  }

  return { error: null };
}
