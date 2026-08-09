import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getInvitationContext } from "@/lib/invitations/context";
import {
  getSafeInternalPath,
  hasCurrentLegalConsent,
} from "@/lib/legal/consent";
import { createClient, createServiceAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — AI Growth",
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
    const pathname = (await headers()).get("x-current-path") ?? "/dashboard";
    if (!(await hasCurrentLegalConsent(supabase, user.id))) {
      const consentPath = new URL(
        "/legal/consent",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      );
      consentPath.searchParams.set("next", getSafeInternalPath(pathname));
      redirect(consentPath.toString().replace(consentPath.origin, ""));
    }

    // Recovery provisioning must retain its normal behavior for ordinary new
    // users, but a database-revalidated invitation must be accepted instead of
    // creating an unrelated owner organization.
    if ((await getInvitationContext()).state === "valid") {
      redirect("/invite/accept");
    }

    const { data: memberships } = await supabase
      .from("memberships")
      .select("id, status")
      .eq("profile_id", user.id)
      .limit(50);

    if (!memberships || memberships.length === 0) {
      const svc = await createServiceAdminClient();
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
    } else if (
      !memberships.some((membership) => membership.status === "active")
    ) {
      // A suspended/removed user keeps their account but must not fall through
      // into an organization dashboard. A future organization switcher can
      // offer another active membership here.
      redirect("/");
    }

    // MFA gate: if user has enrolled MFA but session is AAL1, redirect to challenge
    if (user.factors && user.factors.length > 0) {
      const hasVerifiedFactor = user.factors.some(
        (f) => f.status === "verified",
      );
      if (hasVerifiedFactor) {
        const { data: aalData } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalData?.currentLevel !== "aal2") {
          const mfaUrl = new URL(
            "/auth/mfa",
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          );
          mfaUrl.searchParams.set("redirect", pathname);
          redirect(mfaUrl.toString().replace(mfaUrl.origin, ""));
        }
      }
    }
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
