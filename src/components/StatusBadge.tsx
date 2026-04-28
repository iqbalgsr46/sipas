/**
 * StatusBadge Component
 * =====================
 * Komponen reusable untuk menampilkan status surat
 * dengan warna dan ikon yang sesuai.
 */

interface StatusBadgeProps {
  status: string;
}

// Konfigurasi warna untuk setiap status
const statusConfig: Record<
  string,
  { bg: string; icon: string; label: string }
> = {
  // Surat Masuk
  belum_dibaca: {
    bg: "bg-rose-50 text-rose-600 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    icon: "mark_email_unread",
    label: "Belum Dibaca",
  },
  diproses: {
    bg: "bg-blue-50 text-blue-600 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    icon: "pending",
    label: "Diproses",
  },
  selesai: {
    bg: "bg-emerald-50 text-emerald-600 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    icon: "check_circle",
    label: "Selesai",
  },

  // Surat Keluar
  draft: {
    bg: "bg-slate-100 text-slate-600 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
    icon: "edit_document",
    label: "Draft",
  },
  diajukan: {
    bg: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    icon: "pending_actions",
    label: "Diajukan",
  },
  disetujui: {
    bg: "bg-emerald-50 text-emerald-600 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    icon: "check_circle",
    label: "Disetujui",
  },
  ditolak: {
    bg: "bg-rose-50 text-rose-600 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    icon: "cancel",
    label: "Ditolak",
  },

  // User
  aktif: {
    bg: "bg-emerald-50 text-emerald-600 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    icon: "check",
    label: "Aktif",
  },
  nonaktif: {
    bg: "bg-slate-100 text-slate-600 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
    icon: "block",
    label: "Non-aktif",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    bg: "bg-slate-100 text-slate-600 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
    icon: "help",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest ring-1 ring-inset ${config.bg} shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]`}
    >
      <span className="material-symbols-outlined icon-fill text-[15px]">
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}
