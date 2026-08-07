"use client";

import type { User } from "@supabase/supabase-js";
import { useState, type ReactNode } from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";

export function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user: User | null;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        user={user}
      />
      <div className="lg:pl-60">
        <TopNav onMenuClick={() => setMobileSidebarOpen(true)} user={user} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
