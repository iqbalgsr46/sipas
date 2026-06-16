"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { SparklesText } from "@/components/ui/sparkles-text";
import RealtimeChart from "@/components/RealtimeChart";

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
        <span className="material-symbols-outlined animate-spin text-brand-500 text-[40px]">
          progress_activity
        </span>
        <p className="text-sm text-gray-500 dark:text-gray-400">Memuat dashboard...</p>
      </div>
    );
  }


  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Hero Greeting */}
      <div className="col-span-12">
        <section className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[24px] p-8 shadow-sm overflow-hidden">
          {/* Subtle lively background orbs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -right-10 -top-20 w-[400px] h-[400px] bg-brand-400/10 dark:bg-brand-500/10 rounded-full blur-3xl" />
            <div className="absolute right-1/3 -bottom-32 w-[300px] h-[300px] bg-indigo-400/10 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-brand-500 text-[28px] origin-bottom-right hover:animate-wave">
                  waving_hand
                </span>
                <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 text-xs font-bold uppercase tracking-widest border border-brand-100 dark:border-brand-500/20">
                  {userRole}
                </span>
              </div>
              <div>
                <SparklesText 
                  className="text-3xl md:text-[38px] font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight inline-block"
                  colors={{ first: "#465FFF", second: "#8b5cf6" }}
                >
                  {getGreeting()},{" "}
                  <span className="text-brand-600 dark:text-brand-400">
                    {userName.split(" ")[0]}
                  </span>
                </SparklesText>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-2 md:gap-3 mt-4">
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium">
                  Berikut ringkasan operasional harian Anda.
                </p>
                {stats.pendingApproval > 0 && (
                  <span className="inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400 text-sm font-bold whitespace-nowrap border border-error-200 dark:border-error-500/20">
                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                    {stats.pendingApproval} item menunggu tindakan
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-3 mt-4 md:mt-0">
              <Link
                href="/surat-masuk"
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-theme-sm hover:shadow-theme-md hover:bg-brand-700 transition-all dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Surat Baru
              </Link>
              {(userRole === "admin" || userRole === "pimpinan") && stats.pendingApproval > 0 && (
                <Link
                  href="/approval"
                  className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm dark:bg-gray-800 dark:text-slate-200 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  Review
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Realtime Chart + Quick Summary */}
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Realtime Chart — spans 2 of 3 cols */}
        <div className="lg:col-span-2">
          <RealtimeChart />
        </div>

        {/* Quick Summary Card */}
        <div className="lg:col-span-1 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 md:p-6 flex flex-col gap-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Ringkasan Surat</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-blue-600 dark:text-blue-400">mail</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Surat Masuk</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-white/90">{stats.totalMasuk}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-orange-600 dark:text-orange-400">send</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Surat Keluar</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-white/90">{stats.totalKeluar}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-brand-600 dark:text-brand-400">pending_actions</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</span>
              </div>
              <span className={`text-lg font-bold ${ stats.pendingApproval > 0 ? "text-error-500" : "text-gray-800 dark:text-white/90" }`}>{stats.pendingApproval}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-green-600 dark:text-green-400">group</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Pengguna</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-white/90">{stats.totalUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="col-span-12">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Aktivitas Terkini
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">5 dokumen terakhir yang diproses</p>
            </div>
          </div>
          
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-gray-100 dark:border-gray-800 border-y">
                  <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    No. Surat
                  </th>
                  <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Tipe
                  </th>
                  <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Perihal
                  </th>
                  <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Tanggal
                  </th>
                  <th className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <span className="material-symbols-outlined text-[24px] text-gray-400">inbox</span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada aktivitas terkini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 text-gray-800 text-theme-sm dark:text-white/90 font-medium">
                        {item.nomor_surat}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.tipe === "masuk" 
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
                              : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                          }`}>
                            <span className="material-symbols-outlined text-[16px]">
                              {item.tipe === "masuk" ? "mark_email_unread" : "send"}
                            </span>
                          </div>
                          <span className="text-gray-600 dark:text-gray-400 text-theme-xs font-semibold uppercase tracking-wider">
                            {item.tipe === "masuk" ? "Masuk" : "Keluar"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 max-w-[250px] truncate">
                        {item.perihal}
                      </td>
                      <td className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        {new Date(item.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
