import { Bot, MessageCircle, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const integrations = [
  { icon: Workflow, name: "GoHighLevel", category: "CRM workflow" },
  { icon: Workflow, name: "HubSpot", category: "CRM workflow" },
  { icon: MessageCircle, name: "Slack", category: "Team notification" },
  { icon: Workflow, name: "n8n", category: "Automation workflow" },
  { icon: Bot, name: "OpenAI", category: "AI qualification" },
];

export function Integrations() {
  return (
    <section
      id="integrations"
      className="scroll-mt-24 border-y border-border bg-surface-secondary/60 py-24 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-border bg-surface text-foreground"
          >
            Connected where the work happens
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Bring the revenue workflow closer to your existing stack.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Revora supports the systems used to qualify leads, coordinate
            activity, and keep the team informed.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card
                key={integration.name}
                variant="ghost"
                className="border border-border bg-surface"
              >
                <CardContent className="flex min-h-36 flex-col items-center justify-center gap-3 p-5 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-canvas">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {integration.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {integration.category}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
