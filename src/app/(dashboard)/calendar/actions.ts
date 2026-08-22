"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { createGoogleCalendarAppointment } from "@/lib/integrations/adapters/google-workspace";
import { zonedLocalDateTimeToIso } from "@/lib/product-ux/datetime";
import { createClient } from "@/lib/supabase/server";

export interface CalendarActionState {
  status: "idle" | "success" | "error";
  message: string;
}

function getText(formData: FormData, name: string, maxLength: number): string {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength + 1);
}

export async function createCalendarAppointmentAction(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const authorization =
    await requireCurrentOrganizationPermission("leads.write");
  if (!authorization.data) {
    return {
      status: "error",
      message: authorization.error ?? "Appointment creation is unavailable.",
    };
  }

  const { organization, membership } = authorization.data;
  const summary = getText(formData, "summary", 200);
  const description = getText(formData, "description", 2000);
  const location = getText(formData, "location", 500);
  const localStart = getText(formData, "start", 16);
  const localEnd = getText(formData, "end", 16);
  const timeZone = getText(formData, "timezone", 100);
  const leadId = getText(formData, "lead_id", 36);

  let start: string;
  let end: string;
  try {
    start = zonedLocalDateTimeToIso(localStart, timeZone);
    end = zonedLocalDateTimeToIso(localEnd, timeZone);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Appointment date and time are invalid.",
    };
  }

  let attendee: string | undefined;
  if (leadId) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        leadId,
      )
    ) {
      return { status: "error", message: "Selected lead is invalid." };
    }
    const supabase = await createClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, email")
      .eq("organization_id", organization.id)
      .eq("id", leadId)
      .maybeSingle();
    if (error) {
      console.error("[Calendar] Lead lookup failed:", error.message);
      return { status: "error", message: "Selected lead is unavailable." };
    }
    if (!lead?.email) {
      return {
        status: "error",
        message: "Selected lead does not have an email address.",
      };
    }
    attendee = lead.email;
  }

  const result = await createGoogleCalendarAppointment(
    organization.id,
    {
      summary,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
      start,
      end,
      timeZone,
      ...(attendee ? { attendee } : {}),
    },
    membership.profile_id,
  );
  if (!result.success) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/calendar");
  revalidatePath("/notifications");
  return { status: "success", message: "Appointment created." };
}
