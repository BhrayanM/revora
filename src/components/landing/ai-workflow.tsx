import {
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle,
  MessageSquare,
  UserPlus,
} from "lucide-react";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

const steps = [
  {
    icon: UserPlus,
    title: "Lead Capture",
    description:
      "Leads enter from your website, ads, or forms and are instantly enriched with AI.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Brain,
    title: "AI Qualification",
    description:
      "Our AI scores each lead based on behavior, demographics, and conversion probability.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: MessageSquare,
    title: "Multi-Channel Outreach",
    description:
      "Automated personalized emails, SMS, and voice messages reach leads on their preferred channel.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Calendar,
    title: "Smart Booking",
    description:
      "Qualified leads are automatically routed to the right agent with calendar availability.",
    color: "bg-success/10 text-success",
  },
  {
    icon: CheckCircle,
    title: "Conversion & Nurture",
    description:
      "Deals move through your pipeline automatically while AI continues nurturing cold leads.",
    color: "bg-warning/10 text-warning",
  },
];

export function AIWorkflow() {
  return (
    <section className="relative py-24 sm:py-32">
      <BackgroundPattern variant="grid" />
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="default" className="mb-4">
            How It Works
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your AI-Powered{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Growth Engine
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            From first touch to closed deal — our intelligent automation handles
            every step of your sales process.
          </p>
        </div>
        <div className="mt-16 relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-secondary/50 hidden lg:block" />
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="animate-slide-up"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
                  <div className="flex lg:w-1/2 lg:justify-end">
                    <div className="flex items-start gap-4 lg:gap-6">
                      <div
                        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${step.color}`}
                      >
                        <step.icon className="size-6" />
                        {index < steps.length - 1 && (
                          <ArrowRight className="absolute -bottom-8 size-5 text-zinc-300 rotate-90 lg:hidden" />
                        )}
                      </div>
                      <div className="lg:text-right">
                        <h3 className="text-lg font-semibold text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:flex lg:w-1/2 lg:items-center">
                    <div className="h-px w-12 bg-gradient-to-r from-primary/30 to-transparent" />
                    <span className="mx-3 text-xs font-medium text-zinc-500">
                      STEP {index + 1}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
