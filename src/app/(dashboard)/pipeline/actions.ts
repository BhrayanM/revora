"use server";

import { revalidatePath } from "next/cache";

import { getCurrentOrganization } from "@/lib/auth";
import { getLeadById } from "@/lib/queries/leads";
import { getPipelines, updateLeadStage } from "@/lib/queries/pipelines";

export async function moveLeadStage(
  leadId: string,
  pipelineStageId: string,
  pipelineId: string,
) {
  const org = await getCurrentOrganization();
  if (!org) return { error: "Unauthorized" };

  const { data: lead, error: leadError } = await getLeadById(leadId);
  if (leadError || !lead) return { error: "Lead not found" };
  if (lead.organization_id !== org.id) return { error: "Forbidden" };

  const { data: pipelines } = await getPipelines(org.id);
  const pipeline = pipelines?.find((p) => p.id === pipelineId);
  if (!pipeline || pipeline.organization_id !== org.id) {
    return { error: "Invalid pipeline" };
  }

  const { error } = await updateLeadStage(leadId, pipelineStageId, pipelineId);
  if (error) return { error: "Failed to move lead" };
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { error: null };
}
