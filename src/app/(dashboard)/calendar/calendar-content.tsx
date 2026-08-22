"use client";

import { CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { GoogleCalendarEventSummary } from "@/lib/integrations/google-workspace-contract";

import {
  createCalendarAppointmentAction,
  type CalendarActionState,
} from "./actions";

export interface CalendarLeadOption {
  id: string;
  name: string;
  email: string;
}

const INITIAL_STATE: CalendarActionState = { status: "idle", message: "" };

function formatEventStart(
  event: GoogleCalendarEventSummary,
  timezone: string,
): string {
  if (event.allDay) {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${event.start}T00:00:00.000Z`));
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(event.start));
}

export function CalendarContent({
  events,
  leads,
  timezone,
  calendarError,
  initialLeadId,
}: {
  events: GoogleCalendarEventSummary[];
  leads: CalendarLeadOption[];
  timezone: string;
  calendarError: string | null;
  initialLeadId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createCalendarAppointmentAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            Upcoming events
          </h2>
          <p className="text-sm text-muted-foreground">
            Primary calendar · next 30 days · {timezone.replace(/_/g, " ")}
          </p>
        </CardHeader>
        <CardContent>
          {calendarError ? (
            <div className="space-y-4">
              <Alert variant="warning">{calendarError}</Alert>
              <Link
                href="/settings?tab=integrations"
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary"
              >
                Review Google Workspace connection
              </Link>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="size-6" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                No upcoming events
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Your next 30 days are clear. Create an appointment from this
                workspace when you are ready.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-foreground">
                      {event.summary}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      <time dateTime={event.start}>
                        {event.allDay
                          ? `${formatEventStart(event, timezone)} · All day`
                          : formatEventStart(event, timezone)}
                      </time>
                    </p>
                    {event.location && (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        {event.location}
                      </p>
                    )}
                    {event.attendeeCount > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserRound className="size-3.5" />
                        {event.attendeeCount} attendee
                        {event.attendeeCount === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            Create appointment
          </h2>
          <p className="text-sm text-muted-foreground">
            Creates one event. Failed requests are never retried automatically.
          </p>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-4">
            <Input label="Title" name="summary" maxLength={200} required />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Input
                label="Start"
                name="start"
                type="datetime-local"
                required
              />
              <Input label="End" name="end" type="datetime-local" required />
            </div>
            <input type="hidden" name="timezone" value={timezone} />
            <SelectField
              label="Invite a lead"
              name="lead_id"
              defaultValue={initialLeadId ?? ""}
              helperText="Optional. Revora rechecks the selected lead before using its email."
            >
              <option value="">No attendee</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} · {lead.email}
                </option>
              ))}
            </SelectField>
            <Input label="Location" name="location" maxLength={500} />
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              Description
              <textarea
                name="description"
                maxLength={2000}
                rows={4}
                className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {state.message && (
              <div aria-live="polite">
                <Alert
                  variant={state.status === "success" ? "success" : "error"}
                >
                  {state.message}
                </Alert>
              </div>
            )}
            <Button
              type="submit"
              loading={pending}
              disabled={Boolean(calendarError)}
              className="w-full"
            >
              Create appointment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
