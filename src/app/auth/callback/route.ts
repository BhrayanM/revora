import { NextResponse, type NextRequest } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

function generateSlug(email: string): string {
  const base =
    email
      .split("@")[1]
      ?.split(".")[0]
      ?.replace(/[^a-z0-9-]/g, "") ?? "default";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function safeRedirect(request: NextRequest, path: string | null): string {
  const { origin } = new URL(request.url);
  const safePath =
    path && path.startsWith("/") && !path.startsWith("//")
      ? path
      : "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NEXT_PUBLIC_APP_ENV === "development";

  if (isLocalEnv) return `${origin}${safePath}`;
  if (forwardedHost) return `https://${forwardedHost}${safePath}`;
  return `${origin}${safePath}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createServiceClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1);

    if (!memberships || memberships.length === 0) {
      const orgName =
        (user.user_metadata["full_name"] as string) ??
        user.email?.split("@")[0] ??
        "My Organization";

      const slug = generateSlug(user.email ?? "user@default.com");

      const { data: result, error: rpcError } = await supabase.rpc(
        "onboard_user",
        {
          p_user_id: user.id,
          p_org_name: `${orgName}'s Org`,
          p_org_slug: slug,
          p_workspace_name: "Default Workspace",
        },
      );

      if (rpcError) {
        console.error("Onboarding RPC error:", rpcError.message);
      } else if (result && typeof result === "object" && "error" in result) {
        console.error("Onboarding slug collision:", result);
        const retrySlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        await supabase.rpc("onboard_user", {
          p_user_id: user.id,
          p_org_name: `${orgName}'s Org`,
          p_org_slug: retrySlug,
          p_workspace_name: "Default Workspace",
        });
      }
    }
  }

  const redirectTo = safeRedirect(request, next);
  return NextResponse.redirect(redirectTo);
}
