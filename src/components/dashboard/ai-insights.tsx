import { Brain, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AIInsights({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Card className="border border-border bg-surface">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
            <Brain className="size-6 text-primary" />
          </div>
          <h4 className="mt-4 text-sm font-semibold text-foreground">
            AI Insights
          </h4>
          <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
            Insights will appear here after leads are created and qualified with
            AI. Add your first lead to get started.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            Ready to analyze
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
