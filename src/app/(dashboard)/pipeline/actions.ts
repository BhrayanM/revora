"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { getLeadById } from "@/lib/queries/leads";
import {
  getPipelineStages,
  getPipelines,
  updateLeadStage,
} from "@/lib/queries/pipelines";

export async function moveLeadStage(
  leadId: string,
  pipelineStageId: string,
  pipelineId: string,
) {
  const authorization =
    await requireCurrentOrganizationPermission("leads.write");
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;

  const { data: lead, error: leadError } = await getLeadById(leadId);
  if (leadError || !lead) return { error: "Lead not found" };
  if (lead.organization_id !== org.id) return { error: "Forbidden" };

  const { data: pipelines } = await getPipelines(org.id);
  const pipeline = pipelines?.find((p) => p.id === pipelineId);
  if (!pipeline || pipeline.organization_id !== org.id) {
    return { error: "Invalid pipeline" };
  }

  const { data: stages } = await getPipelineStages(pipelineId);
  if (!stages?.some((stage) => stage.id === pipelineStageId)) {
    return { error: "Invalid pipeline stage" };
  }

  const { error } = await updateLeadStage(leadId, pipelineStageId, pipelineId);
  if (error) return { error: "Failed to move lead" };
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { error: null };
}
