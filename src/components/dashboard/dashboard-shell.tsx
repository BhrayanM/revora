"use client";

import type { User } from "@supabase/supabase-js";
import { useRef, useState, type ReactNode } from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";
import type { ActiveOrganizationOption } from "@/lib/organizations/types";
import { cn } from "@/lib/utils";

export function DashboardShell({
  children,
  user,
  activeOrganization,
  organizations,
}: {
  children: ReactNode;
  user: User | null;
  activeOrganization: ActiveOrganizationOption | null;
  organizations: ActiveOrganizationOption[];
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  return (
    <div className="min-h-screen bg-canvas [background-image:radial-gradient(circle_at_82%_-10%,color-mix(in_srgb,var(--foreground)_4%,transparent),transparent_28%)]">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        user={user}
        activeOrganization={activeOrganization}
        organizations={organizations}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300",
          sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-60",
        )}
      >
        <TopNav
          onMenuClick={() => setMobileSidebarOpen(true)}
          menuButtonRef={menuButtonRef}
          mobileMenuOpen={mobileSidebarOpen}
          user={user}
        />
        <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
