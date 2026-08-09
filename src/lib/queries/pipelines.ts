import type { MutationResult, QueryResult } from "@/lib/queries/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PipelineRow = Database["public"]["Tables"]["pipelines"]["Row"];
type PipelineStageRow = Database["public"]["Tables"]["pipeline_stages"]["Row"];

export type Pipeline = PipelineRow;
export type PipelineStage = PipelineStageRow;

export interface DefaultPipelineStage {
  pipeline: Pipeline;
  stage: PipelineStage;
}

function sanitizeError(operation: string, error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    console.error(
      `[Queries:Pipelines] ${operation}:`,
      (error as { message: string }).message,
    );
  }
  return `Failed to ${operation}`;
}

export async function getPipelines(
  organizationId: string,
): Promise<QueryResult<Pipeline[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pipelines")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: sanitizeError("fetch pipelines", error) };
  }

  return { data, error: null };
}

export async function getPipelineStages(
  pipelineId: string,
): Promise<QueryResult<PipelineStage[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("order_index", { ascending: true });

  if (error) {
    return { data: null, error: sanitizeError("fetch pipeline stages", error) };
  }

  return { data, error: null };
}

export async function getDefaultPipelineStage(
  organizationId: string,
): Promise<QueryResult<DefaultPipelineStage>> {
  const supabase = await createClient();

  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pipelineError) {
    return {
      data: null,
      error: sanitizeError("fetch default pipeline", pipelineError),
    };
  }

  if (!pipeline) {
    return { data: null, error: "Default pipeline is not configured" };
  }

  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipeline.id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (stageError) {
    return {
      data: null,
      error: sanitizeError("fetch default pipeline stage", stageError),
    };
  }

  if (!stage) {
    return { data: null, error: "Default pipeline has no stages" };
  }

  return { data: { pipeline, stage }, error: null };
}

export async function updateLeadStage(
  leadId: string,
  pipelineStageId: string,
  pipelineId: string,
): Promise<MutationResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({
      pipeline_stage_id: pipelineStageId,
      pipeline_id: pipelineId,
    })
    .eq("id", leadId);

  if (error) {
    return { error: sanitizeError("update lead stage", error) };
  }

  return { error: null };
}
