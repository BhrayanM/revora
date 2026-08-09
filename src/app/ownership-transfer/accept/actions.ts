"use server";

import { setActiveOrganizationSelection } from "@/lib/auth";
import { hasCurrentLegalConsent } from "@/lib/legal/consent";
import {
  clearOwnershipTransferContext,
  getOwnershipTransferContext,
  getOwnershipTransferTokenFromContext,
} from "@/lib/ownership-transfers/context";
import { hashOwnershipTransferToken } from "@/lib/ownership-transfers/tokens";
import { createClient } from "@/lib/supabase/server";

export type OwnershipTransferDecisionStatus =
  | "ready"
  | "transferred"
  | "rejected"
  | "invalid"
  | "expired"
  | "cancelled"
  | "already_accepted"
  | "wrong_account"
  | "target_unavailable"
  | "initiator_unavailable"
  | "owner_state_invalid"
  | "organization_unavailable"
  | "legal_required"
  | "mfa_required"
  | "unauthenticated"
  | "error";

export type OwnershipTransferDecisionState = {
  status: OwnershipTransferDecisionStatus;
  organizationName?: string;
};

const TERMINAL_CONTEXT_STATES = new Set<OwnershipTransferDecisionStatus>([
  "transferred",
  "rejected",
  "invalid",
  "expired",
  "cancelled",
  "already_accepted",
  "organization_unavailable",
  "target_unavailable",
  "initiator_unavailable",
  "owner_state_invalid",
]);

function toDecisionStatus(value: unknown): OwnershipTransferDecisionStatus {
  const validStatuses: OwnershipTransferDecisionStatus[] = [
    "transferred",
    "rejected",
    "invalid",
    "expired",
    "cancelled",
    "already_accepted",
    "wrong_account",
    "target_unavailable",
    "initiator_unavailable",
    "owner_state_invalid",
    "organization_unavailable",
    "legal_required",
    "mfa_required",
  ];

  return typeof value === "string" &&
    validStatuses.includes(value as OwnershipTransferDecisionStatus)
    ? (value as OwnershipTransferDecisionStatus)
    : "error";
}

async function decideOwnershipTransfer(
  decision: "accept" | "reject",
): Promise<OwnershipTransferDecisionState> {
  const context = await getOwnershipTransferContext();
  if (context.state !== "valid") {
    return {
      status: context.state === "none" ? "invalid" : context.state,
    };
  }

  const rawToken = await getOwnershipTransferTokenFromContext();
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

  const rpc =
    decision === "accept"
      ? "accept_organization_ownership_transfer"
      : "reject_organization_ownership_transfer";
  const { data, error } = await supabase.rpc(rpc, {
    p_token_hash: hashOwnershipTransferToken(rawToken),
  });

  if (error || !data || typeof data !== "object") {
    console.error(
      `Failed to ${decision} organization ownership transfer:`,
      error?.message,
    );
    return { status: "error" };
  }

  const status = toDecisionStatus((data as Record<string, unknown>).status);
  if (status === "transferred" && context.organizationId) {
    // The database has atomically revalidated membership and owner state.
    // Select the transferred organization through the normal HttpOnly active
    // context helper so the new owner's next dashboard render is current.
    await setActiveOrganizationSelection(context.organizationId);
  }

  if (TERMINAL_CONTEXT_STATES.has(status)) {
    await clearOwnershipTransferContext();
  }

  return {
    status,
    organizationName:
      status === "transferred" ? context.organizationName : undefined,
  };
}

/** Server Action boundary; no caller-supplied organization, role, or token. */
export async function acceptOrganizationOwnershipTransfer(): Promise<OwnershipTransferDecisionState> {
  return decideOwnershipTransfer("accept");
}

/** Server Action boundary; only the token-bound active target may reject. */
export async function rejectOrganizationOwnershipTransfer(): Promise<OwnershipTransferDecisionState> {
  return decideOwnershipTransfer("reject");
}
