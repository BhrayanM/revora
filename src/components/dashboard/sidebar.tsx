"use client";

import type { User } from "@supabase/supabase-js";
import {
  Activity,
  BarChart3,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navigation = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Leads", href: "/leads", icon: Users },
      { label: "Pipeline", href: "/pipeline", icon: Layers },
      {
        label: "Calendar",
        href: "/dashboard#calendar",
        icon: Calendar,
        disabled: true,
        badge: "Soon",
      },
    ],
  },
  {
    section: "AI",
    items: [
      { label: "AI Insights", href: "/dashboard#ai", icon: Bot, badge: "Soon" },
      {
        label: "Chat",
        href: "/dashboard#chat",
        icon: MessageSquare,
        disabled: true,
        badge: "Soon",
      },
    ],
  },
  {
    section: "Automation",
    items: [{ label: "Automation", href: "/automation", icon: Activity }],
  },
  {
    section: "Settings",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Profile", href: "/profile", icon: UserIcon },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const userMeta = user?.user_metadata as { full_name?: string } | undefined;
  const displayName =
    userMeta?.full_name ?? user?.email?.split("@")[0] ?? "User";
  const initials = getInitials(userMeta?.full_name, user?.email);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/25">
              <svg
                className="h-3.5 w-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
            </div>
            <span className="text-sm tracking-tight">AI Growth</span>
          </Link>
        )}
        <div
          className={cn(
            "flex items-center gap-1",
            collapsed && "w-full justify-center",
          )}
        >
          <button
            onClick={onMobileClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-secondary hover:text-foreground lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-surface-secondary hover:text-foreground transition-colors lg:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronLeft className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navigation.map((group) => (
          <div key={group.section} className="mb-5">
            {!collapsed && (
              <h3 className="mb-1.5 px-3 text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section}
              </h3>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const isDisabled = "disabled" in item && item.disabled;

                if (isDisabled) {
                  return (
                    <span
                      key={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed select-none",
                        collapsed && "justify-center px-2",
                      )}
                      aria-disabled="true"
                    >
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span>{item.label}</span>
                          {"badge" in item && item.badge && (
                            <span className="ml-auto rounded-full bg-surface-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-colors duration-150",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {"badge" in item && item.badge && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.625rem] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-lg p-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-secondary hover:text-error transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-secondary hover:text-error transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-transform duration-300 lg:translate-x-0",
          collapsed ? "w-[68px]" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
