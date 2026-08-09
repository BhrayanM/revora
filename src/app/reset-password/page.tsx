"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  AuthCard,
  AuthLoadingState,
  AuthPageHeader,
  AuthShell,
  AuthStatusPanel,
  AuthTextLink,
} from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  if (hasSession === null) {
    return (
      <AuthShell>
        <AuthCard>
          <AuthLoadingState>Verifying your reset link...</AuthLoadingState>
        </AuthCard>
      </AuthShell>
    );
  }

  if (hasSession === false) {
    return (
      <AuthShell>
        <AuthCard>
          <AuthStatusPanel
            tone="warning"
            title="Invalid or expired link"
            description="This password reset link is invalid or has expired."
          >
            <AuthTextLink
              href="/forgot-password"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-600"
            >
              Request a new link
            </AuthTextLink>
          </AuthStatusPanel>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard>
        <AuthPageHeader
          visual="key"
          title="Set new password"
          description={
            success
              ? "Password updated. Redirecting to login..."
              : "Enter your new password below."
          }
          className="mb-6"
        />

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {success ? (
          <div className="text-center">
            <Alert variant="success" className="mb-4">
              Password updated successfully.
            </Alert>
            <AuthTextLink
              href="/login"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-600"
            >
              Go to login
            </AuthTextLink>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
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
              placeholder="Re-enter new password"
              inputSize="lg"
              autoComplete="new-password"
              required
              minLength={6}
            />
            <Button
              type="submit"
              size="xl"
              className="w-full"
              loading={loading}
            >
              Update Password
            </Button>
          </form>
        )}
      </AuthCard>
    </AuthShell>
  );
}
