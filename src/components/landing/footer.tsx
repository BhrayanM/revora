import Link from "next/link";

import { RevoraLockup } from "@/components/brand";
import { Container } from "@/components/ui/container";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { label: "Platform", href: "#features" },
      { label: "Workflow", href: "#workflow" },
      { label: "Integrations", href: "#integrations" },
      { label: "Revenue workspace", href: "/dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create a workspace", href: "/signup" },
      { label: "Team settings", href: "/dashboard/settings/team" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-canvas">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_repeat(3,0.5fr)]">
          <div>
            <Link
              href="/"
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              aria-label="Revora home"
            >
              <RevoraLockup wordmarkClassName="text-xl" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              Revora is an AI revenue automation platform for turning qualified
              signals into focused workflow and team action.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="rounded text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Revora. All rights reserved.</p>
          <p>AI Revenue Automation Platform</p>
        </div>
      </Container>
    </footer>
  );
}
