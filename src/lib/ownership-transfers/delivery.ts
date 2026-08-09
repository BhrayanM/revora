import "server-only";

import { isDevelopmentInvitationDelivery } from "@/lib/invitations/delivery";
import { isOwnershipTransferToken } from "@/lib/ownership-transfers/tokens";

export type OwnershipTransferDelivery = {
  developmentTransferUrl?: string;
};

/**
 * Ownership transfers use the same fail-closed delivery posture as team
 * invitations. Production creation waits for a transactional delivery adapter
 * instead of exposing a bearer-like link in the dashboard.
 */
export function prepareOwnershipTransferDelivery(
  rawToken: string,
): OwnershipTransferDelivery {
  if (!isOwnershipTransferToken(rawToken)) {
    throw new Error("Ownership transfer delivery could not be prepared");
  }

  if (!isDevelopmentInvitationDelivery()) {
    throw new Error(
      "Ownership transfer delivery is not configured for this environment.",
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const transferUrl = new URL("/ownership-transfer", appUrl);
  transferUrl.searchParams.set("token", rawToken);

  return { developmentTransferUrl: transferUrl.toString() };
}
