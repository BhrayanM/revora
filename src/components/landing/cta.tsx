import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SlideUp } from "@/components/ui/motion";

export function CTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <BackgroundPattern variant="gradient" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <Container className="relative">
        <SlideUp>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Automate
              </span>{" "}
              Your Growth?
            </h2>
            <p className="mt-4 text-lg text-zinc-600">
              Join thousands of businesses using AI Growth Platform to qualify
              more leads, book more meetings, and close more deals.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard">
                <Button size="xl" className="shadow-lg shadow-primary/25">
                  Start Free 14-Day Trial
                  <ArrowRight className="size-5" />
                </Button>
              </Link>
              <Button variant="outline" size="xl">
                Schedule a Demo
              </Button>
            </div>
            <p className="mt-6 text-sm text-zinc-500">
              No credit card required. Cancel anytime. Set up in minutes.
            </p>
          </div>
        </SlideUp>
      </Container>
    </section>
  );
}
