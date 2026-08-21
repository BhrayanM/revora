import "server-only";

import type { QualificationResult } from "@/lib/ai/qualification";
import {
  getDecryptedCredentials,
  markConnectionError,
  markConnectionHealthy,
} from "@/lib/integrations/connections";
import { shouldSendSlackHotAlert } from "@/lib/integrations/slack-contract";
import type { IntegrationErrorCategory } from "@/lib/integrations/types";
import { sendHOTLeadAlert } from "@/lib/notifications/slack";
import type { Lead } from "@/lib/queries/leads";

function buildLeadUrl(leadId: string): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return undefined;

  try {
    const baseUrl = new URL(appUrl);
    if (!["http:", "https:"].includes(baseUrl.protocol)) return undefined;
    return new URL(`/leads/${encodeURIComponent(leadId)}`, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function normalizeDeliveryError(
  error: string | undefined,
): IntegrationErrorCategory {
  if (!error) return "INVALID_RESPONSE";
  if (error === "Invalid Slack webhook URL") return "CONFIGURATION_ERROR";
  if (error === "Slack request timed out" || error === "Slack request failed") {
    return "NETWORK_ERROR";
  }
  if (error === "Slack response was too large") return "INVALID_RESPONSE";
  if (/Slack returned 429$/.test(error)) return "RATE_LIMITED";
  if (/Slack returned 5\d\d$/.test(error)) return "PROVIDER_UNAVAILABLE";
  if (/Slack returned (401|403|404|410)$/.test(error)) {
    return "INVALID_CREDENTIALS";
  }
  return "INVALID_RESPONSE";
}

export async function notifySlackForHOTLead(input: {
  organizationId: string;
  lead: Lead;
  qualification: QualificationResult;
}): Promise<"sent" | "skipped" | "failed"> {
  if (!shouldSendSlackHotAlert(input.qualification.temperature)) {
    return "skipped";
  }

  try {
    const credentials = await getDecryptedCredentials(
      input.organizationId,
      "slack",
    );
    const webhookUrl = credentials?.["webhook_url"];
    if (typeof webhookUrl !== "string" || !webhookUrl) return "skipped";

    const delivery = await sendHOTLeadAlert(webhookUrl, {
      first_name: input.lead.first_name,
      last_name: input.lead.last_name,
      email: input.lead.email,
      phone: input.lead.phone,
      company: input.lead.company,
      score: input.qualification.score,
      temperature: input.qualification.temperature,
      summary: input.qualification.summary,
      recommendedAction: input.qualification.recommendedAction,
      source: input.lead.source,
      lead_url: buildLeadUrl(input.lead.id),
    });

    if (delivery.success) {
      await markConnectionHealthy(input.organizationId, "slack");
      return "sent";
    }

    await markConnectionError(
      input.organizationId,
      "slack",
      normalizeDeliveryError(delivery.error),
    );
    return "failed";
  } catch {
    try {
      await markConnectionError(input.organizationId, "slack", "NETWORK_ERROR");
    } catch {
      // Notification health persistence must not affect qualification.
    }
    return "failed";
  }
}
