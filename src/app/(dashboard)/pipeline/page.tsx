import { MoreHorizontal, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getCurrentOrganization } from "@/lib/auth";
import { getLeads } from "@/lib/queries/leads";
import { getPipelines, getPipelineStages } from "@/lib/queries/pipelines";

const stageColors: Record<string, string> = {
  "New Lead": "border-l-primary",
  Contacted: "border-l-secondary",
  Qualified: "border-l-success",
  "Proposal Sent": "border-l-warning",
  Negotiation: "border-l-accent",
  "Closed Won": "border-l-success",
  "Closed Lost": "border-l-error",
};
const stageBgColors: Record<string, string> = {
  "New Lead": "bg-primary/5",
  Contacted: "bg-secondary/5",
  Qualified: "bg-success/5",
  "Proposal Sent": "bg-warning/5",
  Negotiation: "bg-accent/5",
  "Closed Won": "bg-success/10",
  "Closed Lost": "bg-error/5",
};

export default async function PipelinePage() {
  const org = await getCurrentOrganization();

  if (!org) {
    return (
      <Container className="max-w-none px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        </div>
        <p className="text-sm text-zinc-500">No organization found.</p>
      </Container>
    );
  }

  const { data: pipelines } = await getPipelines(org.id);
  const defaultPipeline =
    pipelines?.find((p) => p.is_default) ?? pipelines?.[0];

  if (!defaultPipeline) {
    return (
      <Container className="max-w-none px-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Visual overview of your sales pipeline.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-zinc-500">No pipeline configured.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Create a pipeline to get started.
          </p>
        </div>
      </Container>
    );
  }

  const { data: stages } = await getPipelineStages(defaultPipeline.id);
  const { data: leads } = await getLeads(org.id);

  const leadsByStage = new Map<string, typeof leads>();
  for (const lead of leads ?? []) {
    if (lead.pipeline_stage_id) {
      const existing = leadsByStage.get(lead.pipeline_stage_id) ?? [];
      existing.push(lead);
      leadsByStage.set(lead.pipeline_stage_id, existing);
    }
  }

  return (
    <Container className="max-w-none px-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">{defaultPipeline.name}</p>
        </div>
        <Button size="sm">
          <Plus className="size-3.5" /> Add Deal
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {(stages ?? []).map((stage) => {
          const stageLeads = leadsByStage.get(stage.id) ?? [];
          return (
            <div key={stage.id} className="min-w-[280px] max-w-[320px] flex-1">
              <div
                className={`mb-3 flex items-center justify-between rounded-lg border-l-2 px-3 py-2 ${stageColors[stage.name] ?? "border-l-primary"} ${stageBgColors[stage.name] ?? "bg-primary/5"}`}
              >
                <span className="text-sm font-semibold text-foreground">
                  {stage.name}
                </span>
                <Badge variant="outline" size="sm">
                  {stageLeads.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {stageLeads.map((lead) => {
                  const daysInStage = Math.floor(
                    (Date.now() - new Date(lead.updated_at).getTime()) /
                      86400000,
                  );
                  return (
                    <Card
                      key={lead.id}
                      className="cursor-pointer transition-all hover:shadow-md"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {lead.first_name} {lead.last_name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {lead.company ?? "—"}
                            </p>
                          </div>
                          <button className="text-zinc-500 hover:text-foreground">
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <Badge
                            variant={lead.score >= 80 ? "success" : "secondary"}
                            size="sm"
                          >
                            {lead.score}/100
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {daysInStage}d in stage
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
