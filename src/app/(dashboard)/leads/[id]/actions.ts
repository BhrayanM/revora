"use server";

import { revalidatePath } from "next/cache";

import { getSafeAIErrorMessage } from "@/lib/ai/errors";
import { qualifyLead } from "@/lib/ai/lead-qualification";

export async function aiQualifyLead(leadId: string) {
  try {
    const result = await qualifyLead(leadId);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/pipeline");
    return { data: result, error: null };
  } catch (err) {
    const message =
      err instanceof Error &&
      (err.message === "Lead not found" ||
        err.message === "You do not have permission for this action" ||
        err.message === "No active organization membership found" ||
        err.message.startsWith("A qualification is already running") ||
        err.message.startsWith("Unable to start AI qualification"))
        ? err.message
        : getSafeAIErrorMessage(err);
    return { data: null, error: message };
  }
}
