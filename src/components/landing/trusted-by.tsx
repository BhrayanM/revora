import { BrainCircuit, ChartNoAxesCombined, Workflow } from "lucide-react";

import { Container } from "@/components/ui/container";

const principles = [
  {
    icon: BrainCircuit,
    title: "Signal clarity",
    description: "Surface the information behind the next revenue decision.",
  },
  {
    icon: Workflow,
    title: "Workflow continuity",
    description:
      "Keep lead work, automation activity, and team action connected.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Operational visibility",
    description:
      "Give the team a clearer view of movement through the pipeline.",
  },
];

export function TrustedBy() {
  return (
    <section className="border-y border-border bg-surface-secondary/70 py-10">
      <Container>
        <div className="grid gap-6 sm:grid-cols-3">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <div key={principle.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {principle.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {principle.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
