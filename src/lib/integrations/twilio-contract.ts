import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export interface TwilioCredentials {
  account_sid: string;
  auth_token: string;
  phone_number?: string;
}

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
