"use client";

interface AiQuickActionsProps {
  onSelect: (prompt: string) => void;
}

export function AiQuickActions({ onSelect }: AiQuickActionsProps) {
  const actions = [
    { icon: "edit_document", label: "Buat Surat", prompt: "Buatkan draf surat keluar untuk ..." },
    { icon: "summarize", label: "Ringkas Surat", prompt: "Tolong ringkaskan surat masuk tentang ..." },
    { icon: "search", label: "Cari Surat", prompt: "Carikan saya surat mengenai ..." },
    { icon: "analytics", label: "Statistik", prompt: "Berapa banyak surat yang masuk dan keluar bulan ini?" },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onSelect(action.prompt)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-full text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[14px] text-brand-500">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
