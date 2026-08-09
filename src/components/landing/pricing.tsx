import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const paths = [
  {
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

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {paths.map((path) => (
            <Card key={path.title}>
              <CardContent className="flex h-full flex-col p-7">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
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
                <Link
                  href="/signup"
                  className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Comienza a construir
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
