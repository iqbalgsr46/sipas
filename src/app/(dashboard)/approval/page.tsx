"use client";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import ModalPortal from "@/components/Modal";
import type { SuratKeluar } from "@/types/database";

function getFileName(url: string | null | undefined) {
  if (!url) return null;
  try { return decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? ""); }
  catch { return url.split("/").pop() ?? "file.pdf"; }
}

export default function ApprovalPage() {
  const { showToast } = useToast();
  const [pendingList, setPendingList] = useState<SuratKeluar[]>([]);
  const [selectedSurat, setSelectedSurat] = useState<SuratKeluar | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    try {
      const localUser = localStorage.getItem("sipas_user");
      if (localUser) {
        const parsed = JSON.parse(localUser);
        if (parsed.role === "admin" || parsed.role === "pimpinan") {
          setIsAllowed(true);
          fetchPending();
        }
      }
    } catch {}
    setRoleChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPending() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("surat_keluar").select("*")
        .eq("status", "diajukan")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as SuratKeluar[];
      setPendingList(list);
      setSelectedSurat(list.length > 0 ? list[0] : null);
    } catch (err: any) {
      showToast("error", "Gagal Memuat Data", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedSurat) return;
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");

      const { data: updateData, error: updateError } = await supabase.from("surat_keluar")
        .update({
          status: "disetujui",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        } as any).eq("id", selectedSurat.id).select();
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) throw new Error("Akses ditolak (RLS). Pastikan Anda punya hak akses.");

      showToast("success", "Dokumen Disetujui", `Surat ${selectedSurat.nomor_surat} berhasil disetujui.`);
      setApproveNote("");
      setShowApproveModal(false);
      setShowPdfPreview(false);
      setShowDetail(false);
      fetchPending();
    } catch (err: any) {
      showToast("error", "Gagal Menyetujui", err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function submitReject() {
    if (!selectedSurat || !rejectReason.trim()) {
      showToast("warning", "Alasan Wajib Diisi", "Masukkan alasan penolakan.");
      return;
    }
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");

      const { data: updateData, error: updateError } = await supabase.from("surat_keluar")
        .update({
          status: "ditolak",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        } as any).eq("id", selectedSurat.id).select();
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) throw new Error("Akses ditolak (RLS). Pastikan Anda punya hak akses.");

      showToast("warning", "Dokumen Ditolak", `Surat ${selectedSurat.nomor_surat} telah ditolak.`);
      setRejectReason("");
      setShowRejectModal(false);
      setShowDetail(false);
      fetchPending();
    } catch (err: any) {
      showToast("error", "Gagal Menolak", err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (roleChecked && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <span className="material-symbols-outlined text-error-500 text-[80px]">gpp_bad</span>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Akses Ditolak</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Halaman ini hanya dapat diakses oleh Pimpinan atau Administrator.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-brand-500 text-[40px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Tinjauan Dokumen</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Surat keluar yang membutuhkan persetujuan Anda.</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Menunggu:</span>
          <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{pendingList.length}</span>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px] lg:min-h-[600px]">

        {/* List Panel */}
        <div className={`lg:col-span-4 flex flex-col bg-white dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden ${showDetail ? "hidden lg:flex" : "flex"}`}>
          <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="text-[14px] font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Antrean Approval</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-white dark:bg-gray-900">
            {pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 dark:text-gray-500">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-3">check_circle</span>
                <p className="text-sm font-medium">Semua dokumen sudah ditinjau!</p>
              </div>
            ) : pendingList.map((surat) => (
              <div
                key={surat.id}
                onClick={() => { setSelectedSurat(surat); setShowPdfPreview(false); setShowDetail(true); }}
                className={`p-5 rounded-[16px] cursor-pointer relative transition-all ${
                  selectedSurat?.id === surat.id
                    ? "bg-white border border-[#d6dffe] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:border-brand-500/30"
                    : "bg-white hover:bg-slate-50 border border-transparent hover:border-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                }`}
              >
                {selectedSurat?.id === surat.id && <div className="absolute -left-[1px] top-5 bottom-5 w-1.5 bg-[#3b82f6] rounded-r-md" />}
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-[#f1f5f9] text-[#475569] dark:bg-slate-800 dark:text-slate-300 text-[10px] font-extrabold tracking-widest px-3 py-1.5 rounded-md">DIAJUKAN</span>
                  <span className="text-[12px] font-bold text-[#94a3b8] dark:text-slate-500">
                    {new Date(surat.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <h4 className="text-[16px] font-extrabold text-[#1e293b] dark:text-white/90 line-clamp-2 mb-2 leading-snug">{surat.perihal}</h4>
                <p className="text-[13px] text-[#64748b] dark:text-gray-400 line-clamp-1 mb-1.5">Tujuan: {surat.tujuan}</p>
                <p className="text-[12px] text-[#94a3b8] dark:text-gray-500 font-bold">No: {surat.nomor_surat}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className={`lg:col-span-8 flex flex-col bg-white dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden ${showDetail ? "flex" : "hidden lg:flex"}`}>
          {selectedSurat ? (
            <>
              {/* Mobile back */}
              <button
                onClick={() => setShowDetail(false)}
                className="lg:hidden flex items-center gap-1.5 text-brand-500 text-sm font-semibold px-5 pt-5 pb-1 hover:text-brand-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Kembali ke daftar
              </button>

              {/* Detail header */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-10 h-10 shrink-0 rounded-[10px] bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] sm:text-[18px] font-extrabold text-slate-800 dark:text-white leading-snug">{selectedSurat.perihal}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-slate-500 dark:text-slate-400 text-[12px] mt-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {new Date(selectedSurat.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">tag</span>
                        {selectedSurat.nomor_surat}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 p-0 sm:p-0 bg-transparent border-0">
                  <div className="flex-1">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Nomor Surat</span>
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-white/90">{selectedSurat.nomor_surat}</span>
                  </div>
                  <div className="flex-1">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ditujukan Kepada</span>
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-white/90">{selectedSurat.tujuan}</span>
                  </div>
                </div>
              </div>

              {/* Content + attachment */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-white dark:bg-gray-900 custom-scrollbar">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                    <span className="material-symbols-outlined text-[16px] text-brand-500">article</span> Isi Surat
                  </h4>
                  {selectedSurat.konten ? (
                    <div className="text-[13px] text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed bg-slate-50/50 p-5 rounded-[12px] border border-gray-100">
                      {selectedSurat.konten.split("\n").map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-400 italic bg-slate-50/50 p-5 rounded-[12px] border border-gray-100">Konten surat belum diisi.</p>
                  )}
                </div>

                {/* Attachment */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-widest mb-3 flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-brand-500">attachment</span> Lampiran
                    </div>
                    {selectedSurat.file_url && (
                      <button onClick={() => setShowPdfPreview(v => !v)} className="text-[11px] text-brand-600 font-bold hover:text-brand-700 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-brand-50 dark:hover:bg-brand-500/10">
                        <span className="material-symbols-outlined text-[16px]">{showPdfPreview ? "visibility_off" : "visibility"}</span>
                        {showPdfPreview ? "Tutup Pratinjau" : "Buka Pratinjau"}
                      </button>
                    )}
                  </h4>
                  {selectedSurat.file_url ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800/50 rounded-[12px] border border-gray-200 dark:border-gray-800 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md">
                        <div className="w-10 h-10 rounded-[10px] bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100">
                          <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate mb-0.5">{getFileName(selectedSurat.file_url) ?? "Lampiran PDF"}</p>
                          <p className="text-[11px] text-slate-500 font-medium tracking-wide">PDF Document</p>
                        </div>
                        <a href={selectedSurat.file_url} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 px-4 py-2 bg-white border border-slate-200 text-slate-700 dark:bg-gray-800 dark:border-gray-700 dark:text-slate-300 rounded-[10px] text-[11px] font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm">
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>Buka di Tab Baru
                        </a>
                      </div>
                      {showPdfPreview && (
                        <div className="rounded-[12px] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-gray-100 dark:bg-gray-950">
                          <iframe src={selectedSurat.file_url} className="w-full h-[400px]" title="Preview PDF" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-gray-200 rounded-[12px] bg-slate-50/50">
                      <span className="material-symbols-outlined text-[32px] opacity-40">description</span>
                      <p className="text-[12px] font-medium">Tidak ada file lampiran</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action bar */}
              <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col sm:flex-row sm:justify-end gap-3 shrink-0">
                <button
                  onClick={() => { setRejectReason(""); setShowRejectModal(true); }}
                  disabled={actionLoading}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 dark:bg-gray-800 dark:border-gray-700 dark:text-slate-300 text-[12px] font-bold px-6 py-2.5 rounded-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">block</span>Tolak Surat
                </button>
                <button
                  onClick={() => { setApproveNote(""); setShowApproveModal(true); }}
                  disabled={actionLoading}
                  className="bg-brand-600 text-white hover:bg-brand-700 text-[12px] font-bold px-6 py-2.5 rounded-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-theme-sm hover:shadow-theme-md active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>Setujui Surat
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-4">
              <span className="material-symbols-outlined text-[64px] opacity-50">plagiarism</span>
              <p className="text-sm font-medium">Pilih dokumen di sebelah kiri untuk ditinjau</p>
            </div>
          )}
        </div>
      </div>

      {/* ── APPROVE MODAL (via Portal) ── */}
      <ModalPortal open={showApproveModal} onClose={() => setShowApproveModal(false)} locked={actionLoading}>
        {selectedSurat && (
          <>
            <div className="flex items-center gap-4 px-6 pt-7 pb-5 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-white/[0.02]">
              <div className="w-12 h-12 rounded-full bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500 flex items-center justify-center shrink-0 shadow-theme-xs">
                <span className="material-symbols-outlined text-[24px]">task_alt</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-800 dark:text-white/90 text-xl">Konfirmasi Persetujuan</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Tindakan ini tidak dapat dibatalkan</p>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 overflow-y-auto flex-1 min-h-0 bg-white dark:bg-gray-900 custom-scrollbar">
              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-5 shadow-theme-xs">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Ringkasan Dokumen</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Nomor</span>
                  <span className="font-bold text-gray-800 dark:text-white/90">{selectedSurat.nomor_surat}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Perihal</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90 leading-snug">{selectedSurat.perihal}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Tujuan</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">{selectedSurat.tujuan}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Catatan <span className="text-gray-400 font-normal ml-1 normal-case tracking-normal">(opsional)</span>
                </label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="Tambahkan catatan persetujuan..."
                  rows={3}
                  disabled={actionLoading}
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-white/90 text-sm bg-white dark:bg-gray-900 focus:ring-[3px] focus:ring-success-500/20 focus:border-success-500 dark:focus:border-success-500 outline-none transition-all resize-none disabled:opacity-60 placeholder:text-gray-400 shadow-theme-xs"
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 flex gap-3 shrink-0 bg-gray-50 dark:bg-white/[0.02]">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-900 shadow-theme-xs"
              >Batal</button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-3 bg-success-500 text-white rounded-xl font-bold text-sm hover:bg-success-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] shadow-theme-md shadow-success-500/20"
              >
                {actionLoading
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Memproses…</>
                  : <><span className="material-symbols-outlined text-[20px]">task_alt</span>Ya, Setujui Dokumen</>}
              </button>
            </div>
          </>
        )}
      </ModalPortal>

      {/* ── REJECT MODAL (via Portal) ── */}
      <ModalPortal open={showRejectModal} onClose={() => setShowRejectModal(false)} locked={actionLoading}>
        {selectedSurat && (
          <>
            <div className="flex items-center gap-4 px-6 pt-7 pb-5 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-white/[0.02]">
              <div className="w-12 h-12 rounded-full bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-500 flex items-center justify-center shrink-0 shadow-theme-xs">
                <span className="material-symbols-outlined text-[24px]">block</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-800 dark:text-white/90 text-xl">Tolak Dokumen</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Tindakan ini tidak dapat dibatalkan</p>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 overflow-y-auto flex-1 min-h-0 bg-white dark:bg-gray-900 custom-scrollbar">
              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-5 shadow-theme-xs">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Ringkasan Dokumen</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Nomor</span>
                  <span className="font-bold text-gray-800 dark:text-white/90">{selectedSurat.nomor_surat}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Perihal</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90 leading-snug">{selectedSurat.perihal}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Tujuan</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">{selectedSurat.tujuan}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Alasan Penolakan <span className="text-error-500 ml-1 tracking-normal normal-case">*wajib diisi</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan dokumen ini secara jelas..."
                  rows={4}
                  disabled={actionLoading}
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-white/90 text-sm bg-white dark:bg-gray-900 focus:ring-[3px] focus:ring-error-500/20 focus:border-error-500 dark:focus:border-error-500 outline-none transition-all resize-none disabled:opacity-60 placeholder:text-gray-400 shadow-theme-xs"
                />
                {!rejectReason.trim() && (
                  <p className="text-[11px] font-medium text-error-500 dark:text-error-400 mt-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Alasan wajib diisi sebelum menolak dokumen
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 flex gap-3 shrink-0 bg-gray-50 dark:bg-white/[0.02]">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-900 shadow-theme-xs"
              >Batal</button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 py-3 bg-error-500 text-white rounded-xl font-bold text-sm hover:bg-error-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-theme-md shadow-error-500/20"
              >
                {actionLoading
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Memproses…</>
                  : <><span className="material-symbols-outlined text-[20px]">block</span>Tolak Dokumen</>}
              </button>
            </div>
          </>
        )}
      </ModalPortal>
    </div>
  );
}
