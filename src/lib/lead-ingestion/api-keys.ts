import "server-only";

import { createHmac, randomBytes } from "crypto";

function hashKey(key: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      const devSecret = "dev-secret";
      return createHmac("sha256", devSecret).update(key).digest("hex");
    }
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for API key hashing",
    );
  }
  return createHmac("sha256", secret).update(key).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string } {
  const random = randomBytes(24).toString("hex");
  const raw = `ag_live_${random}`;
  const hash = hashKey(raw);
  return { raw, hash };
}

export function hashApiKey(raw: string): string {
  return hashKey(raw);
}
