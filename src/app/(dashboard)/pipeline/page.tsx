import { MoreHorizontal, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const stages = [
  {
    name: "New Leads",
    count: 12,
    color: "border-l-primary",
    bgColor: "bg-primary/5",
    leads: [
      { name: "Alex Thompson", company: "DataFlow", score: 72, days: 0 },
      { name: "Rachel Kim", company: "CloudScale", score: 65, days: 1 },
      { name: "Tom Baker", company: "NeuralAI", score: 58, days: 0 },
    ],
  },
  {
    name: "Contacted",
    count: 8,
    color: "border-l-secondary",
    bgColor: "bg-secondary/5",
    leads: [
      { name: "James Wilson", company: "FinEdge", score: 78, days: 3 },
      { name: "Lisa Chang", company: "GrowthLabs", score: 70, days: 2 },
    ],
  },
  {
    name: "Qualified",
    count: 5,
    color: "border-l-success",
    bgColor: "bg-success/5",
    leads: [
      { name: "Sarah Johnson", company: "TechCorp", score: 85, days: 5 },
      { name: "Marcus Lee", company: "GrowthLabs", score: 82, days: 6 },
    ],
  },
  {
    name: "Proposal",
    count: 3,
    color: "border-l-warning",
    bgColor: "bg-warning/5",
    leads: [
      { name: "Elena Martinez", company: "FinEdge", score: 88, days: 12 },
    ],
  },
  {
    name: "Won",
    count: 4,
    color: "border-l-success",
    bgColor: "bg-success/10",
    leads: [
      { name: "David Park", company: "TechFlow", score: 92, days: 28 },
      { name: "Priya Patel", company: "CloudScale", score: 90, days: 35 },
    ],
  },
];

export default function PipelinePage() {
  return (
    <Container className="max-w-none px-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Visual overview of your sales pipeline.
          </p>
        </div>
        <Button size="sm">
          <Plus className="size-3.5" />
          Add Deal
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.name} className="min-w-[280px] max-w-[320px] flex-1">
            <div
              className={`mb-3 flex items-center justify-between rounded-lg ${stage.bgColor} px-3 py-2 border-l-2 ${stage.color}`}
            >
              <span className="text-sm font-semibold text-foreground">
                {stage.name}
              </span>
              <Badge variant="outline" size="sm">
                {stage.count}
              </Badge>
            </div>
            <div className="space-y-2">
              {stage.leads.map((lead) => (
                <Card
                  key={lead.name}
                  className="cursor-pointer transition-all hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {lead.name}
                        </p>
                        <p className="text-xs text-zinc-500">{lead.company}</p>
                      </div>
                      <button className="text-zinc-400 hover:text-foreground">
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
                      <span className="text-xs text-zinc-400">
                        {lead.days}d in stage
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
