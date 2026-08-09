import Link from "next/link";
import { redirect } from "next/navigation";

import { OwnershipTransferForm } from "@/app/ownership-transfer/accept/ownership-transfer-form";
import {
  AuthCard,
  AuthPageHeader,
  AuthShell,
  AuthStatusPanel,
  AuthTextLink,
} from "@/components/auth/auth-shell";
import { hasCurrentLegalConsent } from "@/lib/legal/consent";
import { getOwnershipTransferContext } from "@/lib/ownership-transfers/context";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Organization ownership transfer",
};

function isTerminalState(
  value: string | undefined,
): value is
  | "expired"
  | "cancelled"
  | "rejected"
  | "already_accepted"
  | "organization_unavailable"
  | "invalid" {
  return [
    "expired",
    "cancelled",
    "rejected",
    "already_accepted",
    "organization_unavailable",
    "invalid",
  ].includes(value ?? "");
}

function OwnershipTransferState({ state }: { state: string }) {
  const messages: Record<string, { title: string; description: string }> = {
    expired: {
      title: "Ownership transfer expired",
      description:
        "Ask the current organization owner to create a new ownership transfer.",
    },
    cancelled: {
      title: "Ownership transfer cancelled",
      description: "The current organization owner cancelled this request.",
    },
    rejected: {
      title: "Ownership transfer declined",
      description: "This ownership transfer is no longer available.",
    },
    already_accepted: {
      title: "Ownership transfer already completed",
      description:
        "This one-time ownership transfer link has already been used.",
    },
    organization_unavailable: {
      title: "Organization unavailable",
      description: "This ownership transfer can no longer be completed.",
    },
    invalid: {
      title: "Ownership transfer unavailable",
      description:
        "This ownership transfer link is invalid or can no longer be used.",
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
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Return home
      </Link>
    </AuthStatusPanel>
  );
}

export default async function OwnershipTransferAcceptancePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const context = await getOwnershipTransferContext();
  if (context.state !== "valid") {
    const requestedState = (await searchParams).state;
    const displayState =
      context.state === "none" && isTerminalState(requestedState)
        ? requestedState
        : context.state;

    return (
      <AuthShell>
        <AuthCard>
          <OwnershipTransferState state={displayState} />
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
            title="Ownership transfer requested"
            description={`Sign in to securely review the ownership transfer for ${context.organizationName}.`}
          />
          <div className="mt-7 space-y-3">
            <Link
              href="/login?redirect=%2Fownership-transfer%2Faccept"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Continue with the account that holds the active team membership.
          </p>
        </AuthCard>
      </AuthShell>
    );
  }

  if (!(await hasCurrentLegalConsent(supabase, user.id))) {
    redirect("/legal/consent?next=%2Fownership-transfer%2Faccept");
  }

  const hasVerifiedFactor = user.factors?.some(
    (factor) => factor.status === "verified",
  );
  if (hasVerifiedFactor) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel !== "aal2") {
      redirect("/auth/mfa?redirect=%2Fownership-transfer%2Faccept");
    }
  }

  return (
    <AuthShell>
      <AuthCard>
        <AuthPageHeader
          visual="security"
          eyebrow="Organization ownership"
          title="Review ownership transfer"
          description={`You have been asked to become the owner of ${context.organizationName}.`}
        />
        <div className="mt-7">
          <OwnershipTransferForm organizationName={context.organizationName!} />
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Signed in with a different account?{" "}
          <AuthTextLink href="/login?redirect=%2Fownership-transfer%2Faccept">
            Switch account
          </AuthTextLink>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
