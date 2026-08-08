import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "VP of Sales",
    company: "CloudScale",
    content:
      "AI Growth transformed our lead qualification process. We went from 15% to 43% conversion rate in just two months. The AI scoring is incredibly accurate.",
    rating: 5,
    avatar: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "CEO",
    company: "GrowthLabs",
    content:
      "We replaced 4 different tools with AI Growth. The n8n integration lets us build custom workflows that connect our entire tech stack seamlessly.",
    rating: 5,
    avatar: "MJ",
  },
  {
    name: "Elena Rodriguez",
    role: "Marketing Director",
    company: "FinEdge",
    content:
      "The SMS automation alone saved our team 30 hours per week. The AI personalizes every message based on lead behavior and engagement history.",
    rating: 4,
    avatar: "ER",
  },
  {
    name: "David Park",
    role: "Sales Operations",
    company: "TechFlow",
    content:
      "Setting up was surprisingly easy. Within a week, we had our entire pipeline automated. The HubSpot integration is flawless — though the initial data migration took a few extra days.",
    rating: 4,
    avatar: "DP",
  },
];

export function Testimonials() {
  return (
    <section className="bg-surface-secondary py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Testimonials
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Industry Leaders
            </span>
          </h2>
        </div>

        <div className="mt-16 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="min-w-[85vw] snap-center sm:min-w-0"
              >
                <CardContent className="p-6 sm:p-8">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-5 ${i < testimonial.rating ? "fill-warning text-warning" : "fill-surface-tertiary text-surface-tertiary"}`}
                      />
                    ))}
                  </div>
                  <blockquote className="text-base leading-relaxed text-foreground">
                    &ldquo;{testimonial.content}&rdquo;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
