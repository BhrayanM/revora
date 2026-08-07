import {
  ArrowUpRight,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

const benefits = [
  {
    icon: Clock,
    stat: "40+",
    label: "Hours Saved Per Week",
    description:
      "Our automation handles repetitive tasks so your team can focus on high-value activities that drive revenue.",
  },
  {
    icon: TrendingUp,
    stat: "3.2x",
    label: "Average Pipeline Growth",
    description:
      "AI-qualified leads convert faster. Our customers see their pipeline grow 3.2x within the first 90 days.",
  },
  {
    icon: DollarSign,
    stat: "67%",
    label: "Cost Reduction",
    description:
      "Replace multiple tools with one intelligent platform and reduce your SaaS spend by over two thirds.",
  },
  {
    icon: Users,
    stat: "10k+",
    label: "Active Users",
    description:
      "Join over 10,000 businesses already using AI Growth Platform to automate their sales and marketing.",
  },
];

export function Benefits() {
  return (
    <section className="bg-surface-secondary py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Why Choose Us
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Results That{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Speak
            </span>{" "}
            for Themselves
          </h2>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.label}
              className="animate-slide-up"
              style={{
                animationDelay: `${index * 0.1}s`,
                animationFillMode: "both",
              }}
            >
              <div className="group text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <benefit.icon className="size-6 text-primary" />
                </div>
                <div className="mt-4 text-4xl font-bold tracking-tight text-foreground">
                  {benefit.stat}
                  <ArrowUpRight className="ml-1 inline size-5 text-success" />
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {benefit.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
