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
  Settings,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { RevoraMark } from "@/components/brand/revora-mark";
import { OrganizationSwitcher } from "@/components/dashboard/organization-switcher";
import type { ActiveOrganizationOption } from "@/lib/organizations/types";
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
      { label: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    section: "AI",
    items: [{ label: "AI Insights", href: "/insights", icon: Bot }],
  },
  {
    section: "Automation",
    items: [{ label: "Automation", href: "/automation", icon: Activity }],
  },
  {
    section: "Settings",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Team", href: "/dashboard/settings/team", icon: Users },
      { label: "Profile", href: "/profile", icon: UserIcon },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  user: User | null;
  activeOrganization: ActiveOrganizationOption | null;
  organizations: ActiveOrganizationOption[];
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
  collapsed,
  onCollapsedChange,
  user,
  activeOrganization,
  organizations,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const frame = window.requestAnimationFrame(() =>
      firstMobileLinkRef.current?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onMobileClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onMobileClose]);

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

  const renderSidebarContent = (isCollapsed: boolean, isMobile: boolean) => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-active shadow-sm shadow-sidebar-active/25">
              <RevoraMark className="size-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Revora
            </span>
          </Link>
        )}
        {isCollapsed && (
          <div className="flex w-full justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-active shadow-sm shadow-sidebar-active/25">
              <RevoraMark className="size-3.5 text-primary-foreground" />
            </div>
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1",
            isCollapsed && "w-full justify-center",
          )}
        >
          {isMobile ? (
            <button
              type="button"
              onClick={onMobileClose}
              className="flex size-11 items-center justify-center rounded-md text-sidebar-muted outline-none transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCollapsedChange(!isCollapsed)}
              className="flex size-11 items-center justify-center rounded-md text-sidebar-muted outline-none transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronLeft className="size-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-sidebar-border px-3 py-2">
        <OrganizationSwitcher
          activeOrganization={activeOrganization}
          organizations={organizations}
          compact={isCollapsed}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navigation.map((group) => (
          <div key={group.section} className="mb-5">
            {!isCollapsed && (
              <h3 className="mb-1.5 px-3 text-[0.625rem] font-semibold uppercase tracking-wider text-sidebar-muted">
                {group.section}
              </h3>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    ref={
                      isMobile && item.href === "/dashboard"
                        ? firstMobileLinkRef
                        : undefined
                    }
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                      isActive
                        ? "bg-sidebar-active-surface text-sidebar-active"
                        : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                      isCollapsed && "justify-center px-2",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-colors duration-150",
                        isActive
                          ? "text-sidebar-active"
                          : "text-sidebar-muted group-hover:text-sidebar-foreground",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 rounded-lg p-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active/15 text-xs font-semibold text-sidebar-active ring-1 ring-sidebar-active/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-sidebar-muted truncate">
                {user?.email ?? ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex size-11 items-center justify-center rounded-md text-sidebar-muted outline-none transition-colors hover:bg-sidebar-hover hover:text-error focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-active/15 text-xs font-semibold text-sidebar-active ring-1 ring-sidebar-active/20">
              {initials}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex size-11 items-center justify-center rounded-md text-sidebar-muted outline-none transition-colors hover:bg-sidebar-hover hover:text-error focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
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
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        {renderSidebarContent(collapsed, false)}
      </aside>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside
            id="mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar lg:hidden"
          >
            {renderSidebarContent(false, true)}
          </aside>
        </>
      )}
    </>
  );
}
