"use client";

import { useState } from "react";

import { AppleIcon } from "@/components/auth/icons/apple-icon";
import { GoogleIcon } from "@/components/auth/icons/google-icon";
import { MicrosoftIcon } from "@/components/auth/icons/microsoft-icon";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "apple" | "azure";

type ProviderStatus = "active" | "coming_soon";

type ProviderConfig = {
  provider: OAuthProvider;
  label: string;
  icon: typeof GoogleIcon;
  scopes?: string;
};

const allProviders: ProviderConfig[] = [
  { provider: "google", label: "Continue with Google", icon: GoogleIcon },
  { provider: "apple", label: "Continue with Apple", icon: AppleIcon },
  {
    provider: "azure",
    label: "Continue with Microsoft",
    icon: MicrosoftIcon,
    scopes: "email",
  },
];

function getActiveProviders(): OAuthProvider[] {
  const raw = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "google";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is OAuthProvider =>
      ["google", "apple", "azure"].includes(s),
    );
}

function getProviderStatus(provider: OAuthProvider): ProviderStatus {
  return getActiveProviders().includes(provider) ? "active" : "coming_soon";
}

export function SocialAuth({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: OAuthProvider, scopes?: string) => {
    setLoading(provider);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
        ...(scopes ? { scopes } : {}),
      },
    });

    if (authError) {
      setError(authError.message);
    }

    setLoading(null);
  };

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="error" className="text-sm">
          {error}
        </Alert>
      )}

      {allProviders.map(({ provider, label, icon: Icon, scopes }) => {
        const status = getProviderStatus(provider);
        const isActive = status === "active";

        return (
          <div key={provider} className="relative">
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="w-full"
              leftIcon={<Icon className="size-5" />}
              loading={loading === provider}
              disabled={!isActive || loading !== null}
              onClick={() => isActive && handleSignIn(provider, scopes)}
            >
              {label}
            </Button>
            {!isActive && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Soon
              </span>
            )}
          </div>
        );
      })}

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
    </div>
  );
}
