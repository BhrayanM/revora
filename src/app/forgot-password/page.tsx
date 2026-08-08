"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useRef, useState } from "react";

import { TurnstileWidget } from "@/components/auth/turnstile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileResetRef = useRef<(() => void) | null>(null);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileResetRef.current?.();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const origin = window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${origin}/reset-password`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      resetCaptcha();
    } else {
      setSent(true);
    }
  };

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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
              <Mail className="size-6 text-primary" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {sent
                ? "If an account exists, you will receive a password reset email shortly."
                : "Enter your email and we'll send you a reset link."}
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {!sent && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  inputSize="lg"
                  required
                />
                <Button
                  type="submit"
                  size="xl"
                  className="w-full"
                  loading={loading}
                  disabled={!captchaToken}
                >
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-4">
                <TurnstileWidget
                  onVerify={setCaptchaToken}
                  onExpire={resetCaptcha}
                  onResetReady={(reset) => {
                    turnstileResetRef.current = reset;
                  }}
                />
              </div>
            </>
          )}

          {sent && (
            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setSent(false);
                  resetCaptcha();
                }}
              >
                Send another
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
