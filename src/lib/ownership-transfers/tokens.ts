import "server-only";

import { createHash, randomBytes } from "node:crypto";

const OWNERSHIP_TRANSFER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Generates a 256-bit, URL-safe secret. Raw values are never persisted. */
export function createOwnershipTransferToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Returns the SHA-256 value that is safe to persist and send to the RPC. */
export function hashOwnershipTransferToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isOwnershipTransferToken(
  value: string | null | undefined,
): value is string {
  return (
    typeof value === "string" && OWNERSHIP_TRANSFER_TOKEN_PATTERN.test(value)
  );
}
