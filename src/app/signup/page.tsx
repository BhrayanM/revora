"use client";

import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useRef, useState } from "react";

import {
  AuthBackLink,
  AuthCard,
  AuthPageHeader,
  AuthShell,
  AuthTextLink,
} from "@/components/auth/auth-shell";
import { SocialAuth } from "@/components/auth/social-auth";
import { TurnstileWidget } from "@/components/auth/turnstile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSafeInternalPath } from "@/lib/navigation/safe-internal-path";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = getSafeInternalPath(searchParams.get("redirect"));
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [legalConsentAccepted, setLegalConsentAccepted] = useState(false);
  const turnstileResetRef = useRef<(() => void) | null>(null);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileResetRef.current?.();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!legalConsentAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      resetCaptcha();
    } else {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("pendingSignupEmail", email);
      }
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`,
      );
    }
  };

  return (
    <AuthShell size="md">
      <AuthCard>
        <AuthBackLink href="/" className="mb-6">
          Back to home
        </AuthBackLink>
        <AuthPageHeader
          title="Start building with Revora"
          description="Create your workspace and organize your revenue workflow."
        />

        <div className="mt-8">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          {message && (
            <Alert variant="success" className="mb-4">
              {message}
            </Alert>
          )}

          <SocialAuth
            returnTo={redirect}
            requireLegalConsent
            legalConsentAccepted={legalConsentAccepted}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              inputSize="lg"
              autoComplete="name"
              required
            />
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              inputSize="lg"
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min 6 characters)"
              inputSize="lg"
              autoComplete="new-password"
              required
              minLength={6}
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              inputSize="lg"
              autoComplete="new-password"
              required
              minLength={6}
            />

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-secondary p-4 text-sm text-muted-foreground">
              <input
                id="signup-legal-consent"
                type="checkbox"
                checked={legalConsentAccepted}
                onChange={(event) =>
                  setLegalConsentAccepted(event.target.checked)
                }
                className="mt-0.5 size-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              />
              <span>
                I agree to the{" "}
                <AuthTextLink href="/terms">Terms of Service</AuthTextLink> and{" "}
                <AuthTextLink href="/privacy">Privacy Policy</AuthTextLink>.
                <span className="mt-1 block text-xs text-subtle">
                  Required before creating an account or continuing with a
                  provider.
                </span>
              </span>
            </label>

            <Button
              type="submit"
              size="xl"
              className="w-full shadow-lg shadow-primary/25"
              loading={loading}
              disabled={!captchaToken || !legalConsentAccepted}
            >
              Create Account
              <ArrowRight className="size-5" />
            </Button>

            <div className="flex justify-center">
              <TurnstileWidget
                onVerify={setCaptchaToken}
                onExpire={resetCaptcha}
                onResetReady={(reset) => {
                  turnstileResetRef.current = reset;
                }}
              />
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <AuthTextLink
              href={`/login?redirect=${encodeURIComponent(redirect)}`}
            >
              Sign in
            </AuthTextLink>
          </p>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell size="md">
          <AuthCard>Loading signup...</AuthCard>
        </AuthShell>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
