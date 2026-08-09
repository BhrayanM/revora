import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInvitationForm } from "@/app/invite/accept/accept-invitation-form";
import {
  AuthCard,
  AuthPageHeader,
  AuthShell,
  AuthStatusPanel,
  AuthTextLink,
} from "@/components/auth/auth-shell";
import { getInvitationContext } from "@/lib/invitations/context";
import { hasCurrentLegalConsent } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Organization invitation — AI Growth",
};

function isInvitationTerminalState(
  value: string | undefined,
): value is
  | "expired"
  | "revoked"
  | "already_accepted"
  | "organization_unavailable"
  | "invalid" {
  return [
    "expired",
    "revoked",
    "already_accepted",
    "organization_unavailable",
    "invalid",
  ].includes(value ?? "");
}

function InvitationState({ state }: { state: string }) {
  const messages: Record<string, { title: string; description: string }> = {
    expired: {
      title: "Invitation expired",
      description:
        "Ask an organization administrator to send a new invitation.",
    },
    revoked: {
      title: "Invitation unavailable",
      description:
        "This invitation is no longer available. Contact an administrator if you need access.",
    },
    already_accepted: {
      title: "Invitation already used",
      description: "This invitation has already been accepted.",
    },
    organization_unavailable: {
      title: "Organization unavailable",
      description:
        "This invitation can no longer be used. Contact the organization administrator for help.",
    },
    invalid: {
      title: "Invitation unavailable",
      description: "This invitation link is invalid or can no longer be used.",
    },
  };
  const message = messages[state] ?? messages.invalid!;

  return (
    <AuthStatusPanel
      tone="warning"
      title={message.title}
      description={message.description}
    >
      <Link
        href="/"
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Return home
      </Link>
    </AuthStatusPanel>
  );
}

export default async function InvitationAcceptancePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const context = await getInvitationContext();
  if (context.state !== "valid") {
    const requestedState = (await searchParams).state;
    const displayState =
      context.state === "none" && isInvitationTerminalState(requestedState)
        ? requestedState
        : context.state;

    return (
      <AuthShell>
        <AuthCard>
          <InvitationState state={displayState} />
        </AuthCard>
      </AuthShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell>
        <AuthCard>
          <AuthPageHeader
            visual="security"
            title="You've been invited"
            description={`Sign in or create an account to join ${context.organizationName}.`}
          />
          <div className="mt-7 space-y-3">
            <Link
              href="/login?redirect=%2Finvite%2Faccept"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Sign in
            </Link>
            <Link
              href="/signup?redirect=%2Finvite%2Faccept"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Create an account
            </Link>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Continue with the email address that received this invitation.
          </p>
        </AuthCard>
      </AuthShell>
    );
  }

  if (!(await hasCurrentLegalConsent(supabase, user.id))) {
    redirect("/legal/consent?next=%2Finvite%2Faccept");
  }

  const hasVerifiedFactor = user.factors?.some(
    (factor) => factor.status === "verified",
  );
  if (hasVerifiedFactor) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel !== "aal2") {
      redirect("/auth/mfa?redirect=%2Finvite%2Faccept");
    }
  }

  return (
    <AuthShell>
      <AuthCard>
        <AuthPageHeader
          visual="success"
          eyebrow="Organization invitation"
          title="Join your team"
          description={`You have been invited to join ${context.organizationName}.`}
        />
        <div className="mt-7">
          <AcceptInvitationForm organizationName={context.organizationName!} />
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Signed in with a different address?{" "}
          <AuthTextLink href="/login?redirect=%2Finvite%2Faccept">
            Switch account
          </AuthTextLink>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
