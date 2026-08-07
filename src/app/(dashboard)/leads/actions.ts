"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOrganization } from "@/lib/auth";
import { createLead, deleteLead } from "@/lib/queries/leads";

export async function addLead(formData: FormData) {
  const org = await getCurrentOrganization();
  if (!org) return { error: "No organization found" };

  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;

  if (!first_name || !last_name) {
    return { error: "First name and last name are required" };
  }

  const { data, error } = await createLead({
    organization_id: org.id,
    first_name,
    last_name,
    email: email || null,
    company: company || null,
    source: "website",
    status: "new",
    score: 50,
  });

  if (error) return { error };
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  return { data };
}

export async function removeLead(id: string) {
  const { error } = await deleteLead(id);
  if (error) return { error };
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { error: null };
}
