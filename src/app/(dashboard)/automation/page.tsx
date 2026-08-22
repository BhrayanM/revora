import { ArrowRight, Brain, UserPlus, Webhook } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Automation",
};

const statusBadge: Record<string, "success" | "error" | "warning" | "default"> =
  {
    success: "success",
    failed: "error",
    processing: "warning",
    pending: "default",
  };

export default async function AutomationPage() {
  const authorization =
    await requireCurrentOrganizationPermission("automation.read");

  if (!authorization.data) {
    return (
      <Container className="max-w-none px-0">
        <h1 className="text-2xl font-bold text-foreground">Automation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          No organization found.
        </p>
      </Container>
    );
  }

  const org = authorization.data.organization;

  const supabase = await createClient();
  const { data: executions } = await supabase
    .from("automation_executions")
    .select("id, provider, action, status, attempts, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Container className="max-w-none px-0">
      <PageHeader
        title="Automation Activity"
        description="Track webhook deliveries, CRM syncs, and AI operations."
      />

      <Card>
        <CardContent className="p-0">
          {!executions || executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                  <UserPlus className="size-5 text-primary" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground/40" />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 ring-1 ring-secondary/10">
                  <Brain className="size-5 text-secondary" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground/40" />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 ring-1 ring-success/10">
                  <Webhook className="size-5 text-success" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No automation executions yet
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                This page records completed AI qualification requests and
                external delivery attempts when those integrations are
                configured.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Internal lead events are available from each lead&apos;s
                activity timeline.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Attempts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec) => (
                    <tr key={exec.id} className="border-b border-border">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(exec.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {exec.provider.slice(0, 80)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {exec.action.slice(0, 80)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusBadge[exec.status] ?? "default"}
                          size="sm"
                        >
                          {exec.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {exec.attempts}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
                        {exec.status === "failed"
                          ? "Needs attention"
                          : exec.status === "success"
                            ? "Completed"
                            : "In progress"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
