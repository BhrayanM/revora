import { redirect } from "next/navigation";

import { ConsentForm } from "@/app/legal/consent/consent-form";
import {
  AuthCard,
  AuthPageHeader,
  AuthShell,
} from "@/components/auth/auth-shell";
import { getSafeInternalPath } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Review legal terms — AI Growth",
};

export default async function LegalConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Flegal%2Fconsent");
  }

  const { next } = await searchParams;
  const nextPath = getSafeInternalPath(next);

  return (
    <AuthShell size="lg">
      <AuthCard>
        <AuthPageHeader
          visual="legal"
          eyebrow="One more step"
          title="Review our legal terms"
          description="We have updated the terms that govern access to AI Growth. Please review and accept them to continue."
        />

        <div className="mt-6">
          <ConsentForm nextPath={nextPath} />
        </div>
      </AuthCard>
    </AuthShell>
  );
}
