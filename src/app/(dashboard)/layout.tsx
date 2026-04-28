import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

/**
 * Dashboard Layout
 * =================
 * Layout bersama untuk semua halaman dalam (dashboard).
 * Route group "(dashboard)" tidak mempengaruhi URL.
 *
 * Mobile: sidebar tersembunyi, konten full-width
 * Desktop: sidebar fixed kiri 280px, konten offset
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-background font-inter antialiased">
      {/* Sidebar (fixed left, hidden on mobile) */}
      <Sidebar />

      {/* Main area — md+ offset by sidebar; mobile: full width */}
      <div className="md:ml-[280px] flex flex-col min-h-screen">
        {/* Top Bar (sticky) */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 p-4 md:px-10 md:py-8 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
