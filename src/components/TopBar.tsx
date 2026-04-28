"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

interface SearchResult {
  id: string;
  nomor_surat: string;
  perihal: string;
  tipe: "masuk" | "keluar";
}

export default function TopBar() {
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

  return (
    <header className="sticky top-0 right-0 z-30 flex justify-between items-center pl-14 md:pl-6 pr-6 py-3 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant shadow-sm">
      {/* Left: Search */}
      <div className="flex items-center gap-4 flex-1">
        <div ref={searchRef} className="relative w-80 hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchResults(true);
            }}
            placeholder="Cari surat masuk atau keluar..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl font-inter text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50">
              {searching ? (
                <div className="flex items-center gap-3 p-4">
                  <span className="material-symbols-outlined animate-spin text-primary text-[20px]">progress_activity</span>
                  <span className="text-sm text-on-surface-variant font-inter">Mencari...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined text-outline text-[32px] block mb-1">search_off</span>
                  <p className="text-sm text-on-surface-variant font-inter">
                    Tidak ditemukan hasil untuk &quot;{searchQuery}&quot;
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <div className="px-4 py-2 border-b border-outline-variant bg-surface-container-low">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-inter">
                      {searchResults.length} hasil ditemukan
                    </span>
                  </div>
                  {searchResults.map((result) => (
                    <Link
                      key={`${result.tipe}-${result.id}`}
                      href={result.tipe === "masuk" ? "/surat-masuk" : "/surat-keluar"}
                      onClick={() => setShowSearchResults(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant last:border-b-0"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        result.tipe === "masuk"
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-primary-container text-on-primary-container"
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {result.tipe === "masuk" ? "mail" : "send"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-inter text-sm font-medium text-on-surface truncate">
                          {result.nomor_surat}
                        </p>
                        <p className="font-inter text-xs text-on-surface-variant truncate">
                          {result.perihal}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        result.tipe === "masuk"
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-primary-container text-on-primary-container"
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

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-1.5">
        {/* Dark Mode Dropdown */}
        <div ref={themeRef} className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2.5 text-on-surface-variant hover:text-primary transition-all rounded-xl hover:bg-surface-container-low"
            title="Pilih Tema"
          >
            {mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark")) ? (
              <Moon size={22} strokeWidth={2} />
            ) : (
              <Sun size={22} strokeWidth={2} />
            )}
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
              <div className="py-1">
                <button
                  onClick={() => { setTheme("light"); setShowThemeMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-inter transition-colors hover:bg-surface-container-low ${theme === "light" ? "text-primary font-medium bg-primary-container/10" : "text-on-surface"}`}
                >
                  <Sun size={18} strokeWidth={2.5} />
                  Terang
                </button>
                <button
                  onClick={() => { setTheme("dark"); setShowThemeMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-inter transition-colors hover:bg-surface-container-low ${theme === "dark" ? "text-primary font-medium bg-primary-container/10" : "text-on-surface"}`}
                >
                  <Moon size={18} strokeWidth={2.5} />
                  Gelap
                </button>
                <button
                  onClick={() => { setTheme("system"); setShowThemeMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-inter transition-colors hover:bg-surface-container-low ${theme === "system" ? "text-primary font-medium bg-primary-container/10" : "text-on-surface"}`}
                >
                  <Monitor size={18} strokeWidth={2.5} />
                  Sistem
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 text-on-surface-variant hover:text-primary transition-all rounded-xl hover:bg-surface-container-low relative"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error text-[10px] font-bold text-on-error px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
              <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                <h3 className="font-public-sans font-semibold text-sm text-on-surface">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary font-inter font-medium hover:underline"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <span className="material-symbols-outlined text-outline text-[40px] block mb-2">notifications_off</span>
                    <p className="text-sm text-on-surface-variant font-inter">Belum ada notifikasi</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const parts = notif.message?.split('|||') || [notif.message];
                    const mainMessage = parts[0];
                    const reason = parts[1];
                    const isExpanded = expandedNotifId === notif.id;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif, !!reason, isExpanded)}
                        className={`flex items-start gap-3 px-4 py-3.5 border-b border-outline-variant last:border-b-0 transition-colors ${
                          notif.is_read ? "bg-transparent" : "bg-primary-container/10"
                        } ${reason ? "cursor-pointer hover:bg-surface-container-low" : "cursor-pointer"}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          notif.is_read ? "bg-surface-container-high text-on-surface-variant" : "bg-primary-container text-on-primary-container"
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {notif.title?.includes("Approval") ? "approval" : notif.title?.includes("Ditolak") || notif.title?.includes("DITOLAK") ? "cancel" : "notifications"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-sm font-semibold text-on-surface leading-tight">{notif.title}</p>
                          <p className="font-inter text-xs text-on-surface-variant mt-0.5 leading-relaxed">{mainMessage}</p>
                          
                          {reason && isExpanded && (
                            <div className="mt-2 p-2.5 bg-surface-container rounded-lg border border-outline-variant/50 animate-modal-in">
                              <p className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Catatan / Alasan</p>
                              <p className="font-inter text-xs text-on-surface italic">{reason}</p>
                            </div>
                          )}
                          {reason && !isExpanded && (
                            <p className="font-inter text-[10px] text-primary mt-1 flex items-center gap-1 font-medium">
                              <span className="material-symbols-outlined text-[12px]">visibility</span>
                              Klik untuk lihat alasan
                            </p>
                          )}

                          <p className="font-inter text-[10px] text-outline mt-1.5">{formatTimeAgo(notif.created_at)}</p>
                        </div>
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-7 w-px bg-outline-variant mx-1.5" />

        {/* Profile Menu */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-surface-container-low transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-sm uppercase overflow-hidden">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userProfile?.full_name ? userProfile.full_name.charAt(0) : "U"
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="font-inter text-sm font-semibold text-on-surface leading-tight truncate max-w-[120px]">
                {userProfile?.full_name || "User"}
              </p>
              <p className="font-inter text-[11px] text-on-surface-variant capitalize">
                {userProfile?.role || "staf"}
              </p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] hidden lg:block">
              expand_more
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
              <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low">
                <p className="font-inter text-sm font-semibold text-on-surface truncate">{userProfile?.full_name}</p>
                <p className="font-inter text-xs text-on-surface-variant truncate">{userProfile?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-inter text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">settings</span>
                  Pengaturan Profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-inter text-error hover:bg-error-container/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
