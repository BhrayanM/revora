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
    eyebrow: "01 / CAPTURAR",
    title: "Unifica las señales en una sola vista.",
    description:
      "Reúne el lead, su contexto y la información necesaria para decidir qué hacer después.",
  },
  {
    icon: BrainCircuit,
    eyebrow: "02 / CALIFICAR",
    title: "Prioriza con contexto de IA.",
    description:
      "Utiliza la información disponible para identificar qué oportunidades requieren atención primero.",
  },
  {
    icon: MessagesSquare,
    eyebrow: "03 / COORDINAR",
    title: "Convierte la decisión en una siguiente acción.",
    description:
      "Mantén conectado al equipo con el lead, el pipeline y las acciones que deben ejecutarse.",
  },
  {
    icon: Check,
    eyebrow: "04 / APRENDER",
    title: "Entiende qué ocurrió.",
    description:
      "Consulta la actividad del flujo para saber qué impulsó el resultado y qué debería pasar después.",
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
            Cómo funciona Revora
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Un flujo de trabajo claro, desde la señal hasta la siguiente acción.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Sigue cada señal en un mismo flujo, en lugar de repartir el trabajo
            entre herramientas desconectadas.
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

          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div
              className="absolute -right-10 -top-10 size-44 rounded-full bg-foreground/[0.035] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative grid">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const active = activeIndex === index;
                return (
                  <div
                    key={step.title}
                    className={cn(
                      "col-start-1 row-start-1 transition-[opacity,transform] duration-500 ease-out",
                      active
                        ? "z-10 translate-y-0 opacity-100"
                        : "pointer-events-none z-0 translate-y-2 opacity-0",
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
                    <div className="mt-8 flex items-center gap-3 text-sm font-medium text-foreground">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-secondary">
                        {index + 1}
                      </span>
                      <span>
                        {index === steps.length - 1
                          ? "Listo para la siguiente señal"
                          : "Continúa con el flujo de trabajo"}
                      </span>
                      {index < steps.length - 1 && (
                        <ArrowRight
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="relative mt-8 flex items-center gap-2"
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
