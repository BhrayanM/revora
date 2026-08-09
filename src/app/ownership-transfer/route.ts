import { NextResponse, type NextRequest } from "next/server";

import {
  OWNERSHIP_TRANSFER_CONTEXT_COOKIE,
  getOwnershipTransferContextForToken,
  ownershipTransferContextCookie,
} from "@/lib/ownership-transfers/context";
import { isOwnershipTransferToken } from "@/lib/ownership-transfers/tokens";

/**
 * Captures a valid transfer secret in a short-lived HttpOnly cookie, then
 * immediately removes it from the address bar. The raw token is never exposed
 * to client JavaScript or persisted in the database.
 */
export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  const acceptUrl = new URL("/ownership-transfer/accept", request.url);

  if (!isOwnershipTransferToken(rawToken)) {
    acceptUrl.searchParams.set("state", "invalid");
    return NextResponse.redirect(acceptUrl);
  }

  const context = await getOwnershipTransferContextForToken(rawToken);
  if (context.state !== "valid") {
    acceptUrl.searchParams.set("state", context.state);
    return NextResponse.redirect(acceptUrl);
  }

  const response = NextResponse.redirect(acceptUrl);
  response.cookies.set(
    OWNERSHIP_TRANSFER_CONTEXT_COOKIE,
    rawToken,
    ownershipTransferContextCookie,
  );
  return response;
}
