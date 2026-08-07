import { ArrowLeft, Calendar, Mail, Phone, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BarChart } from "@/components/dashboard/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getLeadConversations } from "@/lib/queries/conversations";
import { getLeadById } from "@/lib/queries/leads";

const statusConfig: Record<string, BadgeVariant> = {
  new: "default",
  contacted: "secondary",
  qualified: "success",
  proposal: "warning",
  negotiation: "secondary",
  won: "success",
  lost: "error",
};
type BadgeVariant =
  "default" | "success" | "warning" | "error" | "secondary" | "outline";

const scoreData = [
  { label: "Engagement", value: 92, color: "rgb(99 102 241)" },
  { label: "Fit", value: 78, color: "rgb(16 185 129)" },
  { label: "Intent", value: 85, color: "rgb(6 182 212)" },
  { label: "Timeline", value: 65, color: "rgb(245 158 11)" },
];

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: lead, error } = await getLeadById(id);

  if (error || !lead) {
    notFound();
  }

  const { data: conversations } = await getLeadConversations(id);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

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
              {lead.first_name} {lead.last_name}
            </h1>
            <p className="text-sm text-zinc-500">Lead ID: {lead.id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Mail className="size-3.5" /> Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="size-3.5" /> Call
            </Button>
            <Button size="sm">
              <Calendar className="size-3.5" /> Book Meeting
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
                  { label: "Email", value: lead.email ?? "—" },
                  { label: "Phone", value: lead.phone ?? "—" },
                  { label: "Company", value: lead.company ?? "—" },
                  {
                    label: "Source",
                    value:
                      lead.source.charAt(0).toUpperCase() +
                      lead.source.slice(1),
                  },
                  {
                    label: "Status",
                    value: (
                      <Badge
                        variant={statusConfig[lead.status] ?? "default"}
                        size="sm"
                      >
                        {lead.status}
                      </Badge>
                    ),
                  },
                  {
                    label: "AI Score",
                    value: (
                      <span
                        className={
                          lead.score >= 80 ? "font-medium text-success" : ""
                        }
                      >
                        {lead.score}/100
                      </span>
                    ),
                  },
                  { label: "Created", value: formatDate(lead.created_at) },
                  {
                    label: "Tags",
                    value: lead.tags?.length ? lead.tags.join(", ") : "—",
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-zinc-500">{field.label}</p>
                    <div className="mt-0.5 text-sm text-foreground">
                      {field.value}
                    </div>
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
              {conversations && conversations.length > 0 ? (
                <div className="space-y-0">
                  {conversations.map((c, i) => (
                    <div key={c.id} className="flex gap-3 pb-4 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <div className="size-2 rounded-full bg-primary mt-1.5" />
                        {i < conversations.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">
                          {formatDate(c.created_at)} — {c.type} ({c.direction})
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-700 line-clamp-2">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
                  No activity recorded yet
                </div>
              )}
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
              <div className="rounded-lg bg-surface-secondary p-3">
                <div className="flex items-center gap-2">
                  <Star className="size-3.5 text-warning fill-warning" />
                  <span className="text-xs font-medium text-foreground">
                    AI Summary
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  Lead from {lead.company ?? "unknown company"}. Current score:{" "}
                  {lead.score}/100. Status: {lead.status}.
                  {lead.score >= 80
                    ? " High-priority lead — recommend contacting within 24 hours."
                    : " Continue nurturing with automated sequences."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
