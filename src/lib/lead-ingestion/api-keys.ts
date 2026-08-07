import "server-only";

import { createHmac, randomBytes } from "crypto";

function hashKey(key: string): string {
  return createHmac(
    "sha256",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret",
  )
    .update(key)
    .digest("hex");
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
