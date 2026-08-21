import "server-only";

import {
  normalizeTallyApiKey,
  parseTallyFields,
  parseTallyForms,
  type TallyFieldOption,
  type TallyFormSummary,
} from "@/lib/integrations/tally-contract";
import type { IntegrationErrorCategory } from "@/lib/integrations/types";

const TALLY_API_ORIGIN = "https://api.tally.so";
const TALLY_API_VERSION = "2025-02-01";
const TALLY_TIMEOUT_MS = 15_000;
const TALLY_MAX_RESPONSE_BYTES = 1024 * 1024;
const TALLY_ID_PATTERN = /^[A-Za-z0-9_-]{1,255}$/;

type TallyFetch = typeof fetch;
type TallyFailure = { ok: false; errorCode: IntegrationErrorCategory };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type TallyFormsResult =
  { ok: true; forms: TallyFormSummary[] } | TallyFailure;
export type TallyFieldsResult =
  { ok: true; fields: TallyFieldOption[] } | TallyFailure;
export type TallyCreateWebhookResult =
  { ok: true; webhook: { id: string; isEnabled: boolean } } | TallyFailure;
export type TallyVerifyWebhookResult =
  | {
      ok: true;
      webhook: { id: string; formId: string; isEnabled: boolean };
    }
  | TallyFailure;
export type TallyDeleteWebhookResult = { ok: true } | TallyFailure;

function normalizeTallyError(status: number): IntegrationErrorCategory {
  if (status === 401) return "INVALID_CREDENTIALS";
  if (status === 403) return "REAUTH_REQUIRED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  if (status >= 400 && status < 500) return "CONFIGURATION_ERROR";
  return "INVALID_RESPONSE";
}

function requireProviderId(value: unknown, label: string): string {
  if (typeof value !== "string" || !TALLY_ID_PATTERN.test(value)) {
    throw new Error(`Invalid Tally ${label}.`);
  }
  return value;
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > TALLY_MAX_RESPONSE_BYTES
    ) {
      throw new Error("Tally response was too large.");
    }
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > TALLY_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Tally response was too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function requestTally(
  path: string,
  apiKey: string,
  init: { method: "GET" | "POST" | "DELETE"; body?: string },
  fetchFn: TallyFetch,
): Promise<
  | { ok: true; status: number; payload: unknown }
  | { ok: false; errorCode: IntegrationErrorCategory }
> {
  let normalizedKey: string;
  try {
    normalizedKey = normalizeTallyApiKey(apiKey);
  } catch {
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }

  const url = new URL(path, TALLY_API_ORIGIN);
  if (url.origin !== TALLY_API_ORIGIN) {
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TALLY_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${normalizedKey}`,
        "tally-version": TALLY_API_VERSION,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(init.body ? { body: init.body } : {}),
      redirect: "error",
      signal: controller.signal,
    });
  } catch {
    return { ok: false, errorCode: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return { ok: false, errorCode: normalizeTallyError(response.status) };
  }
  if (response.status === 204) {
    return { ok: true, status: response.status, payload: null };
  }

  try {
    const text = await readBoundedText(response);
    return {
      ok: true,
      status: response.status,
      payload: JSON.parse(text) as unknown,
    };
  } catch {
    return { ok: false, errorCode: "INVALID_RESPONSE" };
  }
}

export async function listTallyForms(
  apiKey: string,
  fetchFn: TallyFetch = fetch,
): Promise<TallyFormsResult> {
  const response = await requestTally(
    "/forms?page=1&limit=500",
    apiKey,
    { method: "GET" },
    fetchFn,
  );
  if (!response.ok) return response;

  try {
    return { ok: true, forms: parseTallyForms(response.payload) };
  } catch {
    return { ok: false, errorCode: "INVALID_RESPONSE" };
  }
}

export async function getTallyFormFields(
  apiKey: string,
  formId: string,
  fetchFn: TallyFetch = fetch,
): Promise<TallyFieldsResult> {
  let safeFormId: string;
  try {
    safeFormId = requireProviderId(formId, "form ID");
  } catch {
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }
  const response = await requestTally(
    `/forms/${safeFormId}/questions`,
    apiKey,
    { method: "GET" },
    fetchFn,
  );
  if (!response.ok) return response;

  try {
    return { ok: true, fields: parseTallyFields(response.payload) };
  } catch {
    return { ok: false, errorCode: "INVALID_RESPONSE" };
  }
}

export async function createTallyWebhook(
  input: {
    apiKey: string;
    formId: string;
    webhookUrl: string;
    signingSecret: string;
    externalSubscriber?: string;
  },
  fetchFn: TallyFetch = fetch,
): Promise<TallyCreateWebhookResult> {
  let formId: string;
  let webhookUrl: URL;
  try {
    formId = requireProviderId(input.formId, "form ID");
    webhookUrl = new URL(input.webhookUrl);
    if (
      webhookUrl.protocol !== "https:" ||
      webhookUrl.username ||
      webhookUrl.password ||
      webhookUrl.hash
    ) {
      throw new Error("Invalid webhook URL.");
    }
    if (input.signingSecret.length < 16 || input.signingSecret.length > 4096) {
      throw new Error("Invalid signing secret.");
    }
  } catch {
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }

  const response = await requestTally(
    "/webhooks",
    input.apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        formId,
        url: webhookUrl.toString(),
        eventTypes: ["FORM_RESPONSE"],
        signingSecret: input.signingSecret,
        ...(input.externalSubscriber
          ? { externalSubscriber: input.externalSubscriber.slice(0, 100) }
          : {}),
      }),
    },
    fetchFn,
  );
  if (!response.ok) return response;
  if (!isRecord(response.payload)) {
    return { ok: false, errorCode: "INVALID_RESPONSE" };
  }

  try {
    return {
      ok: true,
      webhook: {
        id: requireProviderId(response.payload["id"], "webhook ID"),
        isEnabled:
          typeof response.payload["isEnabled"] === "boolean"
            ? response.payload["isEnabled"]
            : (() => {
                throw new Error("Invalid webhook status.");
              })(),
      },
    };
  } catch {
    return { ok: false, errorCode: "INVALID_RESPONSE" };
  }
}

export async function verifyTallyWebhook(
  apiKey: string,
  webhookId: string,
  formId: string,
  fetchFn: TallyFetch = fetch,
): Promise<TallyVerifyWebhookResult> {
  let safeWebhookId: string;
  let safeFormId: string;
  try {
    safeWebhookId = requireProviderId(webhookId, "webhook ID");
    safeFormId = requireProviderId(formId, "form ID");
  } catch {
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }

  for (let page = 1; page <= 10; page += 1) {
    const response = await requestTally(
      `/webhooks?page=${page}&limit=100`,
      apiKey,
      { method: "GET" },
      fetchFn,
    );
    if (!response.ok) return response;
    const payload = response.payload;
    if (
      !isRecord(payload) ||
      !Array.isArray(payload["webhooks"]) ||
      typeof payload["hasMore"] !== "boolean"
    ) {
      return { ok: false, errorCode: "INVALID_RESPONSE" };
    }

    const webhook = payload["webhooks"].find(
      (candidate) => isRecord(candidate) && candidate["id"] === safeWebhookId,
    );
    if (webhook) {
      if (
        webhook["formId"] !== safeFormId ||
        typeof webhook["isEnabled"] !== "boolean" ||
        webhook["isEnabled"] !== true
      ) {
        return { ok: false, errorCode: "CONFIGURATION_ERROR" };
      }
      return {
        ok: true,
        webhook: {
          id: safeWebhookId,
          formId: safeFormId,
          isEnabled: true,
        },
      };
    }
    if (!payload["hasMore"]) break;
  }

  return { ok: false, errorCode: "CONFIGURATION_ERROR" };
}

export async function deleteTallyWebhook(
  apiKey: string,
  webhookId: string,
  fetchFn: TallyFetch = fetch,
): Promise<TallyDeleteWebhookResult> {
  let safeWebhookId: string;
  try {
    safeWebhookId = requireProviderId(webhookId, "webhook ID");
  } catch {
    return { ok: false, errorCode: "CONFIGURATION_ERROR" };
  }
  const response = await requestTally(
    `/webhooks/${safeWebhookId}`,
    apiKey,
    { method: "DELETE" },
    fetchFn,
  );
  return response.ok ? { ok: true } : response;
}
