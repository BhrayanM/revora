import { NextResponse, type NextRequest } from "next/server";

import {
  createServiceAdminClient,
  createServiceClient,
} from "@/lib/supabase/server";

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

async function onboardNewUser(
  userId: string,
  email: string | undefined,
  fullName: string | undefined,
) {
  const supabase = await createServiceAdminClient();
  const orgName = fullName ?? email?.split("@")[0] ?? "My Organization";
  const slug = generateSlug(email ?? "user@default.com");

  const { data: result, error: rpcError } = await supabase.rpc("onboard_user", {
    p_user_id: userId,
    p_org_name: `${orgName}'s Org`,
    p_org_slug: slug,
    p_workspace_name: "Default Workspace",
  });

  if (rpcError) {
    console.error("Onboarding RPC error:", rpcError.message);
    return;
  }

  if (result && typeof result === "object" && "error" in result) {
    console.error("Onboarding slug collision:", result);
    const retrySlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: retryError } = await supabase.rpc("onboard_user", {
      p_user_id: userId,
      p_org_name: `${orgName}'s Org`,
      p_org_slug: retrySlug,
      p_workspace_name: "Default Workspace",
    });
    if (retryError) {
      console.error("Onboarding retry RPC error:", retryError.message);
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const supabase = await createServiceClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_session`);
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id")
    .eq("profile_id", user.id)
    .limit(1);

  if (!memberships || memberships.length === 0) {
    await onboardNewUser(
      user.id,
      user.email,
      user.user_metadata["full_name"] as string | undefined,
    );
  }

  const redirectTo = safeRedirect(request, next);
  return NextResponse.redirect(redirectTo);
}
