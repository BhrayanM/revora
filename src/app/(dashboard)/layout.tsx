"use client";

import { useState } from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-60">
        <TopNav onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
