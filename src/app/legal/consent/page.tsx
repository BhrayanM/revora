import { redirect } from "next/navigation";

import { ConsentForm } from "@/app/legal/consent/consent-form";
import { getSafeInternalPath } from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Review legal terms — AI Growth Platform",
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
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          One more step
        </p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          Review our legal terms
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We have updated the terms that govern access to AI Growth Platform.
          Please review and accept them to continue.
        </p>

        <div className="mt-6">
          <ConsentForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
