/**
 * StatusBadge Component
 * =====================
 * Komponen reusable untuk menampilkan status surat
 * dengan gaya minimalis (tanpa border, tanpa ikon).
 */

interface StatusBadgeProps {
  status: string;
}

// Konfigurasi warna untuk setiap status
const statusConfig: Record<string, { bg: string; label: string }> = {
  // Surat Masuk
  belum_dibaca: {
    bg: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    label: "Belum Dibaca",
  },
  diproses: {
    bg: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    label: "Diproses",
  },
  selesai: {
    bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    label: "Selesai",
  },

  // Surat Keluar
  draft: {
    bg: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    label: "Draft",
  },
  diajukan: {
    bg: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    label: "Diajukan",
  },
  disetujui: {
    bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    label: "Disetujui",
  },
  ditolak: {
    bg: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    label: "Ditolak",
  },

  // User
  aktif: {
    bg: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
    label: "Aktif",
  },
  nonaktif: {
    bg: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
    label: "Non-aktif",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    bg: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    label: status,
  };

  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg}`}
    >
      {config.label}
    </span>
  );
}
