"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useRef, useState } from "react";

import { SocialAuth } from "@/components/auth/social-auth";
import { TurnstileWidget } from "@/components/auth/turnstile";
import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
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
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-canvas">
      <BackgroundPattern variant="gradient" />

      <div className="flex items-center p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Home
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-bold text-xl mb-8"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <span className="text-foreground">AI Growth</span>
            </Link>

            <h1 className="text-2xl font-bold text-foreground">
              Start Your Free Trial
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              14-day free trial. No credit card required.
            </p>
          </div>

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

            <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-secondary p-4 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={legalConsentAccepted}
                onChange={(event) =>
                  setLegalConsentAccepted(event.target.checked)
                }
                className="mt-0.5 size-4 rounded border-border accent-primary"
              />
              <span>
                I agree to the{" "}
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

            <SocialAuth
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
                required
              />
              <Input
                label="Work Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                inputSize="lg"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                inputSize="lg"
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
                required
                minLength={6}
              />

              <Button
                type="submit"
                size="xl"
                className="w-full shadow-lg shadow-primary/25"
                loading={loading}
                disabled={!captchaToken || !legalConsentAccepted}
              >
                Create Free Account
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

          <div className="mt-8 rounded-xl border border-border bg-surface-secondary p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Your free trial includes:
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                "Up to 500 leads with AI qualification",
                "Email automation with pre-built sequences",
                "GoHighLevel & HubSpot integration",
                "Basic analytics and reporting",
                "Email support within 24 hours",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
