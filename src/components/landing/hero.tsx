import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { RevoraMark } from "@/components/brand";
import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const workflowSignals = [
  {
    label: "Qualified lead",
    detail: "Scored and prioritized",
    tone: "bg-success",
  },
  {
    label: "Revenue workflow",
    detail: "Context moves with the work",
    tone: "bg-primary",
  },
  {
    label: "Team action",
    detail: "The right next step, made clear",
    tone: "bg-secondary",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
      <BackgroundPattern variant="gradient" />
      <Container className="relative">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="outline"
            size="lg"
            className="mb-6 border-border bg-surface/70 px-3.5 py-1.5 text-foreground shadow-sm"
          >
            <RevoraMark className="size-3.5" />
            Revora — AI Revenue Automation Platform
          </Badge>

          <h1 className="text-balance text-4xl font-semibold tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
            Turn every qualified signal into{" "}
            <span className="text-muted-foreground">revenue momentum.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            Revora gives revenue teams a calmer, clearer way to qualify leads,
            coordinate the next action, and keep the workflow moving forward.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/10 outline-none transition-all hover:-translate-y-0.5 hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Start building with Revora
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="#workflow"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Explore the workflow
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-success" /> Qualify and prioritize
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-success" /> Coordinate team action
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-success" /> See workflow activity
            </span>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-5xl animate-draw motion-reduce:animate-none">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface p-2 shadow-2xl shadow-black/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,color-mix(in_srgb,var(--foreground)_7%,transparent),transparent_32%)]" />
            <div className="relative overflow-hidden rounded-[1.25rem] border border-border bg-background">
              <div className="flex h-12 items-center gap-3 border-b border-border px-4">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2 rounded-full bg-foreground/20" />
                  <span className="size-2 rounded-full bg-foreground/20" />
                  <span className="size-2 rounded-full bg-foreground/20" />
                </div>
                <div className="mx-auto inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <RevoraMark className="size-3.5 text-foreground" />
                  Revenue workflow
                </div>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-6">
                <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-subtle">
                        Signal queue
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        Revenue-ready activity
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      <Sparkles className="size-3" aria-hidden="true" /> AI
                      assisted
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {workflowSignals.map((signal, index) => (
                      <div
                        key={signal.label}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/70 p-3 transition-colors hover:bg-surface-hover"
                      >
                        <span
                          className={cn(
                            "size-2.5 shrink-0 rounded-full",
                            signal.tone,
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {signal.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {signal.detail}
                          </span>
                        </span>
                        <span className="text-xs text-subtle">
                          0{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface-secondary p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-subtle">
                    Workflow status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    Focused on the next move
                  </p>
                  <div className="mt-7 flex items-end gap-2" aria-hidden="true">
                    {[32, 46, 40, 68, 56, 80, 74, 92, 86].map(
                      (height, index) => (
                        <span
                          key={height}
                          className="flex-1 rounded-sm bg-foreground/10 transition-colors duration-300 hover:bg-foreground/30"
                          style={{
                            height: height + "px",
                            opacity: 0.32 + index * 0.07,
                          }}
                        />
                      ),
                    )}
                  </div>
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">
                      A single workspace for the signal, the workflow, and the
                      team action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
