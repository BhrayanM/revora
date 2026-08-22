import { Activity, AlertCircle, Bot, CheckCircle2, Plug } from "lucide-react";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import type { ActivityItem } from "@/lib/product-ux/activity";
import {
  DEFAULT_TIME_ZONE,
  isValidIanaTimeZone,
} from "@/lib/product-ux/preferences";
import { getOrganizationActivity } from "@/lib/queries/activity-center";
import { cn } from "@/lib/utils";

function activityIcon(item: ActivityItem) {
  if (item.category === "lead") return Bot;
  if (item.category === "integration") return Plug;
  if (item.tone === "error") return AlertCircle;
  if (item.tone === "success") return CheckCircle2;
  return Activity;
}

function toneClass(tone: ActivityItem["tone"]): string {
  if (tone === "success") return "bg-success/10 text-success";
  if (tone === "warning") return "bg-warning/10 text-warning";
  if (tone === "error") return "bg-error/10 text-error";
  return "bg-primary/10 text-primary";
}

export default async function NotificationsPage() {
  const authorization =
    await requireCurrentOrganizationPermission("dashboard.read");

  if (!authorization.data) {
    return (
      <Container className="max-w-none px-0">
        <Alert variant="error">Activity Center is unavailable.</Alert>
      </Container>
    );
  }

  const { organization } = authorization.data;
  const settings = organization.settings as Record<string, unknown>;
  const timezone = isValidIanaTimeZone(settings.timezone)
    ? settings.timezone
    : DEFAULT_TIME_ZONE;
  const activity = await getOrganizationActivity(organization.id);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: timezone,
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
    timeZone: timezone,
  });
  const groups = new Map<string, ActivityItem[]>();
  for (const item of activity.data) {
    const label = dateFormatter.format(new Date(item.timestamp));
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }

  return (
    <Container className="max-w-none px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Activity Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent lead, automation, and integration events for this organization.
        </p>
      </div>

      {activity.partial && (
        <Alert variant="warning" className="mb-4">
          Some activity sources are unavailable for this session. The events
          below are the sources Revora could verify.
        </Alert>
      )}

      {activity.error ? (
        <Alert variant="error">{activity.error}</Alert>
      ) : activity.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-surface-secondary">
              <Activity className="size-6 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-foreground">
              No recent activity
            </h2>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Lead updates, automation deliveries, and integration health events
              will appear here after they occur.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([date, items], groupIndex) => (
            <section
              key={date}
              aria-labelledby={`activity-group-${groupIndex}`}
            >
              <h2
                id={`activity-group-${groupIndex}`}
                className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {date}
              </h2>
              <Card>
                <ul className="divide-y divide-border">
                  {items.map((item) => {
                    const Icon = activityIcon(item);
                    const content = (
                      <>
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            toneClass(item.tone),
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.detail}
                          </span>
                        </span>
                        <time
                          dateTime={item.timestamp}
                          className="shrink-0 text-xs text-muted-foreground"
                        >
                          {timeFormatter.format(new Date(item.timestamp))}
                        </time>
                      </>
                    );
                    return (
                      <li key={item.id}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5">
                            {content}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
