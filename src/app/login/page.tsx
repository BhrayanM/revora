"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useRef, useState } from "react";

import { SocialAuth } from "@/components/auth/social-auth";
import { TurnstileWidget } from "@/components/auth/turnstile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      resetCaptcha();
    } else {
      // Check if MFA is required
      const supabase = createClient();
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aal?.nextLevel === "aal2") {
        const mfaUrl = new URL("/auth/mfa", window.location.origin);
        mfaUrl.searchParams.set("redirect", redirect);
        router.push(mfaUrl.toString());
      } else {
        router.push(redirect);
        router.refresh();
      }
    }
  };

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
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your account
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <SocialAuth returnTo={redirect} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface px-2 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

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
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
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
          Sign In
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

      <p className="mt-3 text-center">
        <Link
          href="/forgot-password"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Forgot password?
        </Link>
      </p>

      <p className="mt-1 text-center">
        <Link
          href="/forgot-email"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Forgot which email you used?
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Sign up free
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
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
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
