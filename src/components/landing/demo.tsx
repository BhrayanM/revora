import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ListChecks,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

const signals = [
  {
    label: "Signal captured",
    detail: "Lead context is ready for review",
    icon: ListChecks,
  },
  {
    label: "Priority clarified",
    detail: "Qualification information is visible",
    icon: BrainCircuit,
  },
  {
    label: "Next action coordinated",
    detail: "Workflow activity stays connected",
    icon: Workflow,
  },
];

export function Demo() {
  return (
    <section className="relative py-24 sm:py-32">
      <BackgroundPattern variant="gradient" />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <Badge
              variant="outline"
              className="mb-4 border-border bg-surface/70 text-foreground"
            >
              A clearer operating view
            </Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
              Keep the signal, the decision, and the next action together.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Revora is designed to make the revenue workflow easier to follow
              without adding another disconnected dashboard.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Lead and pipeline context in one workspace",
                "Qualification detail that supports prioritization",
                "Automation activity visible alongside the work",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Start building
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-6 rounded-[2rem] bg-foreground/[0.04] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative rounded-[1.5rem] border border-border bg-surface p-3 shadow-xl shadow-black/10">
              <div className="rounded-[1.1rem] border border-border bg-background p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                      Revenue workflow
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      Working signal
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    In progress
                  </span>
                </div>
                <div className="mt-7 space-y-3">
                  {signals.map((signal, index) => {
                    const Icon = signal.icon;
                    return (
                      <div
                        key={signal.label}
                        className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-canvas">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {signal.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {signal.detail}
                          </span>
                        </span>
                        <span className="text-xs font-medium text-subtle">
                          0{index + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
