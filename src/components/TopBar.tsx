"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";

interface SearchResult {
  id: string;
  nomor_surat: string;
  perihal: string;
  tipe: "masuk" | "keluar";
}

export default function TopBar() {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const router = useRouter();
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);

    // Load User Profile & Notifications
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let userId = user?.id;
        
        if (!userId) {
          try {
            const local = JSON.parse(localStorage.getItem("sipas_user") || "{}");
            userId = local.id;
          } catch {}
        }

        if (userId) {
          const { data: profile } = await supabase
            .from("users")
            .select("full_name, email, role, avatar_url")
            .eq("id", userId)
            .single();
          if (profile) setUserProfile(profile);

          // Notifications: gracefully handle if table doesn't exist
          try {
            const { data: notifs } = await supabase
              .from("notifications")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(10);
            if (notifs) setNotifications(notifs);

            // Subscribe to real-time notifications
            const channel = supabase.channel('realtime_notifs')
              .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                  setNotifications((prev) => [payload.new, ...prev]);
                }
              )
              .subscribe();

            return () => {
              supabase.removeChannel(channel);
            };
          } catch {
            // notifications table may not exist yet — ignore
          }
        }
      } catch {
        // silently fail — user will see empty state
      }
    };
    const cleanup = loadUserData();
    
    const handleProfileUpdate = () => { loadUserData(); };
    window.addEventListener("profileUpdate", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdate", handleProfileUpdate);
      cleanup.then(fn => { if (typeof fn === 'function') fn(); });
    };
  }, []);

  // Real-time search with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    setShowSearchResults(true);

    searchTimeout.current = setTimeout(async () => {
      const keyword = `%${value.trim()}%`;

      const [masukRes, keluarRes] = await Promise.all([
        supabase
          .from("surat_masuk")
          .select("id, nomor_surat, perihal")
          .or(`nomor_surat.ilike.${keyword},perihal.ilike.${keyword},pengirim.ilike.${keyword}`)
          .limit(5),
        supabase
          .from("surat_keluar")
          .select("id, nomor_surat, perihal")
          .or(`nomor_surat.ilike.${keyword},perihal.ilike.${keyword},tujuan.ilike.${keyword}`)
          .limit(5),
      ]);

      const results: SearchResult[] = [
        ...(masukRes.data || []).map((s: any) => ({ ...s, tipe: "masuk" as const })),
        ...(keluarRes.data || []).map((s: any) => ({ ...s, tipe: "keluar" as const })),
      ];

      setSearchResults(results);
      setSearching(false);
    }, 400);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("sipas_user");
    window.location.href = "/login";
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notif: any, hasReason: boolean, isExpanded: boolean) => {
    if (hasReason) {
      setExpandedNotifId(isExpanded ? null : notif.id);
    }
    
    if (!notif.is_read) {
      // Mark as read in DB
      await supabase
        .from("notifications")
        .update({ is_read: true } as any)
        .eq("id", notif.id);
        
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-[99] dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-[99] dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z" fill="currentColor"/>
              </svg>
            )}
          </button>

          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/9d/LAMBANG_KABUPATEN_KARAWANG.svg"
                alt="Logo Karawang"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">SIPAS</h1>
          </Link>

          <div className="hidden lg:block relative" ref={searchRef}>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                  <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill=""/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchResults(true);
                  }}
                  placeholder="Cari surat masuk / keluar..."
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-[3px] focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                />
              </div>
            </form>
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-theme-lg overflow-hidden z-[99]">
                {searching ? (
                  <div className="flex items-center gap-3 p-4">
                    <span className="material-symbols-outlined animate-spin text-brand-500 text-[20px]">progress_activity</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Mencari...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center">
                    <span className="material-symbols-outlined text-gray-400 text-[32px] block mb-1">search_off</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ditemukan hasil untuk &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.03]">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {searchResults.length} hasil ditemukan
                      </span>
                    </div>
                    {searchResults.map((result) => (
                      <Link
                        key={`${result.tipe}-${result.id}`}
                        href={result.tipe === "masuk" ? "/surat-masuk" : "/surat-keluar"}
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          result.tipe === "masuk"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {result.tipe === "masuk" ? "mail" : "send"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                            {result.nomor_surat}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {result.perihal}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          result.tipe === "masuk"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}>
                          {result.tipe}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none">
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* Theme Toggler */}
            <div ref={themeRef} className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex items-center justify-center w-[42px] h-[42px] text-gray-500 bg-white border border-gray-200 rounded-full hover:text-brand-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                aria-label="Toggle Theme"
              >
                {mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark")) ? (
                  <Moon size={20} />
                ) : (
                  <Sun size={20} />
                )}
              </button>
              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-theme-lg overflow-hidden z-50">
                  <div className="py-1">
                    <button onClick={() => { setTheme("light"); setShowThemeMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${theme === "light" ? "text-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                      <Sun size={18} /> Terang
                    </button>
                    <button onClick={() => { setTheme("dark"); setShowThemeMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${theme === "dark" ? "text-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                      <Moon size={18} /> Gelap
                    </button>
                    <button onClick={() => { setTheme("system"); setShowThemeMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${theme === "system" ? "text-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                      <Monitor size={18} /> Sistem
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center w-[42px] h-[42px] text-gray-500 bg-white border border-gray-200 rounded-full hover:text-brand-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-white dark:border-gray-900"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute -right-16 mt-2 flex w-75 flex-col rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 sm:right-0 sm:w-80 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-800 dark:text-white/90">Notifikasi</h5>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-brand-500 hover:text-brand-600 dark:hover:text-brand-400">
                        Tandai dibaca
                      </button>
                    )}
                  </div>
                  <div className="flex h-72 flex-col overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center flex flex-col items-center">
                        <span className="material-symbols-outlined text-[32px] text-gray-300 dark:text-gray-600 mb-2">notifications_off</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada notifikasi.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const parts = notif.message?.split('|||') || [notif.message];
                        const mainMessage = parts[0];
                        const reason = parts[1];
                        const isExpanded = expandedNotifId === notif.id;

                        const notifStyle = (() => {
                          const t = notif.type || (
                            notif.title?.includes("Approval") ? "submission" :
                            notif.title?.includes("Ditolak") || notif.title?.includes("DITOLAK") ? "rejection" :
                            notif.title?.includes("Disetujui") || notif.title?.includes("DISETUJUI") ? "approval" : "info"
                          );
                          if (t === "submission") return { icon: "description", bg: "bg-blue-100 dark:bg-blue-900/40", color: "text-blue-600 dark:text-blue-400" };
                          if (t === "approval")   return { icon: "task_alt",    bg: "bg-success-100 dark:bg-success-900/40", color: "text-success-600 dark:text-success-400" };
                          if (t === "rejection")  return { icon: "cancel",      bg: "bg-error-100 dark:bg-error-900/40",   color: "text-error-600 dark:text-error-400" };
                          return { icon: "notifications", bg: "bg-gray-100 dark:bg-gray-800", color: "text-gray-500 dark:text-gray-400" };
                        })();

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif, !!reason, isExpanded)}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${
                              notif.is_read ? "bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]" : "bg-brand-50/50 dark:bg-brand-500/5 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                            } ${reason ? "cursor-pointer" : "cursor-pointer"}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${notif.is_read ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" : `${notifStyle.bg} ${notifStyle.color}`}`}>
                              <span className="material-symbols-outlined text-[16px]">{notif.is_read ? "notifications" : notifStyle.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notif.is_read ? "text-gray-600 dark:text-gray-400" : "font-medium text-gray-800 dark:text-white/90"} leading-tight`}>{notif.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{mainMessage}</p>
                              
                              {reason && isExpanded && (
                                <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Catatan / Alasan</p>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 italic">{reason}</p>
                                </div>
                              )}

                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">{formatTimeAgo(notif.created_at)}</p>
                            </div>
                            {!notif.is_read && (
                              <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-2" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3"
            >
              <span className="h-10 w-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold text-lg overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (userProfile?.full_name || "U").replace(/\s*\(.*?\)\s*/g, '').charAt(0)
                )}
              </span>
              <span className="hidden text-left lg:flex lg:items-center lg:gap-1.5">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {(userProfile?.full_name || "User").replace(/\s*\(.*?\)\s*/g, '')}
                </span>
                <span className="material-symbols-outlined text-[20px] text-gray-500">expand_more</span>
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-[240px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.03]">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{userProfile?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.email}</p>
                </div>
                <div className="p-3">
                  <div className="flex flex-col gap-1 pb-3 border-b border-gray-200 dark:border-gray-800">
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-[14px] hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    >
                      <svg
                        className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M10.4858 3.5L13.5182 3.5C13.9233 3.5 14.2518 3.82851 14.2518 4.23377C14.2518 5.9529 16.1129 7.02795 17.602 6.1682C17.9528 5.96567 18.4014 6.08586 18.6039 6.43667L20.1203 9.0631C20.3229 9.41407 20.2027 9.86286 19.8517 10.0655C18.3625 10.9253 18.3625 13.0747 19.8517 13.9345C20.2026 14.1372 20.3229 14.5859 20.1203 14.9369L18.6039 17.5634C18.4013 17.9142 17.9528 18.0344 17.602 17.8318C16.1129 16.9721 14.2518 18.0471 14.2518 19.7663C14.2518 20.1715 13.9233 20.5 13.5182 20.5H10.4858C10.0804 20.5 9.75182 20.1714 9.75182 19.766C9.75182 18.0461 7.88983 16.9717 6.40067 17.8314C6.04945 18.0342 5.60037 17.9139 5.39767 17.5628L3.88167 14.937C3.67903 14.586 3.79928 14.1372 4.15026 13.9346C5.63949 13.0748 5.63946 10.9253 4.15025 10.0655C3.79926 9.86282 3.67901 9.41401 3.88165 9.06303L5.39764 6.43725C5.60034 6.08617 6.04943 5.96581 6.40065 6.16858C7.88982 7.02836 9.75182 5.9539 9.75182 4.23399C9.75182 3.82862 10.0804 3.5 10.4858 3.5ZM13.5182 2L10.4858 2C9.25201 2 8.25182 3.00019 8.25182 4.23399C8.25182 4.79884 7.64013 5.15215 7.15065 4.86955C6.08213 4.25263 4.71559 4.61859 4.0986 5.68725L2.58261 8.31303C1.96575 9.38146 2.33183 10.7477 3.40025 11.3645C3.88948 11.647 3.88947 12.3531 3.40026 12.6355C2.33184 13.2524 1.96578 14.6186 2.58263 15.687L4.09863 18.3128C4.71562 19.3814 6.08215 19.7474 7.15067 19.1305C7.64015 18.8479 8.25182 19.2012 8.25182 19.766C8.25182 20.9998 9.25201 22 10.4858 22H13.5182C14.7519 22 15.7518 20.9998 15.7518 19.7663C15.7518 19.2015 16.3632 18.8487 16.852 19.1309C17.9202 19.7476 19.2862 19.3816 19.9029 18.3134L21.4193 15.6869C22.0361 14.6185 21.6701 13.2523 20.6017 12.6355C20.1125 12.3531 20.1125 11.647 20.6017 11.3645C21.6701 10.7477 22.0362 9.38152 21.4193 8.3131L19.903 5.68667C19.2862 4.61842 17.9202 4.25241 16.852 4.86917C16.3632 5.15138 15.7518 4.79856 15.7518 4.23377C15.7518 3.00024 14.7519 2 13.5182 2ZM9.6659 11.9999C9.6659 10.7103 10.7113 9.66493 12.0009 9.66493C13.2905 9.66493 14.3359 10.7103 14.3359 11.9999C14.3359 13.2895 13.2905 14.3349 12.0009 14.3349C10.7113 14.3349 9.6659 13.2895 9.6659 11.9999ZM12.0009 8.16493C9.88289 8.16493 8.1659 9.88191 8.1659 11.9999C8.1659 14.1179 9.88289 15.8349 12.0009 15.8349C14.1189 15.8349 15.8359 14.1179 15.8359 11.9999C15.8359 9.88191 14.1189 8.16493 12.0009 8.16493Z"
                        />
                      </svg>
                      Pengaturan Profil
                    </Link>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-[14px] hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                  >
                    <svg
                      className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z"
                      />
                    </svg>
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
