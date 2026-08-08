import type { QueryResult } from "@/lib/queries/types";
import { createClient } from "@/lib/supabase/server";

export interface LeadMetrics {
  total: number;
  qualified: number;
  won: number;
  conversionRate: number;
  avgScore: number;
}

export interface PipelineMetrics {
  pipelineId: string;
  pipelineName: string;
  stages: { stageId: string; stageName: string; count: number }[];
}

export interface RecentActivity {
  id: string;
  type: "lead_created" | "lead_updated" | "conversation" | "automation";
  description: string;
  leadName: string | null;
  timestamp: string;
}

function sanitizeError(operation: string, error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    console.error(
      `[Queries:Analytics] ${operation}:`,
      (error as { message: string }).message,
    );
  }
  return `Failed to ${operation}`;
}

export async function getLeadMetrics(
  organizationId: string,
): Promise<QueryResult<LeadMetrics>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("status, score")
    .eq("organization_id", organizationId);

  if (error) {
    return { data: null, error: sanitizeError("fetch lead metrics", error) };
  }

  if (!data || data.length === 0) {
    return {
      data: { total: 0, qualified: 0, won: 0, conversionRate: 0, avgScore: 0 },
      error: null,
    };
  }

  const total = data.length;
  const qualified = data.filter(
    (l) =>
      l.status === "qualified" ||
      l.status === "proposal" ||
      l.status === "negotiation" ||
      l.status === "won",
  ).length;
  const won = data.filter((l) => l.status === "won").length;
  const conversionRate = total > 0 ? Math.round((won / total) * 1000) / 10 : 0;
  const totalScore = data.reduce((sum, l) => sum + l.score, 0);
  const avgScore = total > 0 ? Math.round(totalScore / total) : 0;

  return {
    data: { total, qualified, won, conversionRate, avgScore },
    error: null,
  };
}

export async function getPipelineMetrics(
  organizationId: string,
): Promise<QueryResult<PipelineMetrics | null>> {
  const supabase = await createClient();

  const { data: pipelines, error: pipelineError } = await supabase
    .from("pipelines")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .limit(1);

  if (pipelineError) {
    return {
      data: null,
      error: sanitizeError("fetch pipeline metrics", pipelineError),
    };
  }

  if (!pipelines || pipelines.length === 0) {
    return { data: null, error: null };
  }

  const pipeline = pipelines[0]!;

  const [stagesResult, leadCountsResult] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name")
      .eq("pipeline_id", pipeline.id)
      .order("order_index", { ascending: true }),
    supabase
      .from("leads")
      .select("pipeline_stage_id")
      .eq("organization_id", organizationId),
  ]);

  if (stagesResult.error) {
    return {
      data: null,
      error: sanitizeError("fetch stages", stagesResult.error),
    };
  }

  if (leadCountsResult.error) {
    return {
      data: null,
      error: sanitizeError("fetch lead counts", leadCountsResult.error),
    };
  }

  const stages = stagesResult.data ?? [];
  const leadCounts = leadCountsResult.data ?? [];

  if (stages.length === 0) {
    return {
      data: {
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        stages: [],
      },
      error: null,
    };
  }

  const stageIds = stages.map((s) => s.id);
  const countByStage = new Map<string, number>();
  for (const lead of leadCounts) {
    if (lead.pipeline_stage_id && stageIds.includes(lead.pipeline_stage_id)) {
      countByStage.set(
        lead.pipeline_stage_id,
        (countByStage.get(lead.pipeline_stage_id) ?? 0) + 1,
      );
    }
  }

  return {
    data: {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stages: stages.map((s) => ({
        stageId: s.id,
        stageName: s.name,
        count: countByStage.get(s.id) ?? 0,
      })),
    },
    error: null,
  };
}

export async function getRecentActivity(
  organizationId: string,
  limit = 10,
): Promise<QueryResult<RecentActivity[]>> {
  const supabase = await createClient();

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, first_name, last_name, created_at, updated_at, status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (leadsError) {
    return {
      data: null,
      error: sanitizeError("fetch recent activity", leadsError),
    };
  }

  if (!leads || leads.length === 0) {
    return { data: [], error: null };
  }

  const activities: RecentActivity[] = [];

  for (const lead of leads) {
    activities.push({
      id: `lead-created-${lead.id}`,
      type: "lead_created",
      description: `${lead.first_name} ${lead.last_name} was created`,
      leadName: `${lead.first_name} ${lead.last_name}`,
      timestamp: lead.created_at,
    });

    if (lead.status !== "new" && lead.updated_at !== lead.created_at) {
      activities.push({
        id: `lead-updated-${lead.id}`,
        type: "lead_updated",
        description: `${lead.first_name} ${lead.last_name} moved to ${lead.status}`,
        leadName: `${lead.first_name} ${lead.last_name}`,
        timestamp: lead.updated_at,
      });
    }
  }

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return { data: activities.slice(0, limit), error: null };
}
