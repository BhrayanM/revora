"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SlideUp } from "@/components/ui/motion";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "VP of Sales",
    company: "CloudScale",
    content:
      "AI Growth Platform transformed our lead qualification process. We went from 15% to 43% conversion rate in just two months. The AI scoring is incredibly accurate.",
    rating: 5,
    avatar: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "CEO",
    company: "GrowthLabs",
    content:
      "We replaced 4 different tools with AI Growth Platform. The n8n integration lets us build custom workflows that connect our entire tech stack seamlessly.",
    rating: 5,
    avatar: "MJ",
  },
  {
    name: "Elena Rodriguez",
    role: "Marketing Director",
    company: "FinEdge",
    content:
      "The SMS automation alone saved our team 30 hours per week. The AI personalizes every message based on lead behavior and engagement history.",
    rating: 5,
    avatar: "ER",
  },
  {
    name: "David Park",
    role: "Sales Operations",
    company: "TechFlow",
    content:
      "Setting up was surprisingly easy. Within a week, we had our entire pipeline automated. The HubSpot integration is flawless and bidirectional.",
    rating: 5,
    avatar: "DP",
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () =>
    setCurrent(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );

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

        <div className="mt-16 mx-auto max-w-3xl">
          <SlideUp key={current}>
            <Card className="relative">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center gap-0.5 mb-6">
                  {Array.from({ length: testimonials[current]!.rating }).map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="size-5 fill-warning text-warning"
                      />
                    ),
                  )}
                </div>
                <blockquote className="text-lg leading-relaxed text-zinc-700">
                  &ldquo;{testimonials[current]!.content}&rdquo;
                </blockquote>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {testimonials[current]!.avatar}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {testimonials[current]!.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {testimonials[current]!.role},{" "}
                      {testimonials[current]!.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={prev}
              className="rounded-full border border-border p-2 text-zinc-400 transition-colors hover:text-foreground"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`size-2 rounded-full transition-colors ${
                    i === current ? "bg-primary" : "bg-zinc-300"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="rounded-full border border-border p-2 text-zinc-400 transition-colors hover:text-foreground"
              aria-label="Next testimonial"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
