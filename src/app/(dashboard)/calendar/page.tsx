import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { listUpcomingGoogleCalendarEvents } from "@/lib/integrations/adapters/google-workspace";
import {
  DEFAULT_TIME_ZONE,
  isValidIanaTimeZone,
} from "@/lib/product-ux/preferences";
import { createClient } from "@/lib/supabase/server";

import { CalendarContent, type CalendarLeadOption } from "./calendar-content";

export default async function CalendarPage() {
  const authorization =
    await requireCurrentOrganizationPermission("leads.read");
  if (!authorization.data) {
    return (
      <Container className="max-w-none px-0">
        <Alert variant="error">Calendar is unavailable.</Alert>
      </Container>
    );
  }

  const { organization } = authorization.data;
  const rawSettings = organization.settings;
  const settings =
    rawSettings &&
    typeof rawSettings === "object" &&
    !Array.isArray(rawSettings)
      ? (rawSettings as Record<string, unknown>)
      : {};
  const timezone = isValidIanaTimeZone(settings.timezone)
    ? settings.timezone
    : DEFAULT_TIME_ZONE;
  const supabase = await createClient();
  const [calendar, leadResponse] = await Promise.all([
    listUpcomingGoogleCalendarEvents(organization.id),
    supabase
      .from("leads")
      .select("id, first_name, last_name, email")
      .eq("organization_id", organization.id)
      .not("email", "is", null)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);
  if (leadResponse.error) {
    console.error(
      "[Calendar] Lead options failed:",
      leadResponse.error.message,
    );
  }
  const leads: CalendarLeadOption[] = (leadResponse.data ?? []).flatMap(
    (lead) => {
      if (!lead.email) return [];
      const name = `${lead.first_name} ${lead.last_name}`.trim();
      return [{ id: lead.id, name: name || "Unnamed lead", email: lead.email }];
    },
  );

  return (
    <Container className="max-w-none px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the next 30 days and schedule a bounded Google Calendar event.
        </p>
      </div>
      <CalendarContent
        events={calendar.success ? calendar.events : []}
        leads={leads}
        timezone={timezone}
        calendarError={calendar.success ? null : calendar.error}
      />
    </Container>
  );
}
