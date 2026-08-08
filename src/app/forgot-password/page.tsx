"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";

import {
  AuthBackLink,
  AuthCard,
  AuthPageHeader,
  AuthShell,
} from "@/components/auth/auth-shell";
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
    <AuthShell>
      <AuthCard>
        <AuthBackLink href="/login" className="mb-6">
          Back to login
        </AuthBackLink>

        <AuthPageHeader
          visual="email"
          title="Reset your password"
          description={
            sent
              ? "If an account exists, you will receive a password reset email shortly."
              : "Enter your email and we'll send you a reset link."
          }
          className="mb-6"
        />

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
                autoComplete="email"
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
      </AuthCard>
    </AuthShell>
  );
}
