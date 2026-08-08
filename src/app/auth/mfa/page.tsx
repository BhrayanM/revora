"use client";

import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function MfaChallengePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [hasMfa, setHasMfa] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (listError || !data || data.all.length === 0) {
        setHasMfa(false);
        return;
      }
      setHasMfa(true);
      setFactorId(data.all[0]!.id);
    });
  }, []);

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
      router.push("/dashboard");
      router.refresh();
    }
  };

  if (hasMfa === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-sm text-muted-foreground">
          Checking authentication...
        </p>
      </div>
    );
  }

  if (hasMfa === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm text-center rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
            <Shield className="size-6 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">
            No MFA Configured
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Multi-factor authentication is not set up for your account.
          </p>
          <Button className="mt-6" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
              <Shield className="size-6 text-primary" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">
              Two-Factor Authentication
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
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

          <p className="mt-4 text-xs text-center text-muted-foreground">
            Lost access to your authenticator? Use a backup code from Settings →
            Security when you regain access to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
