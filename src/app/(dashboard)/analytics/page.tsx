import { ArrowUp, BarChart3, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";

import { BarChart, LineChart } from "@/components/dashboard/charts";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const stats = [
  {
    label: "Lead Conversion",
    value: "24.8%",
    change: 8.7,
    icon: <TrendingUp className="size-5 text-success" />,
  },
  {
    label: "Avg. Response Time",
    value: "3.2m",
    change: -15.3,
    changeLabel: "faster",
    icon: <BarChart3 className="size-5 text-primary" />,
  },
  {
    label: "Meetings/Lead",
    value: "0.42",
    change: 5.1,
    icon: <Users className="size-5 text-secondary" />,
  },
];

const monthlyLeads = [
  { label: "Jan", value: 420 },
  { label: "Feb", value: 380 },
  { label: "Mar", value: 510 },
  { label: "Apr", value: 480 },
  { label: "May", value: 560 },
  { label: "Jun", value: 620 },
  { label: "Jul", value: 720 },
];

const sources = [
  { label: "Website", value: 520, color: "rgb(99 102 241)" },
  { label: "Referral", value: 280, color: "rgb(16 185 129)" },
  { label: "LinkedIn", value: 180, color: "rgb(6 182 212)" },
  { label: "Email", value: 140, color: "rgb(139 92 246)" },
  { label: "Events", value: 80, color: "rgb(245 158 11)" },
];

const conversionData = [
  { label: "New", value: 420, color: "rgb(99 102 241)" },
  { label: "Contacted", value: 380, color: "rgb(6 182 212)" },
  { label: "Qualified", value: 240, color: "rgb(16 185 129)" },
  { label: "Proposal", value: 120, color: "rgb(245 158 11)" },
  { label: "Won", value: 85, color: "rgb(139 92 246)" },
];

export const metadata: Metadata = {
  title: "Analytics — AI Growth Platform",
};

export default function AnalyticsPage() {
  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track performance, conversions, and lead sources.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatWidget key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Lead Volume
                </h3>
                <p className="text-sm text-zinc-500">Monthly new leads</p>
              </div>
              <Badge variant="default" size="sm">
                <ArrowUp className="size-3" /> +18.2%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              data={monthlyLeads}
              height={240}
              color="rgb(99 102 241)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Lead Sources
                </h3>
                <p className="text-sm text-zinc-500">By acquisition channel</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart data={sources} height={240} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h3 className="text-base font-semibold text-foreground">
              Conversion Funnel
            </h3>
            <p className="text-sm text-zinc-500">Pipeline stages</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionData.map((stage, i) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground">{stage.label}</span>
                    <span className="text-zinc-500">{stage.value}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-secondary">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(stage.value / conversionData[0]!.value) * 100}%`,
                        backgroundColor: stage.color,
                        opacity: 1 - i * 0.15,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Source Performance
                </h3>
                <p className="text-sm text-zinc-500">
                  Detailed breakdown by channel
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-zinc-500">Source</th>
                    <th className="pb-3 font-medium text-zinc-500">Leads</th>
                    <th className="pb-3 font-medium text-zinc-500">Conv.</th>
                    <th className="pb-3 font-medium text-zinc-500">Revenue</th>
                    <th className="pb-3 font-medium text-zinc-500">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      source: "Website",
                      leads: 520,
                      conv: "26.4%",
                      revenue: "$48.2k",
                      trend: "+12%",
                    },
                    {
                      source: "Referral",
                      leads: 280,
                      conv: "32.1%",
                      revenue: "$32.8k",
                      trend: "+18%",
                    },
                    {
                      source: "LinkedIn",
                      leads: 180,
                      conv: "18.7%",
                      revenue: "$15.4k",
                      trend: "+5%",
                    },
                    {
                      source: "Email",
                      leads: 140,
                      conv: "22.3%",
                      revenue: "$11.2k",
                      trend: "-3%",
                    },
                    {
                      source: "Events",
                      leads: 80,
                      conv: "28.9%",
                      revenue: "$9.6k",
                      trend: "+8%",
                    },
                  ].map((row) => (
                    <tr key={row.source} className="border-b border-border">
                      <td className="py-3 font-medium text-foreground">
                        {row.source}
                      </td>
                      <td className="py-3 text-zinc-600">{row.leads}</td>
                      <td className="py-3 text-zinc-600">{row.conv}</td>
                      <td className="py-3 text-zinc-600">{row.revenue}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            row.trend.startsWith("+") ? "success" : "error"
                          }
                          size="sm"
                        >
                          {row.trend}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
