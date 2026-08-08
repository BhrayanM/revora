import { BarChart3, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";

import { BarChart, DonutChart } from "@/components/dashboard/charts";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getCurrentOrganization } from "@/lib/auth";
import { getLeadMetrics, getPipelineMetrics } from "@/lib/queries/analytics";
import { getLeads } from "@/lib/queries/leads";

export const metadata: Metadata = {
  title: "Analytics — AI Growth Platform",
};

export default async function AnalyticsPage() {
  const org = await getCurrentOrganization();

  if (!org) {
    return (
      <Container className="max-w-none px-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground">No organization found.</p>
      </Container>
    );
  }

  const { data: metrics } = await getLeadMetrics(org.id);
  const { data: pipeline } = await getPipelineMetrics(org.id);
  const { data: leads } = await getLeads(org.id);

  const totalLeads = metrics?.total ?? 0;
  const qualified = metrics?.qualified ?? 0;
  const conversionRate = metrics?.conversionRate ?? 0;
  const avgScore = metrics?.avgScore ?? 0;

  const sourceCounts = new Map<string, number>();
  let hotCount = 0;
  let warmCount = 0;
  let coldCount = 0;
  for (const lead of leads ?? []) {
    sourceCounts.set(lead.source, (sourceCounts.get(lead.source) ?? 0) + 1);
    const qual = (lead.metadata as Record<string, unknown> | null)?.[
      "qualification"
    ] as Record<string, unknown> | undefined;
    const temp = qual?.["temperature"] as string | undefined;
    if (temp === "HOT") hotCount++;
    else if (temp === "WARM") warmCount++;
    else if (temp === "COLD") coldCount++;
  }

  const sourceData = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      label: name.charAt(0).toUpperCase() + name.slice(1),
      value: count,
      color: "var(--color-primary)",
    }));

  const stageColors: Record<string, string> = {
    "New Lead": "var(--color-primary)",
    Contacted: "var(--color-secondary)",
    Qualified: "var(--color-success)",
    "Proposal Sent": "var(--color-warning)",
    Negotiation: "var(--color-accent)",
    "Closed Won": "var(--color-success)",
    "Closed Lost": "var(--color-error)",
  };

  const donutData = (pipeline?.stages ?? []).map((s) => ({
    label: s.stageName,
    value: s.count,
    color: stageColors[s.stageName] ?? "var(--color-primary)",
  }));

  const hasPipeline =
    donutData.length > 0 && donutData.some((s) => s.value > 0);

  const stats = [
    {
      label: "Total Leads",
      value: totalLeads.toLocaleString(),
      change: 0,
      icon: <Users className="size-5 text-primary" />,
      accentColor: "primary",
    },
    {
      label: "Qualified Leads",
      value: qualified.toLocaleString(),
      change: 0,
      icon: <TrendingUp className="size-5 text-success" />,
      accentColor: "success",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      change: 0,
      icon: <BarChart3 className="size-5 text-accent" />,
      accentColor: "accent",
    },
    {
      label: "Avg AI Score",
      value: `${avgScore}/100`,
      change: 0,
      icon: <BarChart3 className="size-5 text-secondary" />,
      accentColor: "secondary",
    },
  ];

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track performance, conversions, and lead sources.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatWidget key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              HOT Leads
            </p>
            <p className="mt-1 text-2xl font-bold text-error">{hotCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              WARM Leads
            </p>
            <p className="mt-1 text-2xl font-bold text-warning">{warmCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              COLD Leads
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">{coldCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Lead Sources
                </h3>
                <p className="text-sm text-muted-foreground">
                  By acquisition channel
                </p>
              </div>
              {totalLeads > 0 && (
                <Badge variant="default" size="sm">
                  {totalLeads} leads
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <BarChart data={sourceData} height={240} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No source data yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add leads to see acquisition channels
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Pipeline Distribution
                </h3>
                <p className="text-sm text-muted-foreground">Leads by stage</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasPipeline ? (
              <DonutChart segments={donutData} size={180} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No pipeline data
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Leads will appear here when added
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Conversion Funnel
            </h3>
            <p className="text-sm text-muted-foreground">Pipeline stages</p>
          </CardHeader>
          <CardContent>
            {hasPipeline ? (
              <div className="space-y-4">
                {donutData.map((stage, i) => (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground">{stage.label}</span>
                      <span className="text-muted-foreground">
                        {stage.value}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-secondary">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max((stage.value / Math.max(donutData[0]!.value, 1)) * 100, 2)}%`,
                          backgroundColor: stage.color,
                          opacity: 1 - i * 0.12,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No pipeline data
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add leads to populate your funnel
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Source Performance
            </h3>
            <p className="text-sm text-muted-foreground">
              Detailed breakdown by channel
            </p>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">
                        Source
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        Leads
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        % of Total
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceData.map((row) => (
                      <tr key={row.label} className="border-b border-border">
                        <td className="py-3 font-medium text-foreground">
                          {row.label}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {row.value}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {totalLeads > 0
                            ? Math.round((row.value / totalLeads) * 100)
                            : 0}
                          %
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          —
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No leads recorded yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Leads will appear here when added
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
