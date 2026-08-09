"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  acceptOrganizationInvitation,
  type InvitationAcceptanceState,
} from "@/app/invite/accept/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: InvitationAcceptanceState = { status: "ready" };

const errorMessages: Partial<
  Record<InvitationAcceptanceState["status"], string>
> = {
  wrong_account: "This invitation was sent to a different email address.",
  suspended_membership:
    "Your access to this organization is suspended. Contact an administrator for help.",
  email_unverified:
    "Verify your email address before accepting this invitation.",
  legal_required:
    "Review and accept the current legal terms before continuing.",
  mfa_required: "Complete multi-factor authentication before continuing.",
  profile_unavailable:
    "Your account is still being prepared. Please try again.",
  unauthenticated: "Sign in to accept this invitation.",
  error: "We could not accept this invitation. Please try again.",
};

export function AcceptInvitationForm({
  organizationName,
}: {
  organizationName: string;
}) {
  const [state, formAction, pending] = useActionState(
    acceptOrganizationInvitation,
    initialState,
  );
  const succeeded = ["accepted", "membership_exists", "reactivated"].includes(
    state.status,
  );

  if (succeeded) {
    const resultName = state.organizationName ?? organizationName;
    return (
      <div className="space-y-5 text-center">
        <Alert variant="success">
          You joined {resultName} successfully. If you belong to more than one
          organization, organization switching will be available in a later
          update.
        </Alert>
        <Link
          href="/dashboard"
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Continue to dashboard
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {errorMessages[state.status] && (
        <Alert variant="error">{errorMessages[state.status]}</Alert>
      )}
      <p className="rounded-xl border border-border bg-surface-secondary p-4 text-sm leading-6 text-muted-foreground">
        You&apos;re accepting access to{" "}
        <strong className="text-foreground">{organizationName}</strong>. Your
        role and organization access will be assigned securely when you
        continue.
      </p>
      <Button type="submit" size="xl" className="w-full" loading={pending}>
        Accept invitation
      </Button>
    </form>
  );
}
