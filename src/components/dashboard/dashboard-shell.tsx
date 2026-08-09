"use client";

import type { User } from "@supabase/supabase-js";
import { useState, type ReactNode } from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";
import type { ActiveOrganizationOption } from "@/lib/organizations/types";

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

  return (
    <div className="min-h-screen bg-canvas [background-image:radial-gradient(circle_at_82%_-10%,color-mix(in_srgb,var(--foreground)_4%,transparent),transparent_28%)]">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        user={user}
        activeOrganization={activeOrganization}
        organizations={organizations}
      />
      <div className="flex min-h-screen flex-col lg:pl-60">
        <TopNav onMenuClick={() => setMobileSidebarOpen(true)} user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
