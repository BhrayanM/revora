import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { hasOrganizationPermission } from "@/lib/auth/permissions";
import { listUpcomingGoogleCalendarEvents } from "@/lib/integrations/adapters/google-workspace";
import {
  DEFAULT_TIME_ZONE,
  isValidIanaTimeZone,
} from "@/lib/product-ux/preferences";
import { createClient } from "@/lib/supabase/server";

import { CalendarContent, type CalendarLeadOption } from "./calendar-content";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string | string[] }>;
}) {
  const params = await searchParams;
  const authorization =
    await requireCurrentOrganizationPermission("leads.read");
  if (!authorization.data) {
    return (
      <Container className="max-w-none px-0">
        <Alert variant="error">Calendar is unavailable.</Alert>
      </Container>
    );
  }

  const { membership, organization } = authorization.data;
  const canCreateAppointments = hasOrganizationPermission(
    membership.role,
    "leads.write",
  );
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
  const calendarPromise = listUpcomingGoogleCalendarEvents(organization.id);
  const leadResponse = canCreateAppointments
    ? await supabase
        .from("leads")
        .select("id, first_name, last_name, email")
        .eq("organization_id", organization.id)
        .not("email", "is", null)
        .order("updated_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };
  const calendar = await calendarPromise;
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
  const requestedLeadId =
    typeof params.lead === "string" ? params.lead : undefined;
  const initialLeadId = leads.some((lead) => lead.id === requestedLeadId)
    ? requestedLeadId
    : undefined;

  return (
    <Container className="max-w-none px-0">
      <PageHeader
        title="Calendar"
        description="Review the next 30 days and schedule a bounded Google Calendar event."
      />
      <CalendarContent
        events={calendar.success ? calendar.events : []}
        leads={leads}
        timezone={timezone}
        calendarError={calendar.success ? null : calendar.error}
        initialLeadId={initialLeadId}
        canCreateAppointments={canCreateAppointments}
      />
    </Container>
  );
}
