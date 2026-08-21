import { NextResponse } from "next/server";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import { handleSlackCallback } from "@/lib/integrations/adapters/slack";

const SETTINGS_PATH = "/settings?tab=integrations";

function settingsRedirect(request: Request, params: Record<string, string>) {
  const target = new URL(SETTINGS_PATH, request.url);
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.has("error")) {
    return settingsRedirect(request, {
      error: "Slack authorization was denied.",
    });
  }

  if (!code || !state) {
    return settingsRedirect(request, {
      error: "Missing Slack authorization parameters.",
    });
  }

  const authorization = await requireCurrentOrganizationPermission(
    "integrations.manage",
  );
  if (!authorization.data) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const result = await handleSlackCallback(
    code,
    state,
    authorization.data.organization.id,
    authorization.data.membership.profile_id,
  );

  if (result.error) {
    return settingsRedirect(request, { error: result.error });
  }

  return settingsRedirect(request, { connected: "slack" });
}
