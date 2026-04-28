"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

/**
 * Dashboard Layout
 * =================
 * Layout bersama untuk semua halaman dalam (dashboard).
 * Route group "(dashboard)" tidak mempengaruhi URL.
 *
 * Mobile: sidebar tersembunyi, konten full-width
 * Desktop: sidebar bisa di-collapse (280px <-> 88px)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-background font-inter antialiased">
      {/* Sidebar (fixed left, hidden on mobile) */}
      <Sidebar isCollapsed={isSidebarCollapsed} />

      {/* Main area — md+ offset by sidebar; mobile: full width */}
      <div className={`transition-all duration-300 ease-in-out flex flex-col min-h-screen ${isSidebarCollapsed ? "md:ml-[88px]" : "md:ml-[280px]"}`}>
        {/* Top Bar (sticky) */}
        <TopBar 
          onHamburgerClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          isSidebarCollapsed={isSidebarCollapsed} 
        />

        {/* Page Content */}
        <main className="relative z-10 flex-1 p-4 md:px-10 md:py-8 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
