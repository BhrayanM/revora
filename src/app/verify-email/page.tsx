"use client";

import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_MS = 30_000;

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const emailFromParam = searchParams.get("email");

  const [email, setEmail] = useState(() => {
    if (emailFromParam) return emailFromParam;
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("pendingSignupEmail") ?? "";
    }
    return "";
  });
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (email && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("pendingSignupEmail", email);
    }
  }, [email]);

  useEffect(() => {
    if (resentAt === null) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - resentAt;
      const remaining = Math.max(0, RESEND_COOLDOWN_MS - elapsed);
      setCooldown(remaining);
      if (remaining === 0) setResentAt(null);
    }, 200);
    return () => clearInterval(timer);
  }, [resentAt]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || code.length !== 6) return;

    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("pendingSignupEmail");
    }

    // Full-page redirect to the callback route handler for session check + provisioning
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/auth/callback?next=/dashboard";
  };

  const handleResend = async () => {
    if (!email) return;
    if (resentAt && Date.now() - resentAt < RESEND_COOLDOWN_MS) return;

    setError(null);
    setMessage(null);
    setResending(true);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setResending(false);

    if (resendError) {
      setError(resendError.message);
    } else {
      setResentAt(Date.now());
      setMessage("A new verification code has been sent.");
    }
  };

  const maskedEmail = email ? email.replace(/(.{2}).*(@.*)/, "$1***$2") : "";

  return (
    <>
      <div className="text-center mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold text-xl"
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
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          Verify your email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {email
            ? `Enter the 6-digit code sent to ${maskedEmail}`
            : "Enter your email and the 6-digit verification code"}
        </p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        {!emailFromParam && (
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            inputSize="lg"
            required
          />
        )}

        <div>
          <Input
            autoFocus
            label="Verification Code"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(val);
            }}
            placeholder="000000"
            inputSize="lg"
            className="text-center text-2xl tracking-[0.3em] font-mono"
            maxLength={6}
            autoComplete="one-time-code"
            inputMode="numeric"
          />
        </div>

        <Button
          type="submit"
          size="xl"
          className="w-full"
          loading={loading}
          disabled={!email || code.length !== 6}
        >
          Verify Email
          <ArrowRight className="size-5" />
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0 || !email}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`size-3.5 ${resending ? "animate-spin" : ""}`}
          />
          {cooldown > 0
            ? `Resend code in ${Math.ceil(cooldown / 1000)}s`
            : "Resend code"}
        </button>

        <Link
          href="/signup"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to signup
        </Link>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <Suspense
            fallback={
              <div className="text-center text-muted-foreground">
                Loading...
              </div>
            }
          >
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
