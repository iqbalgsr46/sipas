"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const allNavItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard", roles: ["admin", "user", "pimpinan"] },
  { href: "/surat-masuk", icon: "mail", label: "Surat Masuk", roles: ["admin", "user", "pimpinan"] },
  { href: "/surat-keluar", icon: "send", label: "Surat Keluar", roles: ["admin", "user", "pimpinan"] },
  { href: "/approval", icon: "rule", label: "Approval", roles: ["admin", "pimpinan"] },
  { href: "/users", icon: "manage_accounts", label: "User Management", roles: ["admin"] },
  { href: "/roles", icon: "admin_panel_settings", label: "Wewenang (Roles)", roles: ["admin"] },
  { href: "/permissions", icon: "key", label: "Hak Akses", roles: ["admin"] },
  { href: "/settings", icon: "settings", label: "Pengaturan", roles: ["admin", "user", "pimpinan"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>("user");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const localUser = localStorage.getItem("sipas_user");
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        setUserRole(parsed.role || "user");
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
            <span className={`material-symbols-outlined text-[20px] ${isActive ? "icon-fill" : ""}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const RoleBadge = (
    <div className="px-6 py-4 border-t border-outline-variant">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">shield_person</span>
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          {userRole}
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
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface shadow-sm"
        aria-label="Buka menu navigasi"
      >
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>

      {/* ── Mobile Overlay ── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar Panel ── */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 flex flex-col w-[280px] border-r border-outline-variant bg-surface-container-lowest transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-4 right-4 p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          aria-label="Tutup menu"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {BrandLogo}
        {NavLinks}
        {RoleBadge}
      </aside>
    </>
  );
}
