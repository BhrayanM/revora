"use client";

import { useEffect, useState } from "react";

import {
  AuthCard,
  AuthLoadingState,
  AuthShell,
  AuthStatusPanel,
  AuthTextLink,
} from "@/components/auth/auth-shell";
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
      <AuthShell>
        <AuthCard>
          <AuthLoadingState>Verifying your email change...</AuthLoadingState>
        </AuthCard>
      </AuthShell>
    );
  }

  if (!verified) {
    return (
      <AuthShell>
        <AuthCard>
          <AuthStatusPanel
            tone="warning"
            title="Session expired"
            description="Your confirmation session may have expired. Try logging in with your new email address."
          >
            <AuthTextLink
              href="/login"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-600"
            >
              Go to login
            </AuthTextLink>
          </AuthStatusPanel>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard>
        <AuthStatusPanel
          tone="success"
          title="Email updated"
          description="Your email address has been changed successfully."
        >
          <AuthTextLink
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-600"
          >
            Go to dashboard
          </AuthTextLink>
        </AuthStatusPanel>
      </AuthCard>
    </AuthShell>
  );
}
