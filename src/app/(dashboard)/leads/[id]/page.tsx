import { ArrowLeft, Calendar, Mail, Phone, Star } from "lucide-react";
import Link from "next/link";

import { BarChart } from "@/components/dashboard/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const scoreData = [
  { label: "Engagement", value: 92, color: "rgb(99 102 241)" },
  { label: "Fit", value: 78, color: "rgb(16 185 129)" },
  { label: "Intent", value: 85, color: "rgb(6 182 212)" },
  { label: "Timeline", value: 65, color: "rgb(245 158 11)" },
];

const timeline = [
  {
    date: "Aug 7, 2026 — 2:30 PM",
    event: "AI qualification completed",
    detail: "Score: 85/100 — Qualified",
  },
  {
    date: "Aug 7, 2026 — 11:00 AM",
    event: "Automated welcome email sent",
    detail: "Delivered and opened at 11:45 AM",
  },
  {
    date: "Aug 7, 2026 — 10:15 AM",
    event: "Lead created",
    detail: "Submitted contact form on landing page",
  },
];

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Container className="max-w-none px-0">
      <div className="mb-6">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Back to Leads
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Sarah Johnson
            </h1>
            <p className="text-sm text-zinc-500">Lead ID: {id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Mail className="size-3.5" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="size-3.5" />
              Call
            </Button>
            <Button size="sm">
              <Calendar className="size-3.5" />
              Book Meeting
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Lead Information</h3>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Email", value: "sarah.johnson@techcorp.com" },
                  { label: "Phone", value: "+1 (555) 234-5678" },
                  { label: "Company", value: "TechCorp" },
                  { label: "Source", value: "Website" },
                  {
                    label: "Status",
                    value: (
                      <Badge variant="success" size="sm">
                        Qualified
                      </Badge>
                    ),
                  },
                  {
                    label: "AI Score",
                    value: (
                      <span className="font-medium text-success">85/100</span>
                    ),
                  },
                  { label: "Created", value: "Aug 7, 2026" },
                  { label: "Assigned To", value: "John Smith" },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-zinc-500">{field.label}</p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Activity Timeline</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="relative flex flex-col items-center">
                      <div className="size-2 rounded-full bg-primary mt-1.5" />
                      {i < timeline.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">{item.date}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {item.event}
                      </p>
                      <p className="text-sm text-zinc-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">AI Score Breakdown</h3>
            </CardHeader>
            <CardContent>
              <BarChart data={scoreData} height={140} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Notes</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg bg-surface-secondary p-3">
                  <div className="flex items-center gap-2">
                    <Star className="size-3.5 text-warning fill-warning" />
                    <span className="text-xs font-medium text-foreground">
                      AI Summary
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    High-intent lead from TechCorp. Engaged with pricing page
                    and demo video. Ready for sales call. Recommend contacting
                    within 24 hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Quick Actions</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                Add to Sequence
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                Assign to Agent
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                Add Note
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
