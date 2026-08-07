import { Activity } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getCurrentOrganization } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Automation — AI Growth Platform",
};

const statusBadge: Record<string, "success" | "error" | "warning" | "default"> =
  {
    success: "success",
    failed: "error",
    processing: "warning",
    pending: "default",
  };

export default async function AutomationPage() {
  const org = await getCurrentOrganization();

  if (!org) {
    return (
      <Container className="max-w-none px-0">
        <h1 className="text-2xl font-bold text-foreground">Automation</h1>
        <p className="text-sm text-zinc-500 mt-1">No organization found.</p>
      </Container>
    );
  }

  const supabase = await createServiceClient();
  const { data: executions } = await supabase
    .from("automation_executions")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Container className="max-w-none px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Automation Activity
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track webhook deliveries, CRM syncs, and AI operations.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {!executions || executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="size-8 text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-500">
                No automation activity yet
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Activity will appear here when automations run
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-500">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-500">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-500">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-500">
                      Attempts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-zinc-500">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec) => (
                    <tr key={exec.id} className="border-b border-border">
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {new Date(exec.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {exec.provider}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {exec.action}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusBadge[exec.status] ?? "default"}
                          size="sm"
                        >
                          {exec.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {exec.attempts}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                        {exec.error_message ?? "—"}
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
