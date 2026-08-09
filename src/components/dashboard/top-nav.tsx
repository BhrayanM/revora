"use client";

import type { User } from "@supabase/supabase-js";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

interface TopNavProps {
  onMenuClick?: () => void;
  user: User | null;
}

function getInitials(
  name: string | undefined,
  email: string | undefined,
): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

export function TopNav({ onMenuClick, user }: TopNavProps) {
  const userMeta = user?.user_metadata as { full_name?: string } | undefined;
  const initials = getInitials(userMeta?.full_name, user?.email);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-canvas/90 backdrop-blur-xl px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-1.5 text-muted-foreground outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <div className="hidden sm:flex sm:flex-1 sm:max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <div className="flex h-9 w-full items-center rounded-xl border border-border bg-surface pl-9 pr-3 shadow-sm">
            <span className="text-xs text-muted-foreground">
              Search leads, contacts...
            </span>
            <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">
              Soon
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </Link>

        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20 outline-none transition-all hover:ring-primary/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          aria-label="Open profile"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
