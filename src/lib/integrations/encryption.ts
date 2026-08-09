import "server-only";

import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION_PREFIX = "v1";

function getEncryptionKey(): Buffer {
  const envKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (envKey) {
    return Buffer.from(envKey, "hex");
  }

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!fallback) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY is required for credential encryption.",
    );
  }

  return createHash("sha256").update(fallback).digest();
}

export function encryptCredential(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const ivHex = iv.toString("hex");
  const cipherHex = encrypted.toString("hex");
  const tagHex = tag.toString("hex");

  return `${VERSION_PREFIX}:${ivHex}:${cipherHex}:${tagHex}`;
}

export function decryptCredential(encrypted: string): string {
  if (!encrypted || encrypted.length === 0) {
    return "";
  }

  const parts = encrypted.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new Error("Invalid encrypted credential format");
  }

  const [, ivHex, cipherHex, tagHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex!, "hex");
  const ciphertext = Buffer.from(cipherHex!, "hex");
  const tag = Buffer.from(tagHex!, "hex");

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function encryptCredentialsObject(
  credentials: Record<string, unknown>,
): Record<string, string> {
  const encrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === "string" && value.length > 0) {
      encrypted[`encrypted_${key}`] = encryptCredential(value);
    }
  }
  return encrypted;
}

export function decryptCredentialsObject(
  encrypted: Record<string, unknown>,
): Record<string, unknown> {
  const decrypted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(encrypted)) {
    if (key.startsWith("encrypted_") && typeof value === "string") {
      const originalKey = key.slice("encrypted_".length);
      decrypted[originalKey] = decryptCredential(value);
    } else {
      decrypted[key] = value;
    }
  }
  return decrypted;
}
