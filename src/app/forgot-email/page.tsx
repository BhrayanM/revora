import { HelpCircle, Mail } from "lucide-react";

import {
  AuthBackLink,
  AuthCard,
  AuthPageHeader,
  AuthShell,
  AuthTextLink,
} from "@/components/auth/auth-shell";

export default function ForgotEmailPage() {
  return (
    <AuthShell>
      <AuthCard>
        <AuthBackLink href="/login" className="mb-6">
          Back to login
        </AuthBackLink>

        <AuthPageHeader
          visual="help"
          title="Don't remember your email?"
          description="If you don't remember which email address you used to sign up, try a previously verified sign-in method or contact account support."
          className="mb-6"
        />

        <div
          className="space-y-3 rounded-xl border border-border bg-surface-secondary/80 p-4"
          role="list"
        >
          <div className="flex items-start gap-3" role="listitem">
            <Mail className="mt-0.5 size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Try your common email addresses
              </p>
              <p className="text-xs text-muted-foreground">
                Use the password reset form to check if you recognize the email
                on file.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3" role="listitem">
            <HelpCircle className="mt-0.5 size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No recovery method yet configured
              </p>
              <p className="text-xs text-muted-foreground">
                Account recovery by alternate email or phone will be available
                after a recovery method has been added to your account.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <AuthTextLink
            href="/forgot-password"
            className="flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-surface-secondary"
          >
            Reset your password
          </AuthTextLink>
          <AuthTextLink
            href="/login"
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-600 focus-visible:ring-offset-surface"
          >
            Back to login
          </AuthTextLink>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
