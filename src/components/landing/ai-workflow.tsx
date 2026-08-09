"use client";

import {
  ArrowRight,
  BrainCircuit,
  Check,
  MessagesSquare,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: UsersRound,
    eyebrow: "01 / Capture",
    title: "Bring signals into one operating view",
    description:
      "Start with the lead and the context your team needs for a confident next step.",
  },
  {
    icon: BrainCircuit,
    eyebrow: "02 / Qualify",
    title: "Use AI to clarify priority",
    description:
      "Surface the information that helps your team focus attention where it matters most.",
  },
  {
    icon: MessagesSquare,
    eyebrow: "03 / Coordinate",
    title: "Turn insight into an accountable action",
    description:
      "Keep the team, the workflow, and the revenue motion connected as work progresses.",
  },
  {
    icon: Check,
    eyebrow: "04 / Learn",
    title: "See what moved the workflow forward",
    description:
      "Use a shared record of activity to improve the next revenue decision.",
  },
];

export function AIWorkflow() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % steps.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section id="workflow" className="relative scroll-mt-24 py-24 sm:py-32">
      <BackgroundPattern variant="grid" />
      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-border bg-surface/70 text-foreground"
          >
            How Revora works
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            A revenue workflow that stays clear from first signal to next
            action.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Follow the signal through a focused operating loop instead of a
            collection of disconnected tools.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const active = activeIndex === index;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "bg-surface-secondary"
                      : "hover:bg-surface-secondary/60",
                  )}
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
                      active
                        ? "bg-foreground text-canvas ring-foreground"
                        : "bg-surface text-muted-foreground ring-border",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-subtle">
                      {step.eyebrow}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-foreground">
                      {step.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-h-[23rem] overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div
              className="absolute -right-10 -top-10 size-44 rounded-full bg-foreground/[0.035] blur-3xl"
              aria-hidden="true"
            />
            {steps.map((step, index) => {
              const Icon = step.icon;
              const active = activeIndex === index;
              return (
                <div
                  key={step.title}
                  className={cn(
                    "transition-all duration-500",
                    active
                      ? "relative opacity-100"
                      : "pointer-events-none absolute inset-0 translate-y-2 opacity-0",
                  )}
                  aria-hidden={!active}
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-canvas shadow-lg shadow-black/10">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                    {step.eyebrow}
                  </p>
                  <h3 className="mt-3 max-w-lg text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                  <div className="mt-10 flex items-center gap-3 text-sm font-medium text-foreground">
                    <span className="flex size-7 items-center justify-center rounded-full border border-border bg-surface-secondary">
                      {index + 1}
                    </span>
                    <span>
                      {index === steps.length - 1
                        ? "Ready for the next signal"
                        : "Continue through the workflow"}
                    </span>
                    {index < steps.length - 1 && (
                      <ArrowRight
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div
              className="absolute bottom-8 left-8 right-8 flex items-center gap-2"
              aria-hidden="true"
            >
              {steps.map((step, index) => (
                <span
                  key={step.title}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    activeIndex === index
                      ? "bg-foreground"
                      : "bg-surface-tertiary",
                  )}
                />
              ))}
              <Sparkles className="ml-2 size-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
