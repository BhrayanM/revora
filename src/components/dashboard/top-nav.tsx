"use client";

import type { User } from "@supabase/supabase-js";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";

import { GlobalSearch } from "@/components/dashboard/global-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface TopNavProps {
  onMenuClick?: () => void;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  mobileMenuOpen?: boolean;
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

export function TopNav({
  onMenuClick,
  menuButtonRef,
  mobileMenuOpen = false,
  user,
}: TopNavProps) {
  const userMeta = user?.user_metadata as { full_name?: string } | undefined;
  const initials = getInitials(userMeta?.full_name, user?.email);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-canvas/90 backdrop-blur-xl px-4 sm:px-6">
      <button
        type="button"
        ref={menuButtonRef}
        onClick={onMenuClick}
        className="flex size-11 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas lg:hidden"
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-sidebar"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <div className="flex sm:flex-1 sm:max-w-md">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        <Link
          href="/notifications"
          className="relative flex size-11 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          aria-label="Open Activity Center"
        >
          <Bell className="size-4" />
        </Link>

        <Link
          href="/profile"
          className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20 outline-none transition-all hover:ring-primary/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          aria-label="Open profile"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
