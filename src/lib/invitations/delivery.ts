import "server-only";

import { isInvitationToken } from "@/lib/invitations/tokens";

export type InvitationDelivery = {
  developmentInviteUrl?: string;
};

export function isDevelopmentInvitationDelivery(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_APP_ENV === "development"
  );
}

/**
 * Keep delivery separate from invitation persistence. Until a verified sending
 * domain is configured, production intentionally fails before an invitation is
 * created or rotated rather than claiming an email was sent.
 */
export function prepareInvitationDelivery(
  rawToken: string,
): InvitationDelivery {
  if (!isInvitationToken(rawToken)) {
    throw new Error("Invitation delivery could not be prepared");
  }

  if (!isDevelopmentInvitationDelivery()) {
    throw new Error(
      "Invitation email delivery is not configured for this environment.",
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = new URL("/invite", appUrl);
  inviteUrl.searchParams.set("token", rawToken);

  return { developmentInviteUrl: inviteUrl.toString() };
}
