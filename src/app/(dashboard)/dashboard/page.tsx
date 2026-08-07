import { BarChart3, TrendingUp, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";

import { AIInsights } from "@/components/dashboard/ai-insights";
import { BarChart, DonutChart, LineChart } from "@/components/dashboard/charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — AI Growth Platform",
};

const stats = [
  {
    label: "Total Leads",
    value: "2,847",
    change: 12.5,
    icon: <Users className="size-5 text-primary" />,
  },
  {
    label: "Qualified Leads",
    value: "1,423",
    change: 23.1,
    icon: <TrendingUp className="size-5 text-success" />,
  },
  {
    label: "Meetings Booked",
    value: "486",
    change: -3.2,
    icon: <BarChart3 className="size-5 text-secondary" />,
  },
  {
    label: "Conversion Rate",
    value: "24.8%",
    change: 8.7,
    icon: <UserPlus className="size-5 text-accent" />,
  },
];

const barData = [
  { label: "Mon", value: 42, color: "rgb(99 102 241)" },
  { label: "Tue", value: 58, color: "rgb(99 102 241)" },
  { label: "Wed", value: 35, color: "rgb(99 102 241)" },
  { label: "Thu", value: 72, color: "rgb(99 102 241)" },
  { label: "Fri", value: 65, color: "rgb(99 102 241)" },
  { label: "Sat", value: 28, color: "rgb(99 102 241)" },
  { label: "Sun", value: 20, color: "rgb(99 102 241)" },
];

const lineData = [
  { label: "Jan", value: 180 },
  { label: "Feb", value: 220 },
  { label: "Mar", value: 260 },
  { label: "Apr", value: 310 },
  { label: "May", value: 290 },
  { label: "Jun", value: 380 },
  { label: "Jul", value: 420 },
];

const donutData = [
  { label: "New", value: 420, color: "rgb(99 102 241)" },
  { label: "Qualified", value: 310, color: "rgb(16 185 129)" },
  { label: "Contacted", value: 200, color: "rgb(6 182 212)" },
  { label: "Won", value: 145, color: "rgb(139 92 246)" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userMeta = user?.user_metadata as { full_name?: string } | undefined;
  const displayName =
    userMeta?.full_name ?? user?.email?.split("@")[0] ?? "User";

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Welcome back, {displayName}. Here&apos;s what&apos;s happening today.
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
                  Revenue Over Time
                </h3>
                <p className="text-sm text-zinc-500">Monthly lead volume</p>
              </div>
              <Badge variant="default" size="sm">
                +15.2%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart data={lineData} height={240} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Lead Distribution
            </h3>
            <p className="text-sm text-zinc-500">By status</p>
          </CardHeader>
          <CardContent>
            <DonutChart segments={donutData} size={180} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Leads This Week
            </h3>
            <p className="text-sm text-zinc-500">Daily new leads</p>
          </CardHeader>
          <CardContent>
            <BarChart data={barData} height={180} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Recent Activity
            </h3>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              AI Insights
            </h3>
            <p className="text-sm text-zinc-500">
              Actionable intelligence from your data
            </p>
          </CardHeader>
          <CardContent>
            <AIInsights />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Upcoming Calendar
            </h3>
            <p className="text-sm text-zinc-500">Meetings & follow-ups</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
                <BarChart3 className="size-6 text-zinc-400" />
              </div>
              <h4 className="mt-4 text-sm font-medium text-foreground">
                Calendar Integration
              </h4>
              <p className="mt-1 max-w-xs text-xs text-zinc-500">
                Connect Google Calendar or Outlook to see your schedule and
                automatically book meetings.
              </p>
              <p className="mt-3 text-xs font-medium text-primary">
                Calendar integration launching soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
