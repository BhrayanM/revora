"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RevoraLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Platform", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-border bg-canvas/85 shadow-[0_1px_0_rgb(255_255_255_/_0.03)] backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <Container
        as="nav"
        className="flex h-[4.5rem] items-center justify-between"
      >
        <Link
          href="/"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          aria-label="Revora home"
        >
          <RevoraLockup wordmarkClassName="text-xl" />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Start building
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:hidden"
            onClick={() => setIsMobileOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="marketing-navigation"
          >
            {isMobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </Container>

      {isMobileOpen && (
        <div
          id="marketing-navigation"
          className="animate-slide-down border-b border-border bg-surface/95 backdrop-blur-xl md:hidden"
        >
          <Container className="flex flex-col gap-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setIsMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <Link
                href="/login"
                className="flex h-10 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary"
              >
                Start building
              </Link>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
