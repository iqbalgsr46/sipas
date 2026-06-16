"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  GridIcon,
  ListIcon,
  PageIcon,
  BoxCubeIcon,
  GroupIcon,
  PlugInIcon,
  UserCircleIcon
} from "@/icons";

const mainNavItems = [
  { href: "/dashboard", Icon: GridIcon, label: "Dashboard", roles: ["admin", "staf", "pimpinan"] },
  { href: "/surat-masuk", Icon: ListIcon, label: "Surat Masuk", roles: ["admin", "staf", "pimpinan"] },
  { href: "/surat-keluar", Icon: PageIcon, label: "Surat Keluar", roles: ["admin", "staf", "pimpinan"] },
  { href: "/approval", Icon: BoxCubeIcon, label: "Approval", roles: ["admin", "pimpinan"] },
];

const othersNavItems = [
  { href: "/users", Icon: UserCircleIcon, label: "Users", roles: ["admin"] },
  { href: "/settings", Icon: PlugInIcon, label: "Settings", roles: ["admin", "staf", "pimpinan"] },
];

export default function Sidebar({ isCollapsed = false }: { isCollapsed?: boolean }) {
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

  const filteredMainNav = mainNavItems.filter((item) => item.roles.includes(userRole));
  const filteredOthersNav = othersNavItems.filter((item) => item.roles.includes(userRole));

  const renderNavGroup = (items: typeof mainNavItems) => (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`menu-item group ${
                isActive ? "menu-item-active" : "menu-item-inactive"
              } ${isCollapsed ? "justify-center" : "justify-start"}`}
            >
              <span
                className={`${
                  isActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
                }`}
              >
                <item.Icon />
              </span>
              {!isCollapsed && <span className="menu-item-text">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const NavLinks = (
    <nav className="flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar mt-6 px-5">
      <div className="flex flex-col gap-4">
        <div>
          <h2
            className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            {isCollapsed ? "..." : "MENU"}
          </h2>
          {renderNavGroup(filteredMainNav)}
        </div>

        <div>
          <h2
            className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            {isCollapsed ? "..." : "OTHERS"}
          </h2>
          {renderNavGroup(filteredOthersNav)}
        </div>
      </div>
    </nav>
  );

  const roleLabel = userRole === "staf" ? "Staf" : userRole === "pimpinan" ? "Pimpinan" : "Admin";

  const RoleBadge = (
    <div className={`py-4 border-t border-outline-variant ${isCollapsed ? "px-2 flex justify-center" : "px-6"}`}>
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
        <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/20" title={isCollapsed ? roleLabel : undefined}>
          <span className="material-symbols-outlined icon-fill text-[18px]">shield_person</span>
        </div>
        {!isCollapsed && (
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest truncate">
            {roleLabel}
          </span>
        )}
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
        className={`fixed left-0 top-0 h-full z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:z-40 md:shadow-none
          ${isCollapsed ? "md:w-[90px] w-[290px]" : "w-[290px]"}
        `}
      >
        {/* Header: Brand + Close Button */}
        <div className={`py-8 flex ${isCollapsed ? "justify-center px-0" : "justify-start px-5"} shrink-0`}>
          <div className="flex items-center gap-3">
            {/* Lambang Kabupaten Karawang */}
            <div className="w-9 h-9 shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/9d/LAMBANG_KABUPATEN_KARAWANG.svg"
                alt="Logo Karawang"
                className="w-full h-full object-contain"
                loading="lazy"
                title={isCollapsed ? "SIPAS Karawang" : undefined}
              />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-base font-bold text-primary font-public-sans leading-tight truncate">SIPAS</h1>
                <p className="text-[10px] text-on-surface-variant font-public-sans font-medium leading-tight truncate">
                  Sistem Informasi Persuratan
                </p>
              </div>
            )}
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
        <div className="mt-auto px-5 pb-6">
        </div>
      </aside>
    </>
  );
}
