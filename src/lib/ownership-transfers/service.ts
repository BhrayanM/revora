import "server-only";

import {
  type OwnershipTransferDelivery,
  prepareOwnershipTransferDelivery,
} from "@/lib/ownership-transfers/delivery";
import {
  createOwnershipTransferToken,
  hashOwnershipTransferToken,
} from "@/lib/ownership-transfers/tokens";
import { createClient } from "@/lib/supabase/server";

const OWNERSHIP_TRANSFER_VALIDITY_MS = 48 * 60 * 60 * 1000;

function ownershipTransferExpiration(): string {
  return new Date(Date.now() + OWNERSHIP_TRANSFER_VALIDITY_MS).toISOString();
}

export type OwnershipTransferServiceResult = {
  transferId: string;
  delivery: OwnershipTransferDelivery;
};

/**
 * The caller must first resolve the active organization owner. The RPC derives
 * auth.uid() itself, repeats every authorization check, and verifies the
 * selected membership belongs to the same organization before persisting.
 */
export async function createOrganizationOwnershipTransfer({
  targetMembershipId,
}: {
  targetMembershipId: string;
}): Promise<OwnershipTransferServiceResult> {
  const rawToken = createOwnershipTransferToken();
  const delivery = prepareOwnershipTransferDelivery(rawToken);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_organization_ownership_transfer",
    {
      p_target_membership_id: targetMembershipId,
      p_token_hash: hashOwnershipTransferToken(rawToken),
      p_expires_at: ownershipTransferExpiration(),
    },
  );

  if (error || !data) {
    console.error(
      "Failed to create organization ownership transfer:",
      error?.message,
    );
    throw new Error("We could not start that ownership transfer.");
  }

  return { transferId: data, delivery };
}

export async function cancelOrganizationOwnershipTransfer(
  transferId: string,
): Promise<"invalid" | "accepted" | "rejected" | "cancelled" | "expired"> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "cancel_organization_ownership_transfer",
    { p_transfer_id: transferId },
  );

  if (error || !data) {
    console.error(
      "Failed to cancel organization ownership transfer:",
      error?.message,
    );
    throw new Error("We could not cancel that ownership transfer.");
  }

  return data as "invalid" | "accepted" | "rejected" | "cancelled" | "expired";
}
