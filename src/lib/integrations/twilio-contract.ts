import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { IntegrationErrorCategory } from "@/lib/integrations/types";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface TwilioCredentials {
  account_sid: string;
  auth_token: string;
  phone_number?: string;
}

export type TwilioAccountValidationResult =
  | {
      ok: true;
      accountSid: string;
      friendlyName: string;
      phoneNumber?: string;
    }
  | { ok: false; errorCode: IntegrationErrorCategory };

function readCredential(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTwilioCredentials(
  input: Record<string, unknown>,
): TwilioCredentials {
  const accountSid = readCredential(input, "account_sid");
  const authToken = readCredential(input, "auth_token");
  const phoneNumber = readCredential(input, "phone_number");

  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) {
    throw new Error("Enter a valid Twilio Account SID.");
  }
  if (!authToken) {
    throw new Error("Twilio Auth Token is required.");
  }
  if (phoneNumber && !/^\+[1-9][0-9]{7,14}$/.test(phoneNumber)) {
    throw new Error("Twilio phone number must use E.164 format.");
  }

  return {
    account_sid: accountSid,
    auth_token: authToken,
    ...(phoneNumber ? { phone_number: phoneNumber } : {}),
  };
}

export function validateTwilioSignature(input: {
  url: string;
  params: Record<string, string>;
  signature: string;
  authToken: string;
}): boolean {
  if (!input.signature || !input.authToken) return false;

  const signingPayload =
    input.url +
    Object.keys(input.params)
      .sort()
      .map((key) => `${key}${input.params[key] ?? ""}`)
      .join("");
  const expected = createHmac("sha1", input.authToken)
    .update(signingPayload)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(input.signature, "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function normalizeTwilioError(status: number): IntegrationErrorCategory {
  if (status === 401 || status === 403 || status === 404) {
    return "INVALID_CREDENTIALS";
  }
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "INVALID_RESPONSE";
}

async function readBoundedJson(
  response: Response,
): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    return null;
  }

  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8"),
    );
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function validateTwilioAccountReadOnly(
  credentials: TwilioCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<TwilioAccountValidationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(
      `${credentials.account_sid}:${credentials.auth_token}`,
    ).toString("base64")}`,
  };

  try {
    const accountResponse = await fetchImpl(
      `${TWILIO_API_BASE}/Accounts/${credentials.account_sid}.json`,
      {
        method: "GET",
        headers,
        redirect: "error",
        signal: controller.signal,
      },
    );

    if (!accountResponse.ok) {
      await readBoundedJson(accountResponse);
      return {
        ok: false,
        errorCode: normalizeTwilioError(accountResponse.status),
      };
    }

    const account = await readBoundedJson(accountResponse);
    const returnedSid = account?.["sid"];
    const friendlyName = account?.["friendly_name"];
    if (
      returnedSid !== credentials.account_sid ||
      typeof friendlyName !== "string" ||
      !friendlyName.trim()
    ) {
      return { ok: false, errorCode: "INVALID_RESPONSE" };
    }

    if (credentials.phone_number) {
      const phoneUrl = new URL(
        `${TWILIO_API_BASE}/Accounts/${credentials.account_sid}/IncomingPhoneNumbers.json`,
      );
      phoneUrl.searchParams.set("PhoneNumber", credentials.phone_number);
      const phoneResponse = await fetchImpl(phoneUrl, {
        method: "GET",
        headers,
        redirect: "error",
        signal: controller.signal,
      });

      if (!phoneResponse.ok) {
        await readBoundedJson(phoneResponse);
        return {
          ok: false,
          errorCode: normalizeTwilioError(phoneResponse.status),
        };
      }

      const phoneData = await readBoundedJson(phoneResponse);
      const numbers = phoneData?.["incoming_phone_numbers"];
      const ownsNumber =
        Array.isArray(numbers) &&
        numbers.some(
          (number) =>
            number &&
            typeof number === "object" &&
            (number as Record<string, unknown>)["phone_number"] ===
              credentials.phone_number,
        );
      if (!ownsNumber) {
        return { ok: false, errorCode: "CONFIGURATION_ERROR" };
      }
    }

    return {
      ok: true,
      accountSid: credentials.account_sid,
      friendlyName: friendlyName.trim(),
      ...(credentials.phone_number
        ? { phoneNumber: credentials.phone_number }
        : {}),
    };
  } catch {
    return { ok: false, errorCode: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
