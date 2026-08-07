import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "49",
    description: "Perfect for small teams getting started with AI automation.",
    features: [
      "Up to 1,000 leads/month",
      "Basic AI lead scoring",
      "Email automation",
      "GoHighLevel integration",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: "149",
    description: "For growing businesses that need advanced automation.",
    features: [
      "Up to 10,000 leads/month",
      "Advanced AI lead scoring",
      "Email + SMS automation",
      "All CRM integrations",
      "n8n workflow builder",
      "Calendar booking",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with complex automation needs.",
    features: [
      "Unlimited leads",
      "Custom AI models",
      "Full multi-channel automation",
      "All integrations + custom",
      "Dedicated n8n instance",
      "White-label option",
      "SLA guarantee",
      "Dedicated account manager",
      "Custom onboarding",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="default" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Transparent
            </span>{" "}
            Pricing
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Start free for 14 days. No credit card required. Upgrade, downgrade,
            or cancel anytime.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col",
                plan.popular &&
                  "border-primary/50 shadow-lg shadow-primary/10 scale-[1.02]",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" size="md">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price === "Custom" ? plan.price : <>${plan.price}</>}
                  </span>
                  {plan.price !== "Custom" && (
                    <span className="text-sm text-zinc-500">/month</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-zinc-700"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
