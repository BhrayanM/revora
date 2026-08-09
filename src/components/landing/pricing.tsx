import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const paths = [
  {
    title: "Start focused",
    description:
      "Build a clear foundation for lead qualification and revenue workflow visibility.",
    items: [
      "Lead and pipeline workspace",
      "AI qualification context",
      "Workflow activity",
    ],
  },
  {
    title: "Scale the motion",
    description:
      "Connect the team and the operating detail behind a growing revenue process.",
    items: [
      "Organization-aware collaboration",
      "Integration configuration",
      "Operational insights",
    ],
    featured: true,
  },
  {
    title: "Govern the system",
    description:
      "Bring more people, responsibilities, and sensitive operating decisions into one workspace.",
    items: [
      "Role-aware access",
      "Team management controls",
      "Security settings",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-border bg-surface text-foreground"
          >
            Built to grow with the workflow
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Start with the revenue motion you need today.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Create a workspace and shape Revora around the way your team works.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {paths.map((path) => (
            <Card
              key={path.title}
              className={
                path.featured
                  ? "border-border-strong bg-surface-elevated shadow-lg shadow-black/5"
                  : ""
              }
            >
              <CardContent className="flex h-full flex-col p-7">
                {path.featured && (
                  <Badge
                    variant="outline"
                    size="sm"
                    className="w-fit border-border bg-surface-secondary text-foreground"
                  >
                    Revenue workflow
                  </Badge>
                )}
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {path.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {path.description}
                </p>
                <ul className="mt-7 flex-1 space-y-3">
                  {path.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm text-foreground"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Start building
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
