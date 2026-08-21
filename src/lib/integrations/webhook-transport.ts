import "server-only";

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";

import type {
  AutomationWebhookEvent,
  AutomationWebhookProviderId,
} from "@/lib/integrations/types";
import { resolveWebhookTarget } from "@/lib/integrations/webhook-security";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

export interface SafeWebhookDeliveryResult {
  ok: boolean;
  status: number | null;
  retryable: boolean;
  errorCode: string | null;
  retryAfterMs: number | null;
}

function retryAfterMilliseconds(
  value: string | string[] | undefined,
): number | null {
  if (!value || Array.isArray(value)) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, 60 * 60 * 1_000);
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.min(Math.max(date - Date.now(), 0), 60 * 60 * 1_000);
}

export function classifyWebhookStatus(
  status: number,
  retryAfter: string | string[] | undefined,
): SafeWebhookDeliveryResult {
  if (status >= 200 && status < 300) {
    return {
      ok: true,
      status,
      retryable: false,
      errorCode: null,
      retryAfterMs: null,
    };
  }

  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return {
      ok: false,
      status,
      retryable: true,
      errorCode: status === 429 ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE",
      retryAfterMs: retryAfterMilliseconds(retryAfter),
    };
  }

  return {
    ok: false,
    status,
    retryable: false,
    errorCode:
      status >= 300 && status < 400
        ? "REDIRECT_NOT_ALLOWED"
        : status === 401 || status === 403
          ? "INVALID_CREDENTIALS"
          : status === 404 || status === 410
            ? "ENDPOINT_INACTIVE"
            : "REQUEST_REJECTED",
    retryAfterMs: null,
  };
}

export async function deliverAutomationWebhook(params: {
  provider: AutomationWebhookProviderId;
  url: string;
  event: AutomationWebhookEvent;
  authHeaders?: Record<string, string>;
}): Promise<SafeWebhookDeliveryResult> {
  let target;
  try {
    target = await resolveWebhookTarget(params.url, params.provider);
  } catch {
    return {
      ok: false,
      status: null,
      retryable: false,
      errorCode: "INVALID_WEBHOOK_URL",
      retryAfterMs: null,
    };
  }

  const body = JSON.stringify(params.event);
  const headers: Record<string, string | number> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "User-Agent": "Revora-Integrations/1.0",
    "X-Revora-Event-Id": params.event.id,
    "X-Revora-Event-Type": params.event.type,
    ...params.authHeaders,
  };

  const pinnedLookup = ((
    _hostname: string,
    options: unknown,
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | Array<{ address: string; family: number }>,
      family?: number,
    ) => void,
  ) => {
    const returnAll =
      typeof options === "object" &&
      options !== null &&
      "all" in options &&
      options.all === true;

    if (returnAll) {
      callback(null, [{ address: target.address, family: target.family }]);
      return;
    }

    callback(null, target.address, target.family);
  }) as LookupFunction;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: SafeWebhookDeliveryResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const transport =
      target.url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = transport(
      {
        protocol: target.url.protocol,
        hostname: target.url.hostname,
        port: target.url.port || undefined,
        path: `${target.url.pathname}${target.url.search}`,
        method: "POST",
        headers,
        lookup: pinnedLookup,
      },
      (response) => {
        let receivedBytes = 0;

        response.on("data", (chunk: Buffer | string) => {
          receivedBytes += Buffer.byteLength(chunk);
          if (receivedBytes > MAX_RESPONSE_BYTES) {
            response.destroy();
            finish({
              ok: false,
              status: response.statusCode ?? null,
              retryable: false,
              errorCode: "RESPONSE_TOO_LARGE",
              retryAfterMs: null,
            });
          }
        });

        response.on("end", () => {
          finish(
            classifyWebhookStatus(
              response.statusCode ?? 502,
              response.headers["retry-after"],
            ),
          );
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("Webhook request timed out"));
      finish({
        ok: false,
        status: null,
        retryable: true,
        errorCode: "REQUEST_TIMEOUT",
        retryAfterMs: null,
      });
    });

    request.on("error", () => {
      finish({
        ok: false,
        status: null,
        retryable: true,
        errorCode: "NETWORK_ERROR",
        retryAfterMs: null,
      });
    });

    request.end(body);
  });
}
