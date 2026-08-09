import { Layers, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getCurrentOrganization } from "@/lib/auth";
import { getLeads } from "@/lib/queries/leads";
import { getPipelines, getPipelineStages } from "@/lib/queries/pipelines";

import { MoveStageButton } from "./move-stage-button";

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
        <p className="text-sm text-muted-foreground">No organization found.</p>
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
            <p className="mt-1 text-sm text-muted-foreground">
              Visual overview of your sales pipeline.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Layers className="size-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-foreground">
            Default pipeline unavailable
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
            Your organization needs a default pipeline before leads can be
            created. Contact an organization administrator.
          </p>
          <Link
            href="/leads"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary-600"
          >
            <Plus className="size-3.5" /> Add Your First Lead
          </Link>
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
          <p className="mt-1 text-sm text-muted-foreground">
            {defaultPipeline.name}
          </p>
        </div>
        <Link
          href="/leads"
          className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary-600 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          <Plus className="size-3.5" /> Add Lead
        </Link>
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
                            <p className="text-xs text-muted-foreground">
                              {lead.company ?? "—"}
                            </p>
                          </div>
                          <MoveStageButton
                            leadId={lead.id}
                            currentStageId={lead.pipeline_stage_id ?? ""}
                            pipelineId={defaultPipeline.id}
                            stages={stages ?? []}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          {(lead.metadata as Record<string, unknown>)
                            .qualification ? (
                            <Badge
                              variant={
                                lead.score >= 80 ? "success" : "secondary"
                              }
                              size="sm"
                            >
                              {lead.score}/100
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not qualified
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
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
