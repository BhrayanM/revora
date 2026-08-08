"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  HelpCircle,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { BackgroundPattern } from "@/components/shared/background-pattern";
import { cn } from "@/lib/utils";

type AuthShellSize = "sm" | "md" | "lg";
type AuthVisual =
  | "brand"
  | "email"
  | "security"
  | "key"
  | "help"
  | "legal"
  | "success"
  | "warning";

const shellWidths: Record<AuthShellSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const visualStyles: Record<
  Exclude<AuthVisual, "brand">,
  { icon: typeof Mail; className: string }
> = {
  email: {
    icon: Mail,
    className: "bg-primary/10 text-primary ring-primary/15",
  },
  security: {
    icon: ShieldCheck,
    className: "bg-primary/10 text-primary ring-primary/15",
  },
  key: {
    icon: KeyRound,
    className: "bg-primary/10 text-primary ring-primary/15",
  },
  help: {
    icon: HelpCircle,
    className: "bg-surface-secondary text-muted-foreground ring-border",
  },
  legal: {
    icon: FileText,
    className: "bg-primary/10 text-primary ring-primary/15",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-success/10 text-success ring-success/15",
  },
  warning: {
    icon: CircleAlert,
    className: "bg-warning/10 text-warning ring-warning/15",
  },
};

export function AuthShell({
  children,
  className,
  size = "sm",
}: {
  children: ReactNode;
  className?: string;
  size?: AuthShellSize;
}) {
  return (
    <main
      id="main-content"
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-8 sm:px-6 sm:py-12"
    >
      <BackgroundPattern variant="gradient" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />
      <div className={cn("relative w-full", shellWidths[size], className)}>
        {children}
      </div>
    </main>
  );
}

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/90 bg-surface/95 p-6 shadow-xl backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AuthBrand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-bold text-xl text-foreground outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30">
        <Sparkles className="size-4.5 text-white" aria-hidden="true" />
      </span>
      <span>AI Growth</span>
    </Link>
  );
}

export function AuthPageHeader({
  title,
  description,
  visual = "brand",
  eyebrow,
  className,
}: {
  title: string;
  description?: ReactNode;
  visual?: AuthVisual;
  eyebrow?: string;
  className?: string;
}) {
  const visualConfig = visual === "brand" ? null : visualStyles[visual];
  const VisualIcon = visualConfig?.icon;

  return (
    <header className={cn("text-center", className)}>
      {visual === "brand" ? (
        <AuthBrand className="mb-7" />
      ) : (
        <div
          className={cn(
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ring-1",
            visualConfig?.className,
          )}
        >
          {VisualIcon && <VisualIcon className="size-6" aria-hidden="true" />}
        </div>
      )}
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
    </header>
  );
}

export function AuthBackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 rounded text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {children}
    </Link>
  );
}

export function AuthTextLink({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "rounded font-medium text-primary outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    />
  );
}

export function AuthLoadingState({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-24 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="size-5 animate-spin text-primary motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  );
}

export function AuthStatusPanel({
  tone,
  title,
  description,
  children,
}: {
  tone: "success" | "warning" | "neutral";
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  const visual =
    tone === "success" ? "success" : tone === "warning" ? "warning" : "help";

  return (
    <div
      className="text-center"
      role={tone === "warning" ? "alert" : "status"}
      aria-live="polite"
    >
      <AuthPageHeader title={title} description={description} visual={visual} />
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
