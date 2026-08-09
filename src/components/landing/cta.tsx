import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { RevoraMark } from "@/components/brand";
import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Container } from "@/components/ui/container";

export function CTA() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-surface-secondary/60 py-24 sm:py-32">
      <BackgroundPattern variant="gradient" />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-foreground text-canvas shadow-lg shadow-black/10">
            <RevoraMark className="size-5" />
          </span>
          <h2 className="mt-6 text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Give your revenue workflow a clearer next move.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Bring qualification, workflow activity, and team action into one
            focused workspace.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/10 outline-none transition-all hover:-translate-y-0.5 hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Start building with Revora
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Sign in to your workspace
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
