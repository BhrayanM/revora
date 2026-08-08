"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

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
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="text-sm text-muted-foreground">
          Verifying session...
        </div>
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/10">
              <KeyRound className="size-6 text-warning" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">
              Invalid or expired link
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
            >
              Request a new link
            </Link>
          </div>
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
              <KeyRound className="size-6 text-primary" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">
              Set new password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {success
                ? "Password updated. Redirecting to login..."
                : "Enter your new password below."}
            </p>
          </div>

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
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
              >
                Go to login
              </Link>
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
        </div>
      </div>
    </div>
  );
}
