"use server";

import { revalidatePath } from "next/cache";

import { updateLeadStage } from "@/lib/queries/pipelines";

export async function moveLeadStage(
  leadId: string,
  pipelineStageId: string,
  pipelineId: string,
) {
  const { error } = await updateLeadStage(leadId, pipelineStageId, pipelineId);
  if (error) return { error };
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { error: null };
}
