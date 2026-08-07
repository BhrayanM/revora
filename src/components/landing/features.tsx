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
import { SlideUp, StaggerChildren } from "@/components/ui/motion";

const features = [
  {
    icon: Brain,
    title: "AI Lead Qualification",
    description:
      "Automatically score and qualify leads using AI that learns from your sales history and customer data.",
  },
  {
    icon: Workflow,
    title: "Multi-Channel Automation",
    description:
      "Orchestrate email, SMS, and voice campaigns across your entire funnel with intelligent workflows.",
  },
  {
    icon: Users,
    title: "Smart CRM",
    description:
      "Manage contacts, track interactions, and nurture relationships with an AI-enhanced CRM built for growth.",
  },
  {
    icon: MessageSquare,
    title: "Conversational AI",
    description:
      "Engage leads 24/7 with AI chatbots that qualify, book meetings, and hand off to your sales team.",
  },
  {
    icon: Calendar,
    title: "Automated Booking",
    description:
      "AI-powered scheduling that finds the perfect meeting time across time zones and calendars.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Real-time dashboards with predictive insights, conversion tracking, and ROI measurement.",
  },
  {
    icon: Zap,
    title: "Instant Integrations",
    description:
      "Connect with GoHighLevel, HubSpot, Slack, Twilio, and 100+ tools through n8n workflows.",
  },
  {
    icon: LineChart,
    title: "Pipeline Management",
    description:
      "Visual kanban boards with AI-powered deal predictions and automated stage progression.",
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
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Scale
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            From lead capture to closed deals — our AI platform handles the
            heavy lifting so your team can focus on what matters.
          </p>
        </div>

        <StaggerChildren className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <SlideUp key={feature.title}>
              <Card className="h-full transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </SlideUp>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
