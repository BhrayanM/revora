"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  acceptCurrentLegalDocuments,
  type LegalConsentActionState,
} from "@/app/legal/consent/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: LegalConsentActionState = {};

export function ConsentForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    acceptCurrentLegalDocuments,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-secondary p-4 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="acceptRequiredLegalDocuments"
          required
          className="mt-0.5 size-4 rounded border-border accent-primary"
        />
        <span>
          I have read and agree to the{" "}
          <Link
            href="/terms"
            className="font-medium text-primary hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="marketingConsent"
          className="mt-0.5 size-4 rounded border-border accent-primary"
        />
        <span>
          Send me optional product updates, educational content, and marketing
          communications. You can opt out at any time.
        </span>
      </label>

      <Button
        type="submit"
        size="xl"
        className="w-full"
        loading={pending}
        disabled={pending}
      >
        Accept and continue
      </Button>
    </form>
  );
}
