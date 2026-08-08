"use client";

import { useActionState, useState } from "react";

import {
  acceptCurrentLegalDocuments,
  type LegalConsentActionState,
} from "@/app/legal/consent/actions";
import { AuthTextLink } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: LegalConsentActionState = {};

export function ConsentForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    acceptCurrentLegalDocuments,
    initialState,
  );
  const [requiredConsentAccepted, setRequiredConsentAccepted] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-secondary p-4 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="acceptRequiredLegalDocuments"
          required
          checked={requiredConsentAccepted}
          onChange={(event) => setRequiredConsentAccepted(event.target.checked)}
          className="mt-0.5 size-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        />
        <span>
          I have read and agree to the{" "}
          <AuthTextLink href="/terms">Terms of Service</AuthTextLink> and{" "}
          <AuthTextLink href="/privacy">Privacy Policy</AuthTextLink>.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="marketingConsent"
          className="mt-0.5 size-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
        disabled={pending || !requiredConsentAccepted}
      >
        Accept and continue
      </Button>
    </form>
  );
}
