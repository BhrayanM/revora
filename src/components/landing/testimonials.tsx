import { Layers3, ShieldCheck, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const useCases = [
  {
    icon: UsersRound,
    title: "Revenue teams",
    description:
      "A shared view for qualification, lead progression, and the next accountable action.",
  },
  {
    icon: Layers3,
    title: "Operations teams",
    description:
      "A calmer operating layer for the workflows that connect revenue systems and people.",
  },
  {
    icon: ShieldCheck,
    title: "Growing organizations",
    description:
      "Organization-aware workspaces with the controls teams need as access expands.",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-border bg-surface-secondary/60 py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-border bg-surface text-foreground"
          >
            Designed around the work
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            One platform for the people who move revenue forward.
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <Card key={useCase.title} className="h-full">
                <CardContent className="p-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-canvas">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-base font-semibold text-foreground">
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
