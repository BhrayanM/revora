import { Brain, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function AIInsights({
  className,
  qualifiedCount,
}: {
  className?: string;
  qualifiedCount: number;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-transparent",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)_0%,_transparent_60%)] opacity-[0.04]" />
      <div className="relative flex flex-col items-center px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-sm shadow-primary/10">
          <Brain className="size-7 text-primary" />
        </div>
        <h4 className="mt-4 text-sm font-semibold text-foreground">
          AI Qualification
        </h4>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          {qualifiedCount > 0
            ? `${qualifiedCount} lead${qualifiedCount === 1 ? " has" : "s have"} persisted AI qualification results. Review each lead for signals, risks, and next actions.`
            : "Qualify a lead to store its score, signals, risks, and recommended next action."}
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3" />
          {qualifiedCount > 0 ? "Results available" : "Ready to qualify"}
        </div>
      </div>
    </div>
  );
}
