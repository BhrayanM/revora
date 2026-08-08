import { BarChart3, TrendingUp, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";

import { AIInsights } from "@/components/dashboard/ai-insights";
import { BarChart, DonutChart } from "@/components/dashboard/charts";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getCurrentOrganization } from "@/lib/auth";
import {
  getLeadMetrics,
  getPipelineMetrics,
  getRecentActivity,
} from "@/lib/queries/analytics";

export const metadata: Metadata = {
  title: "Dashboard — AI Growth Platform",
};

export default async function DashboardPage() {
  const org = await getCurrentOrganization();
  const orgId = org?.id;

  const { data: metrics } = orgId
    ? await getLeadMetrics(orgId)
    : { data: null };
  const { data: pipeline } = orgId
    ? await getPipelineMetrics(orgId)
    : { data: null };
  const { data: activities } = orgId
    ? await getRecentActivity(orgId, 5)
    : { data: null };

  const totalLeads = metrics?.total ?? 0;
  const qualified = metrics?.qualified ?? 0;
  const conversionRate = metrics?.conversionRate ?? 0;
  const avgScore = metrics?.avgScore ?? 0;

  const stats = [
    {
      label: "Total Leads",
      value: totalLeads.toLocaleString(),
      change: 0,
      icon: <Users className="size-5 text-primary" />,
    },
    {
      label: "Qualified Leads",
      value: qualified.toLocaleString(),
      change: 0,
      icon: <TrendingUp className="size-5 text-success" />,
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      change: 0,
      icon: <UserPlus className="size-5 text-accent" />,
    },
    {
      label: "Avg AI Score",
      value: `${avgScore}/100`,
      change: 0,
      icon: <BarChart3 className="size-5 text-secondary" />,
    },
  ];

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
    color: stageColors[s.stageName] ?? "rgb(99 102 241)",
  }));

  const hasPipeline =
    donutData.length > 0 && donutData.some((s) => s.value > 0);

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your pipeline and leads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatWidget key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Lead Volume
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pipeline distribution
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
            {!orgId ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No organization found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please contact support
                </p>
              </div>
            ) : hasPipeline ? (
              <BarChart data={donutData} height={240} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No pipeline data yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add leads to see your pipeline stats
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Lead Distribution
            </h3>
            <p className="text-sm text-muted-foreground">By stage</p>
          </CardHeader>
          <CardContent>
            {hasPipeline ? (
              <DonutChart segments={donutData} size={180} />
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Recent Activity
            </h3>
          </CardHeader>
          <CardContent>
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <BarChart3 className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              AI Insights
            </h3>
            <p className="text-sm text-muted-foreground">
              Actionable intelligence
            </p>
          </CardHeader>
          <CardContent>
            <AIInsights />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
