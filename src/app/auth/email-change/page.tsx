"use client";

import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function EmailChangePage() {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setVerified(!!session);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-sm text-muted-foreground">Verifying...</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm text-center rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/10">
            <Mail className="size-6 text-warning" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">
            Session expired
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your confirmation session may have expired. Try logging in with your
            new email address.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            Go to Login
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm text-center rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 ring-1 ring-success/10">
          <CheckCircle2 className="size-6 text-success" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">
          Email Updated
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your email address has been changed successfully.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
        >
          Go to Dashboard
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
