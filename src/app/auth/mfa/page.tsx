"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";

import {
  AuthCard,
  AuthLoadingState,
  AuthPageHeader,
  AuthShell,
  AuthStatusPanel,
} from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface VerifiedFactor {
  id: string;
  friendly_name?: string;
  type: string;
}

function MfaChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [factors, setFactors] = useState<VerifiedFactor[]>([]);
  const [hasMfa, setHasMfa] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (listError || !data || data.all.length === 0) {
        setHasMfa(false);
        return;
      }
      setHasMfa(true);
      const verifiedFactors: VerifiedFactor[] = data.all
        .filter((f) => f.status === "verified")
        .map((f) => ({
          id: f.id,
          friendly_name:
            "friendly_name" in f
              ? (f as { friendly_name?: string }).friendly_name
              : undefined,
          type:
            "type" in f ? ((f as { type?: string }).type ?? "totp") : "totp",
        }));
      setFactors(verifiedFactors);
      if (verifiedFactors.length > 0) {
        setFactorId(verifiedFactors[0]!.id);
      }
    });
  }, []);

  const handleBackToLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId || !code) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
    } else {
      router.push(redirect);
      router.refresh();
    }
  };

  if (hasMfa === null) {
    return <AuthLoadingState>Checking authentication...</AuthLoadingState>;
  }

  if (hasMfa === false) {
    return (
      <AuthStatusPanel
        tone="neutral"
        title="No MFA configured"
        description="Multi-factor authentication is not set up for your account."
      >
        <Button
          onClick={() => {
            router.push(redirect);
            router.refresh();
          }}
        >
          Go to Dashboard
        </Button>
      </AuthStatusPanel>
    );
  }

  if (!factorId) {
    return (
      <AuthStatusPanel
        tone="warning"
        title="MFA setup incomplete"
        description="Your authenticator enrollment has not been verified. Complete setup in Settings → Security."
      />
    );
  }

  return (
    <>
      <div className="mb-6">
        <button
          type="button"
          onClick={handleBackToLogin}
          className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to login
        </button>
      </div>

      <AuthPageHeader
        visual="security"
        title="Two-factor authentication"
        description="Enter the 6-digit code from your authenticator app."
        className="mb-6"
      />

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {factors.length > 1 && (
        <div className="mb-4">
          <label
            htmlFor="mfa-authenticator"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Authenticator
          </label>
          <select
            id="mfa-authenticator"
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            value={factorId}
            onChange={(e) => {
              setFactorId(e.target.value);
              setCode("");
              setError(null);
            }}
          >
            {factors.map((f, i) => (
              <option key={f.id} value={f.id}>
                {f.friendly_name ? f.friendly_name : `Authenticator ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Verification Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          required
          maxLength={6}
          inputSize="lg"
          className="text-center text-2xl tracking-[0.25em]"
          autoComplete="one-time-code"
          inputMode="numeric"
        />
        <Button
          type="submit"
          size="xl"
          className="w-full"
          loading={loading}
          disabled={code.length !== 6}
        >
          Verify
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Lost access to your authenticator? Try another enrolled authenticator or
        contact support for account recovery.
      </p>
    </>
  );
}

export default function MfaChallengePage() {
  return (
    <AuthShell>
      <AuthCard>
        <Suspense
          fallback={
            <AuthLoadingState>Loading security check...</AuthLoadingState>
          }
        >
          <MfaChallengeForm />
        </Suspense>
      </AuthCard>
    </AuthShell>
  );
}
