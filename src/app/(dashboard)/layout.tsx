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

        {/* Dashboard Background Blobs for Glassmorphism */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            aria-hidden="true"
            className="absolute -top-40 right-0 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative aspect-[1155/678] w-[36.125rem] rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:w-[72.1875rem]"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute top-[calc(100%-13rem)] left-0 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:w-[72.1875rem]"
            />
          </div>
        </div>

        {/* Page Content */}
        <main className="relative z-10 flex-1 p-4 md:px-10 md:py-8 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
