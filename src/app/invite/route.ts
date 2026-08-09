import { NextResponse, type NextRequest } from "next/server";

import {
  INVITATION_CONTEXT_COOKIE,
  getInvitationContextForToken,
  invitationContextCookie,
} from "@/lib/invitations/context";
import { isInvitationToken } from "@/lib/invitations/tokens";

/**
 * Captures a valid invitation secret in a short-lived HttpOnly cookie, then
 * immediately removes it from the address bar. This response has no client UI,
 * analytics, or logging path that could expose the raw token.
 */
export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  const acceptUrl = new URL("/invite/accept", request.url);

  if (!isInvitationToken(rawToken)) {
    acceptUrl.searchParams.set("state", "invalid");
    return NextResponse.redirect(acceptUrl);
  }

  const context = await getInvitationContextForToken(rawToken);
  if (context.state !== "valid") {
    acceptUrl.searchParams.set("state", context.state);
    return NextResponse.redirect(acceptUrl);
  }

  const response = NextResponse.redirect(acceptUrl);
  response.cookies.set(
    INVITATION_CONTEXT_COOKIE,
    rawToken,
    invitationContextCookie,
  );
  return response;
}
