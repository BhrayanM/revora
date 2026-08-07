import { NextResponse, type NextRequest } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
      const orgSlug = user.email?.split("@")[1]?.split(".")[0] ?? "default";
      const orgName =
        user.user_metadata["full_name"] ??
        user.email?.split("@")[0] ??
        "My Organization";

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: `${orgName}'s Org`, slug: orgSlug })
        .select("id")
        .single();

      if (orgError) {
        console.error("Org creation error:", orgError.message);
      } else if (org) {
        await supabase.from("memberships").insert({
          profile_id: user.id,
          organization_id: org.id,
          role: "owner",
        });

        await supabase.from("workspaces").insert({
          organization_id: org.id,
          name: "Default Workspace",
          description: "Your default team workspace",
        });
      }
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NEXT_PUBLIC_APP_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
