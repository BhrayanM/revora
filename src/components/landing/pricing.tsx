import { ArrowDown, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const paths = [
  {
    stage: "CAPTURAR",
    title: "Captura y califica",
    description:
      "Centraliza tus leads y utiliza IA para identificar cuáles requieren atención primero.",
    items: [
      "Leads y oportunidades en un mismo espacio",
      "Contexto y puntuación de cualificación",
      "Pipeline visible para todo el equipo",
    ],
  },
  {
    stage: "AUTOMATIZAR",
    title: "Automatiza y conecta",
    description:
      "Conecta tus herramientas y coordina las acciones que siguen después de cada señal.",
    items: [
      "Integraciones con CRM y automatización",
      "Actividad del flujo de trabajo",
      "Acciones y seguimiento coordinados",
    ],
  },
  {
    stage: "ESCALAR",
    title: "Escala con control",
    description:
      "Añade miembros, define responsabilidades y mantén el acceso a los datos bajo control.",
    items: [
      "Roles y permisos por organización",
      "Gestión segura del equipo",
      "Configuración y seguridad centralizadas",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-border bg-surface text-foreground"
          >
            CAPTURAR / AUTOMATIZAR / ESCALAR
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Empieza con tus leads. Automatiza el proceso. Escala con control.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Revora reúne la cualificación, el seguimiento y la coordinación del
            equipo en un mismo flujo de trabajo.
          </p>
        </div>

        <div
          className="mt-14 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2"
          role="list"
          aria-label="Progresión del flujo de trabajo de Revora"
        >
          {paths.map((path, index) => (
            <Fragment key={path.title}>
              <div className="min-w-0 flex-1" role="listitem">
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                      {String(index + 1).padStart(2, "0")} / {path.stage}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground">
                      {path.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {path.description}
                    </p>
                    <ul className="mt-7 flex-1 space-y-3">
                      {path.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm text-foreground"
                        >
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-success"
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {index < paths.length - 1 && (
                <div
                  className="flex shrink-0 items-center justify-center py-1 lg:px-1"
                  aria-hidden="true"
                >
                  <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface-secondary text-muted-foreground">
                    <ArrowDown className="size-4 lg:hidden" />
                    <ArrowRight className="hidden size-4 lg:block" />
                  </span>
                </div>
              )}
            </Fragment>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:w-auto"
          >
            Empieza a construir con Revora
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
