import {
  BarChart3,
  Bot,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { StaggerChildren, SlideUp } from "@/components/ui/motion";

const integrations = [
  { icon: Workflow, name: "GoHighLevel", category: "CRM" },
  { icon: Bot, name: "OpenAI", category: "AI" },
  { icon: Workflow, name: "n8n", category: "Automation" },
  { icon: BarChart3, name: "HubSpot", category: "CRM" },
  { icon: Phone, name: "Twilio", category: "SMS/Voice" },
  { icon: MessageCircle, name: "Slack", category: "Communication" },
  { icon: Mail, name: "SendGrid", category: "Email" },
  { icon: Calendar, name: "Calendly", category: "Scheduling" },
  { icon: Workflow, name: "Zapier", category: "Automation" },
  { icon: Bot, name: "Claude", category: "AI" },
  { icon: Mail, name: "Resend", category: "Email" },
  { icon: Workflow, name: "Make", category: "Automation" },
];

export function Integrations() {
  return (
    <section id="integrations" className="bg-surface-secondary py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Integrations
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Connect Your{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Entire Stack
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            AI Growth Platform integrates with the tools you already use. One
            click setup, zero maintenance.
          </p>
        </div>

        <StaggerChildren className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {integrations.map((integration) => (
            <SlideUp key={integration.name}>
              <Card
                variant="ghost"
                className="group cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <integration.icon className="size-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {integration.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {integration.category}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          ))}
        </StaggerChildren>

        <div className="mt-12 text-center">
          <p className="text-sm text-zinc-500">
            100+ integrations available.{" "}
            <span className="text-primary font-medium">
              See all integrations →
            </span>
          </p>
        </div>
      </Container>
    </section>
  );
}
