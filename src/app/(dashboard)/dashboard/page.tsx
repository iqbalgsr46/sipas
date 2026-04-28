"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface DashboardStats {
  totalMasuk: number;
  totalKeluar: number;
  pendingApproval: number;
  totalUsers: number;
}

interface RecentItem {
  id: string;
  nomor_surat: string;
  perihal: string;
  status: string;
  tanggal: string;
  tipe: "masuk" | "keluar";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMasuk: 0,
    totalKeluar: 0,
    pendingApproval: 0,
    totalUsers: 0,
  });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Pengguna");
  const [userRole, setUserRole] = useState("staf");

  useEffect(() => {
    const localUser = localStorage.getItem("sipas_user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      setUserName(parsed.full_name || "Pengguna");
      setUserRole(parsed.role || "staf");
    }
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [masukRes, keluarRes, pendingRes, usersRes] = await Promise.all([
        supabase.from("surat_masuk").select("*", { count: "exact", head: true }),
        supabase.from("surat_keluar").select("*", { count: "exact", head: true }),
        supabase.from("surat_keluar").select("*", { count: "exact", head: true }).eq("status", "diajukan"),
        supabase.from("users").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalMasuk: masukRes.count || 0,
        totalKeluar: keluarRes.count || 0,
        pendingApproval: pendingRes.count || 0,
        totalUsers: usersRes.count || 0,
      });

      const { data: recentMasuk } = await supabase
        .from("surat_masuk")
        .select("id, nomor_surat, perihal, status, tanggal_diterima")
        .order("created_at", { ascending: false })
        .limit(3) as { data: any[] | null };

      const { data: recentKeluar } = await supabase
        .from("surat_keluar")
        .select("id, nomor_surat, perihal, status, tanggal_surat")
        .order("created_at", { ascending: false })
        .limit(3) as { data: any[] | null };

      const combined: RecentItem[] = [
        ...(recentMasuk || []).map((s) => ({
          id: s.id, nomor_surat: s.nomor_surat, perihal: s.perihal,
          status: s.status, tanggal: s.tanggal_diterima, tipe: "masuk" as const,
        })),
        ...(recentKeluar || []).map((s) => ({
          id: s.id, nomor_surat: s.nomor_surat, perihal: s.perihal,
          status: s.status, tanggal: s.tanggal_surat, tipe: "keluar" as const,
        })),
      ]
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
        .slice(0, 5);

      setRecentItems(combined);
    } catch {
      // data fetch failed — stats remain at 0, recentItems stays empty
    } finally {
      setLoading(false);
    }
  }

  const getStatusStyle = (status: string) => {
    const map: Record<string, string> = {
      belum_dibaca: "bg-surface-variant text-on-surface-variant",
      diproses: "bg-secondary-container text-on-secondary-container",
      selesai: "bg-primary-container text-on-primary-container",
      draft: "bg-surface-container-high text-on-surface-variant",
      menunggu_approval: "bg-tertiary-container text-on-tertiary-container",
      diajukan: "bg-tertiary-container text-on-tertiary-container",
      disetujui: "bg-primary-container text-on-primary-container",
      ditolak: "bg-error-container text-on-error-container",
    };
    return map[status] || "bg-surface-variant text-on-surface-variant";
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      belum_dibaca: "Belum Dibaca",
      diproses: "Diproses",
      selesai: "Selesai",
      draft: "Draft",
      menunggu_approval: "Menunggu Approval",
      diajukan: "Diajukan",
      disetujui: "Disetujui",
      ditolak: "Ditolak",
    };
    return map[status] || status;
  };

  // Greeting berdasarkan waktu
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px]">
          progress_activity
        </span>
        <p className="font-inter text-sm text-on-surface-variant">Memuat dashboard...</p>
      </div>
    );
  }

  const statsCards = [
    {
      label: "Surat Masuk",
      value: stats.totalMasuk,
      icon: "mail", // icon amplop
      color: "bg-[#dcfce7]", // hijau pastel cerah
      iconColor: "text-[#10b981]", // hijau solid
      href: "/surat-masuk",
    },
    {
      label: "Surat Keluar",
      value: stats.totalKeluar,
      icon: "send", // icon pesawat kertas (kirim)
      color: "bg-[#e0f2fe]", // biru pastel cerah
      iconColor: "text-[#3b82f6]", // biru solid
      href: "/surat-keluar",
    },
    {
      label: "Menunggu Approval",
      value: stats.pendingApproval,
      icon: "pending_actions", // icon clipboard pending
      color: "bg-[#f3e8ff]", // ungu pastel cerah
      iconColor: "text-[#8b5cf6]", // ungu solid
      href: "/approval",
      highlight: stats.pendingApproval > 0,
    },
    {
      label: "Total Pengguna",
      value: stats.totalUsers,
      icon: "group", // icon users
      color: "bg-[#ffedd5]", // orange pastel cerah
      iconColor: "text-[#f97316]", // orange solid
      href: "/users",
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Greeting */}
      <section className="relative bg-gradient-to-br from-primary via-primary-container to-primary rounded-2xl p-8 shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute right-0 top-0 w-80 h-80 bg-surface-container-lowest rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-surface-container-lowest rounded-full blur-2xl translate-y-1/2" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-white/80 text-[28px]">
                waving_hand
              </span>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-widest font-inter">
                {userRole}
              </span>
            </div>
            <h1 className="font-public-sans text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              {getGreeting()},{" "}
              <span className="text-blue-200">
                {userName.split(" ")[0]}
              </span>
            </h1>
            <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-2 md:gap-3 mt-3 md:mt-2">
              <p className="font-inter text-sm md:text-base text-white/90 leading-relaxed md:leading-normal">
                Berikut ringkasan operasional harian Anda.
              </p>
              {stats.pendingApproval > 0 && (
                <span className="inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold whitespace-nowrap">
                  <span className="material-symbols-outlined text-[16px]">priority_high</span>
                  {stats.pendingApproval} item menunggu tindakan
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3 mt-4 md:mt-0">
            <Link
              href="/surat-masuk"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-inter text-sm font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Surat Baru
            </Link>
            {(userRole === "admin" || userRole === "pimpinan") && stats.pendingApproval > 0 && (
              <Link
                href="/approval"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-inter text-sm font-semibold rounded-xl hover:bg-white/30 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
                Review
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex items-center justify-between ${card.color} ${
              card.highlight ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-surface" : ""
            }`}
          >
            <div className="flex flex-col justify-center">
              <span className="font-public-sans text-[40px] leading-none font-extrabold tracking-tight text-slate-900 mb-2">
                {card.value}
              </span>
              <span className="font-inter text-sm font-medium text-slate-700">
                {card.label}
              </span>
            </div>
            <div className="flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span 
                className={`material-symbols-outlined icon-fill ${card.iconColor}`}
                style={{ fontSize: "45px", lineHeight: 1 }}
              >
                {card.icon}
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* Recent Activity */}
      <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center">
          <div>
            <h3 className="font-public-sans text-lg font-semibold text-on-surface">
              Aktivitas Terkini
            </h3>
            <p className="font-inter text-xs text-on-surface-variant mt-0.5">
              5 dokumen terakhir yang diproses
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="py-3 px-6 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  No. Surat
                </th>
                <th className="py-3 px-6 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Tipe
                </th>
                <th className="py-3 px-6 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Perihal
                </th>
                <th className="py-3 px-6 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Tanggal
                </th>
                <th className="py-3 px-6 font-inter text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="font-inter text-sm text-on-surface divide-y divide-outline-variant">
              {recentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center">
                    <span className="material-symbols-outlined text-[40px] text-outline block mb-2">inbox</span>
                    <p className="text-on-surface-variant">Belum ada data surat.</p>
                  </td>
                </tr>
              ) : (
                recentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="py-3.5 px-6 font-medium text-on-surface">{item.nomor_surat}</td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border border-black/5 dark:border-white/5 ${
                          item.tipe === "masuk" ? "bg-primary-container text-on-primary-container" : "bg-tertiary-container text-on-tertiary-container"
                        }`}>
                          <span className="material-symbols-outlined icon-fill text-[16px]">
                            {item.tipe === "masuk" ? "mark_email_unread" : "send"}
                          </span>
                        </div>
                        <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                          {item.tipe === "masuk" ? "Masuk" : "Keluar"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-on-surface-variant max-w-[250px] truncate">
                      {item.perihal}
                    </td>
                    <td className="py-3.5 px-6 text-on-surface-variant text-xs">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
