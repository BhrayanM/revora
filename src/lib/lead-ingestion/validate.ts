import type { InboundLeadPayload } from "@/lib/lead-ingestion/types";

const MAX_STRING_LENGTHS: Record<string, number> = {
  name: 200,
  email: 320,
  phone: 50,
  company: 200,
  message: 5000,
  source_id: 255,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateInboundPayload(body: unknown): {
  data: InboundLeadPayload | null;
  error: string | null;
} {
  if (!isRecord(body)) {
    return { data: null, error: "Request body must be a JSON object" };
  }

  const data: InboundLeadPayload = {};

  for (const field of [
    "name",
    "email",
    "phone",
    "company",
    "message",
    "source_id",
  ]) {
    const raw = body[field];

    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      return { data: null, error: `${field} must be a string` };
    }

    if (typeof raw === "string") {
      const max = MAX_STRING_LENGTHS[field] ?? 500;
      if (raw.length > max) {
        return {
          data: null,
          error: `${field} exceeds maximum length of ${max}`,
        };
      }
    }
  }

  if (
    body["email"] !== undefined &&
    body["email"] !== null &&
    typeof body["email"] === "string"
  ) {
    const email = body["email"] as string;
    if (!email.includes("@") || email.length > 320) {
      return { data: null, error: "Invalid email format" };
    }
  }

  if (body["name"] !== undefined && typeof body["name"] === "string") {
    data.name = body["name"] as string;
  }

  if (body["email"] !== undefined && typeof body["email"] === "string") {
    data.email = body["email"] as string;
  }

  if (body["phone"] !== undefined && typeof body["phone"] === "string") {
    data.phone = body["phone"] as string;
  }

  if (body["company"] !== undefined && typeof body["company"] === "string") {
    data.company = body["company"] as string;
  }

  if (body["message"] !== undefined && typeof body["message"] === "string") {
    data.message = body["message"] as string;
  }

  if (
    body["source_id"] !== undefined &&
    typeof body["source_id"] === "string"
  ) {
    data.source_id = body["source_id"] as string;
  }

  if (body["metadata"] !== undefined) {
    if (!isRecord(body["metadata"])) {
      return { data: null, error: "metadata must be an object" };
    }
    data.metadata = body["metadata"] as Record<string, unknown>;
  }

  return { data, error: null };
}
