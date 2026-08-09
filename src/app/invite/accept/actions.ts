"use server";

import { setActiveOrganizationSelection } from "@/lib/auth";
import {
  clearInvitationContext,
  getInvitationContext,
  getInvitationTokenFromContext,
} from "@/lib/invitations/context";
import { hashInvitationToken } from "@/lib/invitations/tokens";
import { hasCurrentLegalConsent } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export type InvitationAcceptanceStatus =
  | "ready"
  | "accepted"
  | "membership_exists"
  | "reactivated"
  | "invalid"
  | "expired"
  | "revoked"
  | "already_accepted"
  | "wrong_account"
  | "suspended_membership"
  | "organization_unavailable"
  | "email_unverified"
  | "legal_required"
  | "mfa_required"
  | "profile_unavailable"
  | "unauthenticated"
  | "error";

export type InvitationAcceptanceState = {
  status: InvitationAcceptanceStatus;
  organizationName?: string;
};

const TERMINAL_CONTEXT_STATES = new Set<InvitationAcceptanceStatus>([
  "accepted",
  "membership_exists",
  "reactivated",
  "invalid",
  "expired",
  "revoked",
  "already_accepted",
  "organization_unavailable",
]);

function toAcceptanceStatus(value: unknown): InvitationAcceptanceStatus {
  const validStatuses: InvitationAcceptanceStatus[] = [
    "accepted",
    "membership_exists",
    "reactivated",
    "invalid",
    "expired",
    "revoked",
    "already_accepted",
    "wrong_account",
    "suspended_membership",
    "organization_unavailable",
    "email_unverified",
    "profile_unavailable",
  ];

  return typeof value === "string" &&
    validStatuses.includes(value as InvitationAcceptanceStatus)
    ? (value as InvitationAcceptanceStatus)
    : "error";
}

/**
 * The page gates legal consent and MFA for UX, but this action repeats those
 * checks because Server Actions are public endpoints and can be invoked
 * directly without the rendered page.
 */
export async function acceptOrganizationInvitation(
  _previousState: InvitationAcceptanceState,
): Promise<InvitationAcceptanceState> {
  const context = await getInvitationContext();
  if (context.state !== "valid") {
    return {
      status: context.state === "none" ? "invalid" : context.state,
    };
  }

  const rawToken = await getInvitationTokenFromContext();
  if (!rawToken) return { status: "invalid" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  if (!(await hasCurrentLegalConsent(supabase, user.id))) {
    return { status: "legal_required" };
  }

  const hasVerifiedFactor = user.factors?.some(
    (factor) => factor.status === "verified",
  );
  if (hasVerifiedFactor) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel !== "aal2") {
      return { status: "mfa_required" };
    }
  }

  const { data, error } = await supabase.rpc("accept_organization_invitation", {
    p_token_hash: hashInvitationToken(rawToken),
  });
  if (error || !data || typeof data !== "object") {
    console.error("Failed to accept organization invitation:", error?.message);
    return { status: "error" };
  }

  const record = data as Record<string, unknown>;
  const status = toAcceptanceStatus(record.status);
  const joinedOrganization =
    status === "accepted" ||
    status === "membership_exists" ||
    status === "reactivated";

  // The acceptance RPC has atomically verified the invitation and created (or
  // confirmed) the trusted membership. Select that organization through the
  // same server-side active-membership check used by the dashboard switcher.
  if (joinedOrganization && context.organizationId) {
    await setActiveOrganizationSelection(context.organizationId);
  }

  if (TERMINAL_CONTEXT_STATES.has(status)) {
    await clearInvitationContext();
  }

  return {
    status,
    organizationName: joinedOrganization ? context.organizationName : undefined,
  };
}
