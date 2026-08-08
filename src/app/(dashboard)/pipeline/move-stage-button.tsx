"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";

import type { PipelineStage } from "@/lib/queries/pipelines";

import { moveLeadStage } from "./actions";

export function MoveStageButton({
  leadId,
  currentStageId,
  pipelineId,
  stages,
}: {
  leadId: string;
  currentStageId: string;
  pipelineId: string;
  stages: PipelineStage[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const availableStages = stages.filter((s) => s.id !== currentStageId);

  const handleMove = (stageId: string) => {
    startTransition(async () => {
      await moveLeadStage(leadId, stageId, pipelineId);
      setOpen(false);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg">
            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Move to stage
            </p>
            {availableStages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleMove(stage.id)}
                disabled={isPending}
                className="flex w-full items-center px-3 py-1.5 text-sm text-foreground hover:bg-surface-secondary disabled:opacity-50"
              >
                {stage.name}
              </button>
            ))}
            {availableStages.length === 0 && (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">
                No other stages available
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
