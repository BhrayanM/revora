import { Brain, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const insights = [
  {
    id: "1",
    title: "High-Intent Leads Detected",
    description:
      "12 leads from the last 24 hours show buying intent above 85%. Prioritize outreach to these contacts.",
    icon: TrendingUp,
    color: "text-success",
    bgColor: "bg-success/5 border-success/20",
  },
  {
    id: "2",
    title: "Optimal Send Time",
    description:
      "AI analysis shows emails sent between 10am-11am EST have a 34% higher open rate for your audience.",
    icon: Sparkles,
    color: "text-primary",
    bgColor: "bg-primary/5 border-primary/20",
  },
  {
    id: "3",
    title: "Pipeline Bottleneck",
    description:
      "Leads are stalling at the Proposal stage (avg 4.2 days). Consider automated follow-up sequences.",
    icon: Brain,
    color: "text-warning",
    bgColor: "bg-warning/5 border-warning/20",
  },
];

export function AIInsights({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {insights.map((insight) => (
        <Card key={insight.id} className={cn("border", insight.bgColor)}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <insight.icon
                className={cn("size-5 shrink-0 mt-0.5", insight.color)}
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-foreground">
                  {insight.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-600">
                  {insight.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" className="w-full">
        View All Insights →
      </Button>
    </div>
  );
}
