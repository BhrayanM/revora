import { ArrowLeft, HelpCircle, Mail } from "lucide-react";
import Link from "next/link";

export default function ForgotEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to login
            </Link>
          </div>

          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary ring-1 ring-border">
              <HelpCircle className="size-6 text-muted-foreground" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">
              Don&apos;t remember your email?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              If you don&apos;t remember which email address you used to sign
              up, try using a previously verified sign-in method or contact
              account support.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-surface-secondary p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Try your common email addresses
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the password reset form to check if you recognize the
                  email on file.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
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
            <Link
              href="/forgot-password"
              className="flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-surface-secondary"
            >
              Reset your password
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
