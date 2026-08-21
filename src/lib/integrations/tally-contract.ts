import { createHmac, timingSafeEqual } from "node:crypto";

const TALLY_ID_PATTERN = /^[A-Za-z0-9_-]{1,255}$/;
const SUPPORTED_FIELD_TYPES = new Set([
  "INPUT_TEXT",
  "INPUT_EMAIL",
  "INPUT_PHONE_NUMBER",
  "INPUT_NUMBER",
  "TEXTAREA",
]);
const MAPPING_KEYS = ["name", "email", "phone", "company", "message"] as const;

type TallyMappingKey = (typeof MAPPING_KEYS)[number];

export interface TallyFormSummary {
  id: string;
  name: string;
  status: "BLANK" | "DRAFT" | "PUBLISHED";
  isClosed: boolean;
}

export interface TallyFieldOption {
  id: string;
  label: string;
  type: string;
}

export type TallyFieldMapping = Partial<Record<TallyMappingKey, string>>;

export interface TallyWebhookField {
  key: string;
  label: string;
  type: string;
  value: unknown;
}

export interface TallyWebhookEvent {
  eventId: string;
  eventType: "FORM_RESPONSE";
  createdAt: string | null;
  data: {
    formId: string;
    formName: string | null;
    submissionId: string;
    fields: TallyWebhookField[];
  };
}

export interface TallyLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  source_id: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireSafeId(value: unknown, label: string): string {
  if (typeof value !== "string" || !TALLY_ID_PATTERN.test(value)) {
    throw new Error(`Tally ${label} is invalid.`);
  }
  return value;
}

function requireBoundedString(
  value: unknown,
  label: string,
  maximum: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`Tally ${label} is invalid.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new Error(`Tally ${label} is invalid.`);
  }
  return normalized;
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeTallyApiKey(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Tally API key is required.");
  }
  const normalized = value.trim();
  if (normalized.length > 4096 || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error("Tally API key is invalid.");
  }
  return normalized;
}

export function parseTallyForms(payload: unknown): TallyFormSummary[] {
  if (!isRecord(payload) || !Array.isArray(payload["items"])) {
    throw new Error("Tally returned an unexpected forms response.");
  }

  return payload["items"].flatMap((item) => {
    if (!isRecord(item)) {
      throw new Error("Tally returned an unexpected forms response.");
    }
    const status = item["status"];
    if (status === "DELETED") return [];
    if (status !== "BLANK" && status !== "DRAFT" && status !== "PUBLISHED") {
      throw new Error("Tally returned an unexpected forms response.");
    }
    if (typeof item["isClosed"] !== "boolean") {
      throw new Error("Tally returned an unexpected forms response.");
    }

    return [
      {
        id: requireSafeId(item["id"], "form ID"),
        name: requireBoundedString(item["name"], "form name", 300),
        status,
        isClosed: item["isClosed"],
      },
    ];
  });
}

export function parseTallyFields(payload: unknown): TallyFieldOption[] {
  if (!isRecord(payload) || !Array.isArray(payload["questions"])) {
    throw new Error("Tally returned an unexpected form-fields response.");
  }

  const seen = new Set<string>();
  const result: TallyFieldOption[] = [];

  for (const question of payload["questions"]) {
    if (!isRecord(question)) {
      throw new Error("Tally returned an unexpected form-fields response.");
    }
    if (question["isDeleted"] === true) continue;
    if (!Array.isArray(question["fields"])) continue;

    const questionLabel =
      typeof question["title"] === "string" ? question["title"].trim() : "";

    for (const field of question["fields"]) {
      if (!isRecord(field)) {
        throw new Error("Tally returned an unexpected form-fields response.");
      }
      const type = typeof field["type"] === "string" ? field["type"] : "";
      if (!SUPPORTED_FIELD_TYPES.has(type)) continue;

      const id = requireSafeId(field["uuid"], "field ID");
      if (seen.has(id)) continue;
      const rawLabel =
        typeof field["title"] === "string" && field["title"].trim().length > 0
          ? field["title"]
          : questionLabel;
      const label = requireBoundedString(rawLabel, "field label", 300);
      seen.add(id);
      result.push({ id, label, type });
    }
  }

  return result;
}

function findByType(
  fields: TallyFieldOption[],
  type: string,
): string | undefined {
  return fields.find((field) => field.type === type)?.id;
}

function findByLabel(
  fields: TallyFieldOption[],
  aliases: string[],
): string | undefined {
  return fields.find((field) => {
    const label = normalizeLabel(field.label);
    return aliases.some((alias) => label === alias || label.includes(alias));
  })?.id;
}

export function suggestTallyFieldMapping(
  fields: TallyFieldOption[],
): TallyFieldMapping {
  const mapping: TallyFieldMapping = {};
  mapping.email =
    findByType(fields, "INPUT_EMAIL") ??
    findByLabel(fields, ["email", "correo", "e mail"]);
  mapping.phone =
    findByType(fields, "INPUT_PHONE_NUMBER") ??
    findByLabel(fields, ["phone", "telefono", "mobile", "celular"]);
  mapping.name = findByLabel(fields, [
    "full name",
    "nombre completo",
    "contact name",
    "name",
    "nombre",
  ]);
  mapping.company = findByLabel(fields, [
    "company",
    "business",
    "empresa",
    "compania",
    "organizacion",
  ]);
  mapping.message = findByLabel(fields, [
    "message",
    "mensaje",
    "comments",
    "comentarios",
    "help",
    "consulta",
  ]);

  return Object.fromEntries(
    Object.entries(mapping).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ) as TallyFieldMapping;
}

export function validateTallyFieldMapping(
  value: unknown,
  fields: TallyFieldOption[],
): TallyFieldMapping {
  if (!isRecord(value)) {
    throw new Error("Tally field mapping is invalid.");
  }

  const knownFields = new Set(fields.map((field) => field.id));
  const used = new Set<string>();
  const mapping: TallyFieldMapping = {};

  for (const key of MAPPING_KEYS) {
    const raw = value[key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (typeof raw !== "string" || !knownFields.has(raw)) {
      throw new Error(`Tally mapping references an unknown field for ${key}.`);
    }
    if (used.has(raw)) {
      throw new Error("A Tally field cannot be mapped more than once.");
    }
    used.add(raw);
    mapping[key] = raw;
  }

  const unknownKey = Object.keys(value).find(
    (key) => !MAPPING_KEYS.includes(key as TallyMappingKey),
  );
  if (unknownKey) {
    throw new Error("Tally field mapping is invalid.");
  }
  if (!mapping.email && !mapping.phone) {
    throw new Error("Map at least an email or phone field.");
  }

  return mapping;
}

export function verifyTallySignature(
  rawPayload: string,
  receivedSignature: string | null | undefined,
  signingSecret: string,
): boolean {
  if (!receivedSignature || !signingSecret) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(receivedSignature)) return false;

  const expected = createHmac("sha256", signingSecret)
    .update(rawPayload, "utf8")
    .digest();
  const received = Buffer.from(receivedSignature, "base64");
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

export function parseTallyWebhookEvent(payload: unknown): TallyWebhookEvent {
  if (!isRecord(payload)) {
    throw new Error("Tally webhook payload is invalid.");
  }
  if (payload["eventType"] !== "FORM_RESPONSE") {
    throw new Error("Unsupported Tally event type.");
  }
  const data = payload["data"];
  if (!isRecord(data) || !Array.isArray(data["fields"])) {
    throw new Error("Tally webhook payload is invalid.");
  }

  const eventId = requireSafeId(payload["eventId"], "event ID");
  const formId = requireSafeId(data["formId"], "form ID");
  const submissionId = requireSafeId(
    data["submissionId"] ?? data["responseId"],
    "submission ID",
  );
  const fields = data["fields"].map((field) => {
    if (!isRecord(field)) {
      throw new Error("Tally webhook field is invalid.");
    }
    return {
      key: requireSafeId(field["key"], "field key"),
      label:
        typeof field["label"] === "string"
          ? field["label"].trim().slice(0, 300)
          : "",
      type:
        typeof field["type"] === "string" ? field["type"].slice(0, 100) : "",
      value: field["value"],
    };
  });

  return {
    eventId,
    eventType: "FORM_RESPONSE",
    createdAt:
      typeof payload["createdAt"] === "string" ? payload["createdAt"] : null,
    data: {
      formId,
      formName:
        typeof data["formName"] === "string"
          ? data["formName"].trim().slice(0, 300)
          : null,
      submissionId,
      fields,
    },
  };
}

const LEAD_LIMITS: Record<TallyMappingKey, number> = {
  name: 200,
  email: 320,
  phone: 50,
  company: 200,
  message: 5000,
};

function normalizeMappedValue(
  value: unknown,
  key: TallyMappingKey,
): string | undefined {
  let normalized: string;
  if (typeof value === "string") normalized = value.trim();
  else if (typeof value === "number" && Number.isFinite(value)) {
    normalized = String(value);
  } else if (typeof value === "boolean") normalized = String(value);
  else if (value === null || value === undefined) return undefined;
  else throw new Error(`Tally ${key} field has an unsupported value.`);

  if (normalized.length === 0) return undefined;
  if (normalized.length > LEAD_LIMITS[key]) {
    throw new Error(`Tally ${key} field exceeds its maximum length.`);
  }
  if (key === "email" && !normalized.includes("@")) {
    throw new Error("Tally email field is invalid.");
  }
  return normalized;
}

export function mapTallyEventToLeadInput(
  event: TallyWebhookEvent,
  mapping: TallyFieldMapping,
  expectedFormId: string,
): TallyLeadInput {
  if (event.data.formId !== expectedFormId) {
    throw new Error("Tally webhook form does not match the configured form.");
  }

  const result: Partial<Record<TallyMappingKey, string>> = {};
  for (const key of MAPPING_KEYS) {
    const fieldId = mapping[key];
    if (!fieldId) continue;
    const field = event.data.fields.find(
      (candidate) => candidate.key === fieldId,
    );
    if (!field) continue;
    const normalized = normalizeMappedValue(field.value, key);
    if (normalized !== undefined) result[key] = normalized;
  }

  if (!result.email && !result.phone) {
    throw new Error("Tally submission requires an email or phone value.");
  }
  const sourceId = `tally:${event.data.formId}:${event.data.submissionId}`;
  if (sourceId.length > 255) {
    throw new Error("Tally submission identifier is too long.");
  }

  return { ...result, source_id: sourceId };
}
