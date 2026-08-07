"use server";

import { revalidatePath } from "next/cache";

import { qualifyLead } from "@/lib/ai/lead-qualification";

export async function aiQualifyLead(leadId: string) {
  try {
    const result = await qualifyLead(leadId);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/dashboard");
    return { data: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Qualification failed";
    return { data: null, error: message };
  }
}
