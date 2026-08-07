import type { InboundLeadPayload } from "@/lib/lead-ingestion/types";
import type { NormalizedLead } from "@/lib/lead-ingestion/types";

export function normalizeLead(
  payload: InboundLeadPayload,
  source: NormalizedLead["source"],
): NormalizedLead {
  const name = (payload.name ?? "").trim();

  const lastSpace = name.lastIndexOf(" ");
  const firstName =
    lastSpace > 0 ? name.slice(0, lastSpace).trim() : name || "Unknown";
  const lastName = lastSpace > 0 ? name.slice(lastSpace + 1).trim() : "";

  const normalizedEmail = payload.email?.trim().toLowerCase() || null;
  const normalizedPhone = payload.phone?.trim() || null;
  const normalizedCompany = payload.company?.trim() || null;
  const normalizedMessage = payload.message?.trim() || null;
  const sourceExternalId = payload.source_id?.trim() || null;

  const safeMetadata: Record<string, unknown> = {};
  const rawMeta = payload.metadata ?? {};
  if (
    typeof rawMeta === "object" &&
    rawMeta !== null &&
    !Array.isArray(rawMeta)
  ) {
    for (const [key, value] of Object.entries(rawMeta)) {
      if (key.length <= 100 && JSON.stringify(value).length <= 1000) {
        safeMetadata[key] = value;
      }
    }
  }

  return {
    first_name: firstName,
    last_name: lastName || "Unknown",
    email: normalizedEmail,
    phone: normalizedPhone,
    company: normalizedCompany,
    source,
    source_external_id: sourceExternalId,
    message: normalizedMessage,
    metadata: safeMetadata,
  };
}
