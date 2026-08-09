import { NextResponse } from "next/server";

import { getActiveOrganizationContext } from "@/lib/auth";
import { handleGHLCallback } from "@/lib/integrations/adapters/gohighlevel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/settings?tab=integrations&error=${encodeURIComponent("GoHighLevel authorization was denied.")}`,
        request.url,
      ),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        "/settings?tab=integrations&error=Missing+authorization+parameters",
        request.url,
      ),
    );
  }

  const context = await getActiveOrganizationContext();
  if (!context) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const result = await handleGHLCallback(
    code,
    state,
    context.organization.id,
    context.membership.profile_id,
  );

  if (result.error) {
    return NextResponse.redirect(
      new URL(
        `/settings?tab=integrations&error=${encodeURIComponent(result.error)}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(
    new URL("/settings?tab=integrations&connected=gohighlevel", request.url),
  );
}
