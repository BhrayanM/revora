"use client";

import {
  BarChart3,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Settings,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

const navigation = [
  {
    section: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    section: "Sales",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: Users,
      },
      {
        label: "Pipeline",
        href: "/pipeline",
        icon: Layers,
      },
      {
        label: "Calendar",
        href: "#",
        icon: Calendar,
        disabled: true,
      },
    ],
  },
  {
    section: "AI",
    items: [
      {
        label: "AI Insights",
        href: "#",
        icon: Bot,
        badge: "Soon",
      },
      {
        label: "Chat",
        href: "#",
        icon: MessageSquare,
        disabled: true,
      },
    ],
  },
  {
    section: "Settings",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
      {
        label: "Profile",
        href: "/profile",
        icon: User,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-all duration-300",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
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
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <span className="text-sm">AI Growth</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-surface-secondary hover:text-foreground",
            collapsed && "mx-auto",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((group) => (
          <div key={group.section} className="mb-6">
            {!collapsed && (
              <h3 className="mb-2 px-3 text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-400">
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
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400/50 cursor-not-allowed",
                        collapsed && "justify-center px-2",
                      )}
                      title={item.label}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-zinc-600 hover:bg-surface-secondary hover:text-foreground",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="size-4 shrink-0" />
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

      <div className="border-t border-border p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              JS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                John Smith
              </p>
              <p className="text-xs text-zinc-500">Admin</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              JS
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
