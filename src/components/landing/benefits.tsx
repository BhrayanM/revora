import { ArrowUpRight, Clock3, Focus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

const benefits = [
  {
    icon: Focus,
    title: "Prioritize with context",
    description:
      "Bring lead signals, qualification detail, and pipeline status into a focused working view.",
  },
  {
    icon: Clock3,
    title: "Keep motion visible",
    description:
      "Make it easier to see what has happened, what is underway, and what needs a decision.",
  },
  {
    icon: ArrowUpRight,
    title: "Move from signal to action",
    description:
      "Coordinate next steps across your revenue workflow instead of losing context between tools.",
  },
  {
    icon: ShieldCheck,
    title: "Work with confidence",
    description:
      "Organization-aware access and role-based controls keep sensitive work scoped to the right team.",
  },
];

export function Benefits() {
  return (
    <section className="border-y border-border bg-surface-secondary/60 py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-border bg-surface text-foreground"
          >
            Why Revora
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Built for the operating rhythm of a revenue team.
          </h2>
        </div>
        <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title}>
                <span className="flex size-11 items-center justify-center rounded-2xl border border-border bg-surface text-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
