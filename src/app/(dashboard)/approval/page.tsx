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
        <span className="material-symbols-outlined text-error text-[80px]">gpp_bad</span>
        <h2 className="text-2xl font-bold font-public-sans text-on-surface">Akses Ditolak</h2>
        <p className="text-on-surface-variant text-center max-w-md">
          Halaman ini hanya dapat diakses oleh Pimpinan atau Administrator.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-on-surface">Tinjauan Dokumen</h2>
          <p className="font-inter text-sm text-on-surface-variant mt-1">Surat keluar yang membutuhkan persetujuan Anda.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-lg border border-outline-variant">
          <span className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Menunggu:</span>
          <span className="font-inter text-lg font-bold text-primary">{pendingList.length}</span>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px] lg:min-h-[600px]">

        {/* List Panel */}
        <div className={`lg:col-span-4 flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden ${showDetail ? "hidden lg:flex" : "flex"}`}>
          <div className="px-4 py-3.5 border-b border-outline-variant bg-surface-container">
            <h3 className="font-inter text-sm font-bold text-on-surface uppercase tracking-wider">Antrean Approval</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-[40px] text-outline mb-2">check_circle</span>
                <p className="font-inter text-sm">Semua dokumen sudah ditinjau!</p>
              </div>
            ) : pendingList.map((surat) => (
              <div
                key={surat.id}
                onClick={() => { setSelectedSurat(surat); setShowPdfPreview(false); setShowDetail(true); }}
                className={`p-4 rounded-xl cursor-pointer relative transition-all ${
                  selectedSurat?.id === surat.id
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-surface hover:bg-surface-container border border-transparent hover:border-outline-variant"
                }`}
              >
                {selectedSurat?.id === surat.id && <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r" />}
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-tertiary-container text-on-tertiary-container font-inter text-[10px] font-bold tracking-wider px-2 py-0.5 rounded">DIAJUKAN</span>
                  <span className="font-inter text-xs text-on-surface-variant">
                    {new Date(surat.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <h4 className="font-inter text-sm font-semibold text-on-surface line-clamp-2 mb-1">{surat.perihal}</h4>
                <p className="font-inter text-xs text-on-surface-variant line-clamp-1">Tujuan: {surat.tujuan}</p>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">No: {surat.nomor_surat}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className={`lg:col-span-8 flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden ${showDetail ? "flex" : "hidden lg:flex"}`}>
          {selectedSurat ? (
            <>
              {/* Mobile back */}
              <button
                onClick={() => setShowDetail(false)}
                className="lg:hidden flex items-center gap-1 text-primary font-inter text-sm font-semibold px-4 pt-4"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Kembali ke daftar
              </button>

              {/* Detail header */}
              <div className="p-4 sm:p-6 border-b border-outline-variant">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-[20px]">description</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-public-sans text-lg sm:text-xl font-semibold text-on-surface leading-snug">{selectedSurat.perihal}</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-on-surface-variant font-inter text-xs sm:text-sm mt-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                        {new Date(selectedSurat.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">tag</span>
                        {selectedSurat.nomor_surat}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-4 rounded-lg bg-surface-container border border-outline-variant/50">
                  <div>
                    <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Nomor Surat</span>
                    <span className="font-inter text-sm font-medium text-on-surface">{selectedSurat.nomor_surat}</span>
                  </div>
                  <div>
                    <span className="block font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Ditujukan Kepada</span>
                    <span className="font-inter text-sm font-medium text-on-surface">{selectedSurat.tujuan}</span>
                  </div>
                </div>
              </div>

              {/* Content + attachment */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-surface-container-low/50">
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 sm:p-5 shadow-sm">
                  <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Isi Surat</p>
                  {selectedSurat.konten ? (
                    <div className="font-inter text-sm text-on-surface space-y-2 leading-relaxed">
                      {selectedSurat.konten.split("\n").map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                  ) : (
                    <p className="font-inter text-sm text-on-surface-variant italic">Konten surat belum diisi.</p>
                  )}
                </div>

                {/* Attachment */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-outline-variant bg-surface-container flex items-center justify-between">
                    <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Lampiran</p>
                    {selectedSurat.file_url && (
                      <button onClick={() => setShowPdfPreview(v => !v)} className="font-inter text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">{showPdfPreview ? "visibility_off" : "visibility"}</span>
                        {showPdfPreview ? "Tutup" : "Pratinjau"}
                      </button>
                    )}
                  </div>
                  {selectedSurat.file_url ? (
                    <div className="p-3 sm:p-4 space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-outline-variant">
                        <div className="w-10 h-10 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-sm font-semibold text-on-surface truncate">{getFileName(selectedSurat.file_url) ?? "Lampiran PDF"}</p>
                          <p className="font-inter text-xs text-on-surface-variant">PDF Document</p>
                        </div>
                        <a href={selectedSurat.file_url} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 px-3 py-1.5 bg-primary text-on-primary rounded-lg font-inter text-xs font-semibold hover:opacity-90 transition flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>Buka
                        </a>
                      </div>
                      {showPdfPreview && (
                        <div className="rounded-xl overflow-hidden border border-outline-variant">
                          <iframe src={selectedSurat.file_url} className="w-full h-[360px] sm:h-[480px]" title="Preview PDF" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center text-on-surface-variant gap-2">
                      <span className="material-symbols-outlined text-[36px] opacity-40">description</span>
                      <p className="font-inter text-sm">Tidak ada file lampiran</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action bar */}
              <div className="p-4 sm:p-5 border-t border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 shrink-0">
                <button
                  onClick={() => { setRejectReason(""); setShowRejectModal(true); }}
                  disabled={actionLoading}
                  className="border border-error text-error hover:bg-error hover:text-on-error font-inter text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">block</span>Tolak
                </button>
                <button
                  onClick={() => { setApproveNote(""); setShowApproveModal(true); }}
                  disabled={actionLoading}
                  className="bg-primary text-on-primary hover:opacity-90 font-inter text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>Setujui
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-3">
              <span className="material-symbols-outlined text-[48px] text-outline">description</span>
              <p className="font-inter text-sm">Pilih dokumen untuk ditinjau</p>
            </div>
          )}
        </div>
      </div>

      {/* ── APPROVE MODAL (via Portal) ── */}
      <ModalPortal open={showApproveModal} onClose={() => setShowApproveModal(false)} locked={actionLoading}>
        {selectedSurat && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">task_alt</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-public-sans font-bold text-on-surface text-lg">Konfirmasi Persetujuan</h4>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="rounded-xl bg-surface-container border border-outline-variant/60 p-4">
                <p className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Ringkasan Dokumen</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 font-inter text-sm">
                  <span className="text-on-surface-variant whitespace-nowrap">Nomor</span>
                  <span className="font-semibold text-on-surface">{selectedSurat.nomor_surat}</span>
                  <span className="text-on-surface-variant whitespace-nowrap">Perihal</span>
                  <span className="font-medium text-on-surface leading-snug">{selectedSurat.perihal}</span>
                  <span className="text-on-surface-variant whitespace-nowrap">Tujuan</span>
                  <span className="font-medium text-on-surface">{selectedSurat.tujuan}</span>
                </div>
              </div>
              <div>
                <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Catatan <span className="font-normal normal-case tracking-normal opacity-60">(opsional)</span>
                </label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="Tambahkan catatan persetujuan..."
                  rows={3}
                  disabled={actionLoading}
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-inter text-sm bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none disabled:opacity-60"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex gap-3 shrink-0">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >Batal</button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#2e7d32] text-white rounded-xl font-inter text-sm font-semibold hover:bg-[#1b5e20] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {actionLoading
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Memproses…</>
                  : <><span className="material-symbols-outlined text-[18px]">task_alt</span>Ya, Setujui</>}
              </button>
            </div>
          </>
        )}
      </ModalPortal>

      {/* ── REJECT MODAL (via Portal) ── */}
      <ModalPortal open={showRejectModal} onClose={() => setShowRejectModal(false)} locked={actionLoading}>
        {selectedSurat && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant shrink-0">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">block</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-public-sans font-bold text-on-surface text-lg">Tolak Dokumen</h4>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="rounded-xl bg-surface-container border border-outline-variant/60 p-4">
                <p className="font-inter text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Ringkasan Dokumen</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 font-inter text-sm">
                  <span className="text-on-surface-variant whitespace-nowrap">Nomor</span>
                  <span className="font-semibold text-on-surface">{selectedSurat.nomor_surat}</span>
                  <span className="text-on-surface-variant whitespace-nowrap">Perihal</span>
                  <span className="font-medium text-on-surface leading-snug">{selectedSurat.perihal}</span>
                  <span className="text-on-surface-variant whitespace-nowrap">Tujuan</span>
                  <span className="font-medium text-on-surface">{selectedSurat.tujuan}</span>
                </div>
              </div>
              <div>
                <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Alasan Penolakan <span className="text-error normal-case tracking-normal">*wajib diisi</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan dokumen ini secara jelas..."
                  rows={4}
                  disabled={actionLoading}
                  autoFocus
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-inter text-sm bg-surface focus:ring-2 focus:ring-error focus:border-error outline-none transition-all resize-none disabled:opacity-60"
                />
                {!rejectReason.trim() && (
                  <p className="font-inter text-xs text-on-surface-variant mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    Alasan wajib diisi sebelum menolak dokumen
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant flex gap-3 shrink-0">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >Batal</button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 py-2.5 bg-error text-on-error rounded-xl font-inter text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {actionLoading
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Memproses…</>
                  : <><span className="material-symbols-outlined text-[18px]">block</span>Tolak Dokumen</>}
              </button>
            </div>
          </>
        )}
      </ModalPortal>
    </div>
  );
}
