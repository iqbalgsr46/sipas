"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const allNavItems = [
  { href: "/dashboard", icon: "space_dashboard", label: "Dashboard", roles: ["admin", "staf", "pimpinan"] },
  { href: "/surat-masuk", icon: "mail", label: "Surat Masuk", roles: ["admin", "staf", "pimpinan"] },
  { href: "/surat-keluar", icon: "send", label: "Surat Keluar", roles: ["admin", "staf", "pimpinan"] },
  { href: "/approval", icon: "pending_actions", label: "Approval", roles: ["admin", "pimpinan"] },
  { href: "/users", icon: "group", label: "Manajemen User", roles: ["admin"] },
  { href: "/settings", icon: "settings", label: "Pengaturan", roles: ["admin", "staf", "pimpinan"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>("staf");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const localUser = localStorage.getItem("sipas_user");
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        setUserRole(parsed.role || "staf");
      } catch {
        // malformed localStorage — ignore
      }
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const NavLinks = (
    <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 font-public-sans text-sm font-medium">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-r-lg border-l-4 transition-all duration-150 active:scale-[0.98] ${
              isActive
                ? "border-primary bg-primary-container text-on-primary-container font-semibold"
                : "border-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
            }`}
          >
            <span className={`material-symbols-outlined text-[24px] ${isActive ? "icon-fill" : ""}`}>
              {item.icon}
            </span>
            <span className="text-[15px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const roleLabel = userRole === "staf" ? "Staf" : userRole === "pimpinan" ? "Pimpinan" : "Admin";

  const RoleBadge = (
    <div className="px-6 py-4 border-t border-outline-variant">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">shield_person</span>
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          {roleLabel}
        </span>
      </div>
    </div>
  );

  const BrandLogo = (
    <div className="px-6 py-6 border-b border-outline-variant flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined icon-fill">account_balance</span>
      </div>
      <div>
        <h1 className="text-xl font-bold text-primary font-public-sans">SIPAS</h1>
        <p className="text-xs text-on-surface-variant font-public-sans font-medium">
          Sistem Informasi Persuratan
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Hamburger Button ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest border border-outline-variant text-on-surface shadow-md hover:bg-surface-container-low transition-colors"
        aria-label="Buka menu navigasi"
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>

      {/* ── Mobile Overlay ── */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar Panel ── */}
      <aside
        className={`fixed left-0 top-0 h-full z-50 flex flex-col bg-surface-container-lowest border-r border-outline-variant shadow-xl
          transition-transform duration-300 ease-in-out
          w-[280px] sm:w-[300px]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:z-40 md:shadow-none`}
      >
        {/* Header: Brand + Close Button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            {/* Lambang Kabupaten Karawang */}
            <div className="w-9 h-9 shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/9d/LAMBANG_KABUPATEN_KARAWANG.svg"
                alt="Logo Karawang"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary font-public-sans leading-tight">SIPAS</h1>
              <p className="text-[10px] text-on-surface-variant font-public-sans font-medium leading-tight">
                Sistem Informasi Persuratan
              </p>
            </div>
          </div>
          {/* Close button — hanya tampil di mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Tutup menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {NavLinks}
        {RoleBadge}
      </aside>
    </>
  );
}
