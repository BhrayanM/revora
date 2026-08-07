"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopNavProps {
  onMenuClick?: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const [notifications] = useState(3);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-zinc-500 hover:bg-surface-secondary hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <div className="hidden sm:flex sm:flex-1 sm:max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search leads, contacts, deals..."
            className="pl-9"
            inputSize="sm"
          />
        </div>
      </div>

      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-2">
        <Link href="/notifications" className="relative">
          <Button variant="ghost" size="sm" className="size-9 p-0">
            <Bell className="size-4" />
            {notifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[0.625rem] font-bold text-white">
                {notifications}
              </span>
            )}
          </Button>
        </Link>

        <Link href="/profile">
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
            JS
          </div>
        </Link>
      </div>
    </header>
  );
}
