import "server-only";

import { cookies } from "next/headers";

import {
  hashInvitationToken,
  isInvitationToken,
} from "@/lib/invitations/tokens";
import { createServiceAdminClient } from "@/lib/supabase/server";

export const INVITATION_CONTEXT_COOKIE = "ai_growth_invitation";
const INVITATION_CONTEXT_MAX_AGE_SECONDS = 60 * 60 * 2;

export type InvitationRole = "admin" | "manager" | "agent" | "viewer";

export type InvitationContextState =
  | "none"
  | "invalid"
  | "valid"
  | "expired"
  | "revoked"
  | "already_accepted"
  | "organization_unavailable";

export type InvitationContext = {
  state: InvitationContextState;
  invitationId?: string;
  organizationId?: string;
  organizationName?: string;
  role?: InvitationRole;
};

type InvitationLookup = {
  id: string;
  organization_id: string;
  role: InvitationRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

function isInvitationRole(value: string): value is InvitationRole {
  return ["admin", "manager", "agent", "viewer"].includes(value);
}

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
 * Resolves an invitation only in server-only request contexts. It returns no
 * invitee email address and never exposes the persisted hash to the caller.
 */
export async function getInvitationContextForToken(
  rawToken: string,
): Promise<InvitationContext> {
  if (!isInvitationToken(rawToken)) return { state: "invalid" };

  const admin = await createServiceAdminClient();
  const { data, error } = await admin
    .from("organization_invitations")
    .select("id, organization_id, role, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashInvitationToken(rawToken))
    .maybeSingle();

  const invitation = data as InvitationLookup | null;
  if (error || !invitation || !isInvitationRole(invitation.role)) {
    return { state: "invalid" };
  }
  if (invitation.accepted_at) return { state: "already_accepted" };
  if (invitation.revoked_at) return { state: "revoked" };
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return { state: "expired" };
  }

  const name = await organizationName(invitation.organization_id);
  if (!name) return { state: "organization_unavailable" };

  return {
    state: "valid",
    invitationId: invitation.id,
    organizationId: invitation.organization_id,
    organizationName: name,
    role: invitation.role,
  };
}

/** Revalidates the HttpOnly context on every security-sensitive request. */
export async function getInvitationContext(): Promise<InvitationContext> {
  const rawToken = (await cookies()).get(INVITATION_CONTEXT_COOKIE)?.value;
  if (!rawToken) return { state: "none" };
  return getInvitationContextForToken(rawToken);
}

export async function getInvitationTokenFromContext(): Promise<string | null> {
  const rawToken = (await cookies()).get(INVITATION_CONTEXT_COOKIE)?.value;
  return isInvitationToken(rawToken) ? rawToken : null;
}

export const invitationContextCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: INVITATION_CONTEXT_MAX_AGE_SECONDS,
};

export async function clearInvitationContext(): Promise<void> {
  (await cookies()).delete(INVITATION_CONTEXT_COOKIE);
}
