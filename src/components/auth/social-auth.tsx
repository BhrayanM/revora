"use client";

import { useState } from "react";

import { AppleIcon } from "@/components/auth/icons/apple-icon";
import { GoogleIcon } from "@/components/auth/icons/google-icon";
import { MicrosoftIcon } from "@/components/auth/icons/microsoft-icon";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "apple" | "azure";

type ProviderConfig = {
  provider: OAuthProvider;
  label: string;
  icon: typeof GoogleIcon;
};

const providers: ProviderConfig[] = [
  { provider: "google", label: "Continue with Google", icon: GoogleIcon },
  { provider: "apple", label: "Continue with Apple", icon: AppleIcon },
  {
    provider: "azure",
    label: "Continue with Microsoft",
    icon: MicrosoftIcon,
  },
];

export function SocialAuth({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: OAuthProvider) => {
    setLoading(provider);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
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

      {providers.map(({ provider, label, icon: Icon }) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          size="xl"
          className="w-full"
          leftIcon={<Icon className="size-5" />}
          loading={loading === provider}
          disabled={loading !== null && loading !== provider}
          onClick={() => handleSignIn(provider)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
