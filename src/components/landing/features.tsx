import {
  BarChart3,
  Brain,
  Calendar,
  LineChart,
  MessageSquare,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const features = [
  {
    icon: Brain,
    title: "AI Qualification Context",
    description:
      "Review qualification context alongside lead information so the team can make a more focused next decision.",
  },
  {
    icon: Workflow,
    title: "Revenue Workflow Activity",
    description:
      "Keep workflow activity visible as lead work moves between qualification, pipeline, and team action.",
  },
  {
    icon: Users,
    title: "Lead Workspace",
    description:
      "Bring lead details, pipeline status, and qualification information into a shared operating view.",
  },
  {
    icon: MessageSquare,
    title: "Team Coordination",
    description:
      "Give revenue teams a clearer view of the next action and the workflow that supports it.",
  },
  {
    icon: Calendar,
    title: "Pipeline Visibility",
    description:
      "Track lead movement through the stages that matter to your revenue process.",
  },
  {
    icon: BarChart3,
    title: "Operational Insights",
    description:
      "Use a focused dashboard and analytics surface to understand pipeline and lead activity.",
  },
  {
    icon: Zap,
    title: "Workflow Integrations",
    description:
      "Configure supported CRM, notification, and automation services from your organization workspace.",
  },
  {
    icon: LineChart,
    title: "Organization-Aware Workspaces",
    description:
      "Keep revenue data scoped to the selected organization and the people authorized to work with it.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <BackgroundPattern variant="dots" />
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="default" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A calmer system for{" "}
            <span className="text-muted-foreground">revenue operations.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Revora brings the key signals and revenue workflow surfaces into a
            more deliberate operating view.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="animate-slide-up"
              style={{
                animationDelay: `${i * 0.1}s`,
                animationFillMode: "both",
              }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-canvas">
                    <feature.icon className="size-4" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
