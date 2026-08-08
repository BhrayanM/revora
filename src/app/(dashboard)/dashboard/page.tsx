import {
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AIInsights } from "@/components/dashboard/ai-insights";
import { BarChart, DonutChart } from "@/components/dashboard/charts";
import { Container } from "@/components/ui/container";
import { getCurrentOrganization } from "@/lib/auth";
import {
  getLeadMetrics,
  getPipelineMetrics,
  getRecentActivity,
} from "@/lib/queries/analytics";
import { cn } from "@/lib/utils";

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

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your pipeline and leads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Leads"
          value={totalLeads}
          icon={<Users className="size-4 text-primary" />}
          accent="var(--color-primary)"
        />
        <KpiCard
          label="Qualified"
          value={qualified}
          icon={<TrendingUp className="size-4 text-success" />}
          accent="var(--color-success)"
        />
        <KpiCard
          label="Conversion"
          value={`${conversionRate}%`}
          icon={<UserPlus className="size-4 text-accent" />}
          accent="var(--color-accent)"
        />
        <KpiCard
          label="Avg AI Score"
          value={`${avgScore}/100`}
          icon={<BarChart3 className="size-4 text-secondary" />}
          accent="var(--color-secondary)"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Automation Flow
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              How leads are processed
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 py-6">
            <FlowStep
              icon={<UserPlus className="size-4 text-primary" />}
              label="Lead"
              color="bg-primary/10 ring-primary/10"
            />
            <ArrowRight className="size-3 text-muted-foreground/30 shrink-0" />
            <FlowStep
              icon={<Brain className="size-4 text-secondary" />}
              label="AI Qualify"
              color="bg-secondary/10 ring-secondary/10"
            />
            <ArrowRight className="size-3 text-muted-foreground/30 shrink-0" />
            <FlowStep
              icon={<MessageSquare className="size-4 text-success" />}
              label="CRM Sync"
              color="bg-success/10 ring-success/10"
            />
            <ArrowRight className="size-3 text-muted-foreground/30 shrink-0" />
            <FlowStep
              icon={<Bell className="size-4 text-accent" />}
              label="Notify"
              color="bg-accent/10 ring-accent/10"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Automation runs when leads are created
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Pipeline Overview
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lead distribution by stage
            </p>
          </div>
          {hasPipeline ? (
            <DonutChart segments={donutData} size={160} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="size-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No pipeline data yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add leads to see your pipeline distribution
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {hasPipeline && (
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm lg:col-span-2">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Lead Volume
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pipeline distribution by stage
              </p>
            </div>
            <BarChart data={donutData} height={200} />
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h3>
          </div>
          {activities && activities.length > 0 ? (
            <div className="space-y-3 mt-3">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <BarChart3 className="size-3.5 text-primary" />
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="size-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Automation events will appear here after your first lead is
                processed
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              AI Insights
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actionable intelligence
            </p>
          </div>
          <AIInsights />
        </div>
      </div>

      {totalLeads === 0 && !hasPipeline && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Get started with your first lead
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a lead or connect an integration to begin building your
                pipeline.
              </p>
            </div>
            <Link
              href="/leads"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
            >
              <UserPlus className="size-3.5" /> Add Lead
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 shadow-sm"
      style={{ borderTopColor: accent, borderTopWidth: 2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function FlowStep({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl ring-1",
          color,
        )}
      >
        {icon}
      </div>
      <span className="text-[0.625rem] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
