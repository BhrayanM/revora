"use client";

import type { User } from "@supabase/supabase-js";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-canvas/95 backdrop-blur-md px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-secondary hover:text-foreground lg:hidden transition-colors"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <div className="hidden sm:flex sm:flex-1 sm:max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <div className="flex h-8 w-full items-center rounded-lg border border-border bg-surface-secondary pl-9 pr-3">
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
        <Link href="/notifications" className="relative">
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-secondary hover:text-foreground transition-colors">
            <Bell className="size-4" />
          </button>
        </Link>

        <Link href="/profile">
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20 transition-all hover:ring-primary/30 hover:shadow-sm">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
