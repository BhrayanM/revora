import {
  ArrowRight,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Play,
} from "lucide-react";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const stats = [
  { label: "Leads Processed", value: "2.4M+", icon: BarChart3 },
  { label: "Meetings Booked", value: "850K+", icon: Calendar },
  { label: "AI Accuracy", value: "97.3%", icon: Brain },
];

export function Demo() {
  return (
    <section className="relative py-24 sm:py-32">
      <BackgroundPattern variant="gradient" />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div
            className="animate-slide-up"
            style={{ animationFillMode: "both" }}
          >
            <Badge variant="default" className="mb-4">
              See It In Action
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Watch AI Growth Platform{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Transform
              </span>{" "}
              Your Sales
            </h2>
            <p className="mt-4 text-lg text-zinc-600">
              See how our AI automatically qualifies leads, sends personalized
              outreach, and books meetings — all without human intervention.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "AI lead scoring in real-time",
                "Automated email & SMS sequences",
                "Smart calendar scheduling",
                "Pipeline automation with n8n",
                "Real-time analytics dashboard",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-zinc-700"
                >
                  <CheckCircle2 className="size-4 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-3">
              <Button>
                Try Live Demo
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline">
                <Play className="size-4" />
                Watch Overview
              </Button>
            </div>
          </div>
          <div
            className="animate-slide-up"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 blur-2xl" />
              <Card className="relative overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-border bg-surface-secondary px-4 py-2">
                  <div className="size-2.5 rounded-full bg-error/60" />
                  <div className="size-2.5 rounded-full bg-warning/60" />
                  <div className="size-2.5 rounded-full bg-success/60" />
                </div>
                <CardContent className="space-y-4 p-6">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between rounded-lg bg-surface-secondary p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <stat.icon className="size-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {stat.label}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-lg bg-success/5 border border-success/20 p-4">
                    <span className="text-sm font-medium text-success-700">
                      AI Active — Processing Leads
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="size-1.5 rounded-full bg-success animate-pulse"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
