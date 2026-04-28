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
  { bg: string; text: string; icon: string; label: string }
> = {
  // Surat Masuk
  belum_dibaca: {
    bg: "bg-error-container",
    text: "text-on-error-container",
    icon: "mark_email_unread",
    label: "Belum Dibaca",
  },
  diproses: {
    bg: "bg-secondary-container",
    text: "text-on-secondary-container",
    icon: "pending",
    label: "Diproses",
  },
  selesai: {
    bg: "bg-surface-container-high",
    text: "text-on-surface-variant",
    icon: "check_circle",
    label: "Selesai",
  },

  // Surat Keluar
  draft: {
    bg: "bg-surface-variant",
    text: "text-on-surface-variant",
    icon: "edit_document",
    label: "Draft",
  },
  diajukan: {
    bg: "bg-secondary-container",
    text: "text-on-secondary-container",
    icon: "pending_actions",
    label: "Diajukan",
  },
  disetujui: {
    bg: "bg-primary-container",
    text: "text-on-primary-container",
    icon: "check_circle",
    label: "Disetujui",
  },
  ditolak: {
    bg: "bg-error-container",
    text: "text-on-error-container",
    icon: "cancel",
    label: "Ditolak",
  },

  // User
  aktif: {
    bg: "bg-tertiary-fixed",
    text: "text-on-tertiary-fixed-variant",
    icon: "check",
    label: "Aktif",
  },
  nonaktif: {
    bg: "bg-surface-variant",
    text: "text-on-surface-variant",
    icon: "block",
    label: "Non-aktif",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    bg: "bg-surface-variant",
    text: "text-on-surface-variant",
    icon: "help",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold tracking-wider ${config.bg} ${config.text}`}
    >
      <span className="material-symbols-outlined text-[14px]">
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}
