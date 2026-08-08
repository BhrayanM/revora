import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — AI Growth Platform",
};

function generateSlug(email: string): string {
  const base =
    email
      .split("@")[1]
      ?.split(".")[0]
      ?.replace(/[^a-z0-9-]/g, "") ?? "default";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
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
      const svc = await createServiceClient();
      const orgName =
        (user.user_metadata["full_name"] as string) ??
        user.email?.split("@")[0] ??
        "My Organization";
      const slug = generateSlug(user.email ?? "user@default.com");

      const { error: rpcError } = await svc.rpc("onboard_user", {
        p_user_id: user.id,
        p_org_name: `${orgName}'s Org`,
        p_org_slug: slug,
        p_workspace_name: "Default Workspace",
      });

      if (rpcError) {
        console.error("Layout onboarding RPC error:", rpcError.message);
      }
    }
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
