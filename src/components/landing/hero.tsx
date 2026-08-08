import {
  ArrowRight,
  Brain,
  Play,
  ShieldCheck,
  Clock,
  CreditCard,
} from "lucide-react";
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

          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            Qualify leads, book appointments, and automate multi-channel
            outreach — all powered by AI. The only platform that connects your
            CRM, marketing, and sales in one intelligent workflow.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup">
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

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-success" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-success" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" />
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
                <span className="ml-2 text-xs text-muted-foreground">
                  AI Growth Platform — Dashboard
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Total Leads",
                      value: "2,847",
                      trend: "+12.5%",
                      color: "var(--color-primary)",
                    },
                    {
                      label: "Qualified",
                      value: "1,423",
                      trend: "+23.1%",
                      color: "var(--color-success)",
                    },
                    {
                      label: "Conv. Rate",
                      value: "24.8%",
                      trend: "+8.7%",
                      color: "var(--color-accent)",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-border bg-surface-secondary p-4"
                    >
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p
                        className="mt-1 text-xs font-medium"
                        style={{ color: stat.color }}
                      >
                        {stat.trend}
                      </p>
                      <div
                        className="mt-2 flex items-end gap-[2px]"
                        style={{ height: 28 }}
                      >
                        {[14, 22, 10, 30, 18, 26, 8, 28, 16, 24, 12, 20].map(
                          (h, j) => (
                            <div
                              key={j}
                              className="flex-1 rounded-[1px]"
                              style={{
                                height: `${h}px`,
                                backgroundColor: stat.color,
                                opacity: 0.25 + j * 0.04,
                              }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-border bg-surface-secondary p-3">
                  <p className="text-xs text-muted-foreground">
                    Recent Activity
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {[
                      {
                        text: "Sarah Johnson qualified as lead",
                        time: "2m ago",
                        dot: "var(--color-success)",
                      },
                      {
                        text: "Email sequence sent to Marcus Lee",
                        time: "15m ago",
                        dot: "var(--color-primary)",
                      },
                      {
                        text: "Meeting booked with David Park",
                        time: "1h ago",
                        dot: "var(--color-warning)",
                      },
                    ].map((item) => (
                      <div
                        key={item.text}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className="size-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.dot }}
                        />
                        <span className="truncate text-muted-foreground">
                          {item.text}
                        </span>
                        <span className="ml-auto shrink-0 text-subtle">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
