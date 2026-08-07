import { ArrowRight, BarChart3, Brain, Play } from "lucide-react";
import Link from "next/link";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <BackgroundPattern variant="gradient" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" size="lg" className="mb-6">
            <Brain className="size-3.5" />
            AI-Powered Business Automation
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Automate Your{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Business Growth
            </span>{" "}
            With AI
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-600 sm:text-xl">
            Qualify leads, book appointments, and automate multi-channel
            outreach — all powered by AI. The only platform that connects your
            CRM, marketing, and sales in one intelligent workflow.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/dashboard">
              <Button size="xl" className="shadow-lg shadow-primary/25">
                Start Automating Free
                <ArrowRight className="size-5" />
              </Button>
            </Link>
            <Button variant="outline" size="xl">
              <Play className="size-5" />
              Watch Demo
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-success" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-success" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-success" />
              Cancel anytime
            </div>
          </div>
        </div>

        <div className="mt-16 mx-auto max-w-5xl">
          <div className="relative rounded-xl border border-border bg-gradient-to-br from-surface to-surface-secondary p-2 shadow-lg">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-accent/10 to-secondary/20 opacity-50" />
            <div className="relative rounded-lg bg-surface overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
                <div className="size-2.5 rounded-full bg-error/60" />
                <div className="size-2.5 rounded-full bg-warning/60" />
                <div className="size-2.5 rounded-full bg-success/60" />
                <span className="ml-2 text-xs text-zinc-400">
                  AI Growth Platform — Dashboard
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-surface-secondary p-4"
                    >
                      <div className="h-3 w-1/3 rounded bg-surface-tertiary" />
                      <div className="mt-3 h-6 w-1/2 rounded bg-surface-tertiary" />
                      <div className="mt-3 flex items-end gap-1">
                        {[40, 60, 35, 75, 50].map((h, j) => (
                          <div
                            key={j}
                            className="flex-1 rounded-sm bg-primary/30"
                            style={{ height: `${h * 0.5}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
