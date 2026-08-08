"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useRef, useState } from "react";

import {
  AuthCard,
  AuthLoadingState,
  AuthPageHeader,
  AuthShell,
  AuthTextLink,
} from "@/components/auth/auth-shell";
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
      <AuthPageHeader
        title="Welcome back"
        description="Sign in to your account"
        className="mb-8"
      />

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <SocialAuth returnTo={redirect} />

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
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          inputSize="lg"
          autoComplete="current-password"
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
        <AuthTextLink
          href="/forgot-password"
          className="text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </AuthTextLink>
      </p>

      <p className="mt-1 text-center">
        <AuthTextLink
          href="/forgot-email"
          className="text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          Forgot which email you used?
        </AuthTextLink>
      </p>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <AuthTextLink href="/signup">Sign up free</AuthTextLink>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthCard>
        <Suspense
          fallback={<AuthLoadingState>Loading sign in...</AuthLoadingState>}
        >
          <LoginForm />
        </Suspense>
      </AuthCard>
    </AuthShell>
  );
}
