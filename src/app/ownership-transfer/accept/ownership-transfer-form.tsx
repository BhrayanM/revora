"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  acceptOrganizationOwnershipTransfer,
  rejectOrganizationOwnershipTransfer,
  type OwnershipTransferDecisionState,
} from "@/app/ownership-transfer/accept/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const initialState: OwnershipTransferDecisionState = { status: "ready" };

const errorMessages: Partial<
  Record<OwnershipTransferDecisionState["status"], string>
> = {
  wrong_account:
    "This ownership transfer was issued for a different active team member.",
  target_unavailable:
    "Your membership is no longer eligible to receive ownership. Contact the current owner.",
  initiator_unavailable:
    "The requesting owner is no longer eligible to complete this transfer.",
  owner_state_invalid:
    "This organization does not currently have a valid single-owner state. Contact support or an authorized administrator.",
  legal_required:
    "Review and accept the current legal terms before continuing.",
  mfa_required: "Complete multi-factor authentication before continuing.",
  unauthenticated: "Sign in to review this ownership transfer.",
  error: "We could not complete that ownership transfer. Please try again.",
};

export function OwnershipTransferForm({
  organizationName,
}: {
  organizationName: string;
}) {
  const [state, setState] = useState(initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isPending, startTransition] = useTransition();

  const acceptTransfer = () => {
    startTransition(async () => {
      const nextState = await acceptOrganizationOwnershipTransfer();
      setState(nextState);
      setConfirmOpen(false);
    });
  };

  const rejectTransfer = () => {
    startTransition(async () => {
      const nextState = await rejectOrganizationOwnershipTransfer();
      setState(nextState);
    });
  };

  if (state.status === "transferred") {
    return (
      <div className="space-y-5 text-center">
        <Alert variant="success">
          You are now the owner of {state.organizationName ?? organizationName}.
          The previous owner is now an administrator.
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

  if (state.status === "rejected") {
    return (
      <div className="space-y-5 text-center">
        <Alert variant="info">
          You declined this ownership transfer. Your existing organization role
          and access have not changed.
        </Alert>
        <Link
          href="/dashboard"
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Return to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {errorMessages[state.status] && (
        <Alert variant="error">{errorMessages[state.status]}</Alert>
      )}
      <Alert variant="warning" title="This changes organization control">
        If you accept, you become the sole owner of {organizationName}. The
        current owner is immediately changed to Administrator. This cannot be
        undone through ordinary team role controls.
      </Alert>
      <p className="rounded-xl border border-border bg-surface-secondary p-4 text-sm leading-6 text-muted-foreground">
        Review this carefully before accepting. The database will recheck your
        active membership, current legal consent, MFA assurance, the current
        owner, and the one-time transfer token at the moment you confirm.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" disabled={isPending} onClick={rejectTransfer}>
          Decline transfer
        </Button>
        <Button disabled={isPending} onClick={() => setConfirmOpen(true)}>
          Review and accept
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        title="Confirm ownership transfer"
        description="This is the final confirmation before your organization permissions change."
      >
        <div className="space-y-5">
          <Alert variant="warning" title="Immediate, privileged change">
            You will become the only active owner of {organizationName}. The
            previous owner will become an administrator.
          </Alert>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-secondary p-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input-border text-primary focus:ring-primary"
              checked={acknowledged}
              disabled={isPending}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              I understand that accepting gives me sole ownership and changes
              the previous owner&apos;s role to Administrator.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!acknowledged}
              loading={isPending}
              onClick={acceptTransfer}
            >
              Confirm ownership transfer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
