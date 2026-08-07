import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PipelineRow = Database["public"]["Tables"]["pipelines"]["Row"];
type PipelineStageRow = Database["public"]["Tables"]["pipeline_stages"]["Row"];

export type Pipeline = PipelineRow;
export type PipelineStage = PipelineStageRow;

export interface PipelinesResult {
  data: Pipeline[] | null;
  error: string | null;
}

export interface PipelineStagesResult {
  data: PipelineStage[] | null;
  error: string | null;
}

export async function getPipelines(
  organizationId: string,
): Promise<PipelinesResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pipelines")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getPipelineStages(
  pipelineId: string,
): Promise<PipelineStagesResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("order_index", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateLeadStage(
  leadId: string,
  pipelineStageId: string,
  pipelineId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({
      pipeline_stage_id: pipelineStageId,
      pipeline_id: pipelineId,
    })
    .eq("id", leadId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
