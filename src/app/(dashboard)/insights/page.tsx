import {
  ArrowRight,
  Brain,
  Flame,
  Sparkles,
  ThermometerSun,
} from "lucide-react";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import {
  buildAIInsightSummary,
  type InsightTemperature,
} from "@/lib/product-ux/ai-insights";
import { createClient } from "@/lib/supabase/server";

const INSIGHT_PAGE_SIZE = 500;
const MAX_ANALYZED_LEADS = 5_000;

function temperatureVariant(temperature: InsightTemperature) {
  if (temperature === "HOT") return "error" as const;
  if (temperature === "WARM") return "warning" as const;
  return "default" as const;
}

export default async function InsightsPage() {
  const authorization =
    await requireCurrentOrganizationPermission("analytics.read");
  if (!authorization.data) {
    return (
      <Container className="max-w-none px-0">
        <Alert variant="error">AI Insights is unavailable.</Alert>
      </Container>
    );
  }

  const { organization } = authorization.data;
  const supabase = await createClient();
  const countResponse = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);
  if (countResponse.error || countResponse.count === null) {
    console.error("[AIInsights] Lead count failed");
    return (
      <Container className="max-w-none px-0">
        <Alert variant="error">AI Insights is temporarily unavailable.</Alert>
      </Container>
    );
  }

  const totalAvailable = countResponse.count;
  const analyzedCount = Math.min(totalAvailable, MAX_ANALYZED_LEADS);
  const pageStarts = Array.from(
    { length: Math.ceil(analyzedCount / INSIGHT_PAGE_SIZE) },
    (_, index) => index * INSIGHT_PAGE_SIZE,
  );
  const pageResponses = await Promise.all(
    pageStarts.map((start) =>
      supabase
        .from("leads")
        .select(
          "id, first_name, last_name, company, score, updated_at, metadata",
        )
        .eq("organization_id", organization.id)
        .order("updated_at", { ascending: false })
        .range(
          start,
          Math.min(start + INSIGHT_PAGE_SIZE - 1, analyzedCount - 1),
        ),
    ),
  );
  if (pageResponses.some((response) => response.error)) {
    console.error("[AIInsights] Lead page query failed");
    return (
      <Container className="max-w-none px-0">
        <Alert variant="error">AI Insights is temporarily unavailable.</Alert>
      </Container>
    );
  }
  const data = pageResponses.flatMap((response) => response.data ?? []);
  const isSample = totalAvailable > MAX_ANALYZED_LEADS;

  const summary = buildAIInsightSummary(
    (data ?? []).map((lead) => ({
      id: lead.id,
      firstName: lead.first_name,
      lastName: lead.last_name,
      company: lead.company,
      email: null,
      score: lead.score,
      updatedAt: lead.updated_at,
      metadata: lead.metadata,
    })),
  );
  const queue = summary.prioritized.slice(0, 50);

  return (
    <Container className="max-w-none px-0">
      <PageHeader
        title="AI Insights"
        description="A read-only view of qualification results already persisted on your organization's leads."
      />

      {isSample && (
        <Alert variant="info" className="mb-4">
          This workspace has {totalAvailable.toLocaleString("en-US")} leads.
          Metrics and ranking use a newest-
          {MAX_ANALYZED_LEADS.toLocaleString("en-US")} sample to keep this view
          bounded.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightMetric
          label="Qualified"
          value={summary.qualified}
          detail={`${summary.unqualified} awaiting qualification`}
          icon={<Sparkles className="size-4 text-primary" />}
        />
        <InsightMetric
          label="HOT leads"
          value={summary.temperatures.hot}
          detail="Highest-priority queue"
          icon={<Flame className="size-4 text-error" />}
        />
        <InsightMetric
          label="WARM leads"
          value={summary.temperatures.warm}
          detail="Active evaluation"
          icon={<ThermometerSun className="size-4 text-warning" />}
        />
        <InsightMetric
          label="Average score"
          value={`${summary.averageScore}/100`}
          detail="Qualified leads only"
          icon={<Brain className="size-4 text-secondary" />}
        />
      </div>

      <div className="mt-6">
        {queue.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Brain className="size-6" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-foreground">
                No persisted qualification results
              </h2>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Open a lead and run qualification to create a score, buying
                signals, risks, and a recommended next action.
              </p>
              <Link
                href="/leads"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Review leads <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Prioritized lead queue
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ordered by temperature, score, and most recent update.
                </p>
              </div>
              {summary.prioritized.length > queue.length && (
                <p className="text-xs text-muted-foreground">
                  Showing top {queue.length} of {summary.prioritized.length}
                </p>
              )}
            </div>
            <div className="grid gap-4 2xl:grid-cols-2">
              {queue.map((lead) => (
                <Card key={lead.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={lead.href}
                          className="font-semibold text-foreground outline-none hover:text-primary focus-visible:rounded focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {lead.name}
                        </Link>
                        {lead.company && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {lead.company}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={temperatureVariant(lead.temperature)}
                          size="sm"
                        >
                          {lead.temperature}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          {lead.score}/100
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {lead.summary}
                    </p>
                    <div className="rounded-xl bg-primary/5 p-3">
                      <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-primary">
                        Recommended action
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {lead.recommendedAction}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SignalList
                        title="Buying signals"
                        items={lead.buyingSignals}
                        empty="No signals recorded"
                      />
                      <SignalList
                        title="Risks"
                        items={lead.risks}
                        empty="No risks recorded"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

function InsightMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-surface-secondary">
            {icon}
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SignalList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
