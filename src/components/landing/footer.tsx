import { Globe, MessageCircle, Rss } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Integrations", href: "#integrations" },
    { label: "Pricing", href: "#pricing" },
    { label: "Sign Up", href: "/signup" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Guides", href: "#" },
    { label: "Help Center", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Partners", href: "#" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "#" },
    { label: "GDPR", href: "#" },
    { label: "SLA", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-surface-secondary">
      <Container className="py-16">
        <div className="grid gap-8 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
              </div>
              <span className="text-foreground">AI Growth</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              End-to-End AI Business Automation Platform. Qualify leads, book
              appointments, and automate your growth.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="ghost" size="sm" className="size-9 p-0">
                <Globe className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" className="size-9 p-0">
                <MessageCircle className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" className="size-9 p-0">
                <Rss className="size-4" />
              </Button>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground">
                {category}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Stay in the loop
              </h3>
              <p className="text-xs text-muted-foreground">
                Get product updates and AI automation tips.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Input
                placeholder="Enter your email"
                inputSize="sm"
                className="w-full sm:w-60"
              />
              <Button size="sm">Subscribe</Button>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AI Growth. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
