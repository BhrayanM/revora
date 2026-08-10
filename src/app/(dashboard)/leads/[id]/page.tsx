import { ArrowLeft, Calendar, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { getLeadConversations } from "@/lib/queries/conversations";
import { getLeadById } from "@/lib/queries/leads";

import { AIQualificationPanel } from "./ai-qualification-panel";
import { HubSpotSyncButton } from "./hubspot-sync-button";

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

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authorization =
    await requireCurrentOrganizationPermission("leads.read");
  if (!authorization.data) {
    notFound();
  }

  const { data: lead, error } = await getLeadById(id);

  if (
    error ||
    !lead ||
    lead.organization_id !== authorization.data.organization.id
  ) {
    notFound();
  }

  const { data: conversations } = await getLeadConversations(id);

  const existingQualification = lead.metadata
    ? ((lead.metadata as Record<string, unknown>)["qualification"] as Record<
        string,
        unknown
      > | null)
    : null;

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
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Back to Leads
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {lead.first_name} {lead.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">Lead ID: {lead.id}</p>
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
                          existingQualification && lead.score >= 80
                            ? "font-medium text-success"
                            : ""
                        }
                      >
                        {existingQualification
                          ? `${lead.score}/100`
                          : "Not qualified"}
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
                    <p className="text-xs text-muted-foreground">
                      {field.label}
                    </p>
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
                        <p className="text-xs text-muted-foreground">
                          {formatDate(c.created_at)} — {c.type} ({c.direction})
                        </p>
                        <p className="mt-0.5 text-sm text-foreground line-clamp-2">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No activity recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <AIQualificationPanel
            leadId={id}
            existingQualification={existingQualification}
          />
          <HubSpotSyncButton leadId={id} />
        </div>
      </div>
    </Container>
  );
}
