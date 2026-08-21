import "server-only";

import {
  disconnectConnection,
  getDecryptedCredentials,
  markConnectionError,
  markConnectionHealthy,
} from "@/lib/integrations/connections";
import { recordAuditEvent } from "@/lib/integrations/oauth";
import {
  normalizeTwilioCredentials,
  validateTwilioAccountReadOnly,
} from "@/lib/integrations/twilio-contract";
import type {
  TwilioAccountValidationResult,
  TwilioCredentials,
} from "@/lib/integrations/twilio-contract";
import { getSafeIntegrationError } from "@/lib/integrations/types";

export async function validateTwilioCredentials(
  credentials: TwilioCredentials,
): Promise<TwilioAccountValidationResult> {
  return validateTwilioAccountReadOnly(credentials);
}

export async function testTwilioConnection(
  organizationId: string,
): Promise<{ success: boolean; error?: string }> {
  const stored = await getDecryptedCredentials(organizationId, "twilio");
  if (!stored) {
    return { success: false, error: "Integration not configured" };
  }

  let credentials: TwilioCredentials;
  try {
    credentials = normalizeTwilioCredentials(stored);
  } catch {
    await markConnectionError(organizationId, "twilio", "INVALID_CREDENTIALS");
    return {
      success: false,
      error: getSafeIntegrationError("INVALID_CREDENTIALS").userMessage,
    };
  }

  const validation = await validateTwilioAccountReadOnly(credentials);
  if (!validation.ok) {
    await markConnectionError(organizationId, "twilio", validation.errorCode);
    return {
      success: false,
      error: getSafeIntegrationError(validation.errorCode).userMessage,
    };
  }

  await markConnectionHealthy(organizationId, "twilio");
  return { success: true };
}

export async function disconnectTwilio(
  organizationId: string,
  profileId?: string,
): Promise<{ error: string | null }> {
  const result = await disconnectConnection(organizationId, "twilio");
  if (!result.error) {
    await recordAuditEvent(organizationId, "twilio", "disconnected", profileId);
  }
  return result;
}
