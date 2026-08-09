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
  type:
    "lead_created" | "lead_updated" | "lead_stage_changed" | "lead_qualified";
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
    .select("status, score, metadata")
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
  const qualifiedLeads = data.filter((lead) => {
    const metadata = lead.metadata as Record<string, unknown>;
    return Boolean(metadata?.qualification);
  });
  const qualified = qualifiedLeads.length;
  const won = data.filter((l) => l.status === "won").length;
  const conversionRate = total > 0 ? Math.round((won / total) * 1000) / 10 : 0;
  const totalScore = qualifiedLeads.reduce((sum, lead) => sum + lead.score, 0);
  const avgScore = qualified > 0 ? Math.round(totalScore / qualified) : 0;

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

  const { data: events, error: eventsError } = await supabase
    .from("conversations")
    .select("id, lead_id, subject, content, metadata, created_at")
    .eq("organization_id", organizationId)
    .eq("type", "note")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (eventsError) {
    return {
      data: null,
      error: sanitizeError("fetch recent activity", eventsError),
    };
  }

  if (!events || events.length === 0) {
    return { data: [], error: null };
  }

  const leadIds = [...new Set(events.map((event) => event.lead_id))];
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, first_name, last_name")
    .in("id", leadIds);

  if (leadsError) {
    return {
      data: null,
      error: sanitizeError("fetch activity leads", leadsError),
    };
  }

  const leadNames = new Map(
    (leads ?? []).map((lead) => [
      lead.id,
      `${lead.first_name} ${lead.last_name}`,
    ]),
  );

  const eventDetails: Record<
    string,
    { type: RecentActivity["type"]; description: string }
  > = {
    "lead.created": { type: "lead_created", description: "was created" },
    "lead.updated": { type: "lead_updated", description: "was updated" },
    "lead.stage_changed": {
      type: "lead_stage_changed",
      description: "moved to a new pipeline stage",
    },
    "lead.qualified": {
      type: "lead_qualified",
      description: "was qualified by AI",
    },
  };

  const activities = events.flatMap((event) => {
    const metadata = event.metadata as Record<string, unknown>;
    const eventType =
      typeof metadata?.event_type === "string"
        ? metadata.event_type
        : event.subject;
    const details = eventType ? eventDetails[eventType] : undefined;
    const leadName = leadNames.get(event.lead_id) ?? null;

    if (!details || !leadName) return [];

    return [
      {
        id: event.id,
        type: details.type,
        description: `${leadName} ${details.description}`,
        leadName,
        timestamp: event.created_at,
      },
    ];
  });

  return { data: activities, error: null };
}
