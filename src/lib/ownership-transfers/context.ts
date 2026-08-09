import "server-only";

import { cookies } from "next/headers";

import {
  hashOwnershipTransferToken,
  isOwnershipTransferToken,
} from "@/lib/ownership-transfers/tokens";
import { createServiceAdminClient } from "@/lib/supabase/server";

export const OWNERSHIP_TRANSFER_CONTEXT_COOKIE = "ai_growth_ownership_transfer";
const OWNERSHIP_TRANSFER_CONTEXT_MAX_AGE_SECONDS = 60 * 60 * 2;

export type OwnershipTransferContextState =
  | "none"
  | "invalid"
  | "valid"
  | "expired"
  | "cancelled"
  | "rejected"
  | "already_accepted"
  | "organization_unavailable";

export type OwnershipTransferContext = {
  state: OwnershipTransferContextState;
  transferId?: string;
  organizationId?: string;
  organizationName?: string;
  expiresAt?: string;
};

type OwnershipTransferLookup = {
  id: string;
  organization_id: string;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
};

async function organizationName(
  organizationId: string,
): Promise<string | null> {
  const admin = await createServiceAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return data.name;
}

/**
 * Resolves a transfer only in server-only request contexts. This follows the
 * invitation capture pattern: the server may validate a high-entropy token,
 * but the authenticated acceptance RPC still verifies the intended target,
 * legal consent, MFA, active membership, and current owner state.
 */
export async function getOwnershipTransferContextForToken(
  rawToken: string,
): Promise<OwnershipTransferContext> {
  if (!isOwnershipTransferToken(rawToken)) return { state: "invalid" };

  const admin = await createServiceAdminClient();
  const { data, error } = await admin
    .from("organization_ownership_transfers")
    .select(
      "id, organization_id, expires_at, accepted_at, rejected_at, cancelled_at, expired_at",
    )
    .eq("token_hash", hashOwnershipTransferToken(rawToken))
    .maybeSingle();

  const transfer = data as OwnershipTransferLookup | null;
  if (error || !transfer) return { state: "invalid" };
  if (transfer.accepted_at) return { state: "already_accepted" };
  if (transfer.rejected_at) return { state: "rejected" };
  if (transfer.cancelled_at) return { state: "cancelled" };
  if (
    transfer.expired_at ||
    new Date(transfer.expires_at).getTime() <= Date.now()
  ) {
    return { state: "expired" };
  }

  const name = await organizationName(transfer.organization_id);
  if (!name) return { state: "organization_unavailable" };

  return {
    state: "valid",
    transferId: transfer.id,
    organizationId: transfer.organization_id,
    organizationName: name,
    expiresAt: transfer.expires_at,
  };
}

/** Revalidates the HttpOnly transfer context on every sensitive request. */
export async function getOwnershipTransferContext(): Promise<OwnershipTransferContext> {
  const rawToken = (await cookies()).get(
    OWNERSHIP_TRANSFER_CONTEXT_COOKIE,
  )?.value;
  if (!rawToken) return { state: "none" };
  return getOwnershipTransferContextForToken(rawToken);
}

export async function getOwnershipTransferTokenFromContext(): Promise<
  string | null
> {
  const rawToken = (await cookies()).get(
    OWNERSHIP_TRANSFER_CONTEXT_COOKIE,
  )?.value;
  return isOwnershipTransferToken(rawToken) ? rawToken : null;
}

export const ownershipTransferContextCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: OWNERSHIP_TRANSFER_CONTEXT_MAX_AGE_SECONDS,
};

export async function clearOwnershipTransferContext(): Promise<void> {
  (await cookies()).delete(OWNERSHIP_TRANSFER_CONTEXT_COOKIE);
}
