"use client";

import { MoreHorizontal } from "lucide-react";
import { useId, useState, useTransition } from "react";

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
  const menuId = useId();

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
        type="button"
        onClick={() => setOpen(!open)}
        className="flex size-11 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Move lead to another stage"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 top-11 z-20 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg"
          >
            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Move to stage
            </p>
            {availableStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                role="menuitem"
                onClick={() => handleMove(stage.id)}
                disabled={isPending}
                className="flex min-h-11 w-full items-center px-3 py-1.5 text-sm text-foreground outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-50"
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
