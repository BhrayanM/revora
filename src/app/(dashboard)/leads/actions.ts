"use server";

import { revalidatePath } from "next/cache";

import {
  getCurrentWorkspace,
  requireCurrentOrganizationPermission,
} from "@/lib/auth";
import { createLead, deleteLead, getLeadById } from "@/lib/queries/leads";
import { getDefaultPipelineStage } from "@/lib/queries/pipelines";

function getOptionalText(formData: FormData, field: string, maxLength: number) {
  const value = formData.get(field);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function addLead(formData: FormData) {
  const authorization =
    await requireCurrentOrganizationPermission("leads.write");
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;

  const first_name = getOptionalText(formData, "first_name", 120);
  const last_name = getOptionalText(formData, "last_name", 120);
  const email = getOptionalText(formData, "email", 254).toLowerCase();
  const company = getOptionalText(formData, "company", 160);

  if (!first_name || !last_name) {
    return { error: "First name and last name are required." };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const [workspace, defaultPipeline] = await Promise.all([
    getCurrentWorkspace(),
    getDefaultPipelineStage(org.id),
  ]);

  if (!workspace || workspace.organization_id !== org.id) {
    return { error: "A workspace is required before creating a lead." };
  }

  if (!defaultPipeline.data) {
    return {
      error:
        defaultPipeline.error ??
        "A default pipeline is required before creating a lead.",
    };
  }

  const { data, error } = await createLead({
    organization_id: org.id,
    workspace_id: workspace.id,
    pipeline_id: defaultPipeline.data.pipeline.id,
    pipeline_stage_id: defaultPipeline.data.stage.id,
    first_name,
    last_name,
    email: email || null,
    company: company || null,
    source: "website",
    status: "new",
  });

  if (error) return { error };
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/pipeline");
  return { data };
}

export async function removeLead(id: string) {
  const authorization =
    await requireCurrentOrganizationPermission("leads.write");
  if (!authorization.data) return { error: authorization.error };

  const org = authorization.data.organization;

  const { data: lead, error: lookupError } = await getLeadById(id);
  if (lookupError || !lead) return { error: "Lead not found" };
  if (lead.organization_id !== org.id) return { error: "Forbidden" };

  const { error } = await deleteLead(id);
  if (error) return { error };
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/pipeline");
  return { error: null };
}
