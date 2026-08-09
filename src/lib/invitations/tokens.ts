import "server-only";

import { createHash, randomBytes } from "node:crypto";

const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOKEN_HASH_PATTERN = /^[a-f0-9]{64}$/;

/** Generates a 256-bit, URL-safe invitation secret. Never persist this value. */
export function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Returns the stable SHA-256 representation that is safe to persist. */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isInvitationToken(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && INVITATION_TOKEN_PATTERN.test(value);
}

export function isInvitationTokenHash(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && TOKEN_HASH_PATTERN.test(value);
}
