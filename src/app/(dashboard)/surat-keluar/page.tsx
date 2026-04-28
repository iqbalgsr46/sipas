"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import FileUpload from "@/components/FileUpload";
import type { SuratKeluar } from "@/types/database";

const EMPTY_FORM = {
  nomor_surat: "",
  tujuan: "",
  perihal: "",
  tanggal_surat: new Date().toISOString().split("T")[0],
  konten: "",
  file_url: null as string | null,
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 border border-outline-variant rounded-lg text-on-surface font-inter text-sm bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline/60";

export default function SuratKeluarPage() {
  const { showToast } = useToast();

  const [suratList, setSuratList] = useState<SuratKeluar[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [userRole, setUserRole] = useState("staf");

  const [modal, setModal] = useState<"create" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<SuratKeluar | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadKey, setUploadKey] = useState(0);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  /* ── fetch ───────────────────────────────────── */
  async function fetchData() {
    setLoading(true);
    let query = supabase
      .from("surat_keluar")
      .select("*")
      .order("created_at", { ascending: false });
    if (filterStatus) query = query.eq("status", filterStatus);

    const { data, error } = (await query) as {
      data: SuratKeluar[] | null;
      error: any;
    };
    if (error) showToast("error", "Gagal Memuat Data", error.message);
    else setSuratList(data ?? []);
    setLoading(false);
  }

  useEffect(() => { 
    fetchData(); 
    const localUser = localStorage.getItem("sipas_user");
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        setUserRole(parsed.role?.toLowerCase() || "staf");
      } catch {}
    }
  }, [filterStatus]);

  /* ── open helpers ────────────────────────────── */
  function openCreate() {
    setForm(EMPTY_FORM);
    setUploadKey((k) => k + 1);
    setSelected(null);
    setModal("create");
  }

  function openEdit(s: SuratKeluar) {
    setForm({
      nomor_surat: s.nomor_surat,
      tujuan: s.tujuan,
      perihal: s.perihal,
      tanggal_surat: s.tanggal_surat,
      konten: s.konten ?? "",
      file_url: s.file_url,
    });
    setUploadKey((k) => k + 1);
    setSelected(s);
    setModal("edit");
  }

  function openView(s: SuratKeluar) {
    setSelected(s);
    setModal("view");
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
  }

  /* ── validate ────────────────────────────────── */
  function validate() {
    if (!form.nomor_surat.trim()) { showToast("warning", "Validasi", "Nomor surat wajib diisi."); return false; }
    if (!form.tujuan.trim()) { showToast("warning", "Validasi", "Tujuan wajib diisi."); return false; }
    if (!form.perihal.trim()) { showToast("warning", "Validasi", "Perihal wajib diisi."); return false; }
    if (!form.tanggal_surat) { showToast("warning", "Validasi", "Tanggal surat wajib diisi."); return false; }
    return true;
  }

  /* ── create ──────────────────────────────────── */
  async function handleCreate() {
    if (!validate()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("error", "Sesi Berakhir", "Silakan login kembali."); setSubmitting(false); return; }

    const { error } = await supabase.from("surat_keluar").insert([{
      nomor_surat: form.nomor_surat.trim(),
      tujuan: form.tujuan.trim(),
      perihal: form.perihal.trim(),
      tanggal_surat: form.tanggal_surat,
      status: "draft" as const,
      konten: form.konten.trim() || null,
      file_url: form.file_url || null,
      created_by: user.id,
    } as any]);

    if (error) showToast("error", "Gagal Menambah Surat", error.message);
    else {
      showToast("success", "Surat Keluar Dibuat", `Nomor: ${form.nomor_surat}`);
      closeModal();
      fetchData();
    }
    setSubmitting(false);
  }

  /* ── update ──────────────────────────────────── */
  async function handleUpdate() {
    if (!selected || !validate()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("surat_keluar")
      .update({
        nomor_surat: form.nomor_surat.trim(),
        tujuan: form.tujuan.trim(),
        perihal: form.perihal.trim(),
        tanggal_surat: form.tanggal_surat,
        konten: form.konten.trim() || null,
        file_url: form.file_url || null,
      } as any)
      .eq("id", selected.id);

    if (error) showToast("error", "Gagal Update", error.message);
    else {
      showToast("success", "Surat Berhasil Diperbarui");
      closeModal();
      fetchData();
    }
    setSubmitting(false);
  }

  /* ── send to approval ────────────────────────── */
  async function handleSendApproval(id: string) {
    setSendingId(id);
    const { error } = await supabase
      .from("surat_keluar")
      .update({ status: "diajukan" } as any)
      .eq("id", id);
    if (error) showToast("error", "Gagal Mengajukan", error.message);
    else { showToast("success", "Surat Diajukan", "Menunggu persetujuan pimpinan."); fetchData(); }
    setSendingId(null);
  }

  /* ── delete ──────────────────────────────────── */
  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("surat_keluar").delete().eq("id", confirmDeleteId);
    if (error) showToast("error", "Gagal Menghapus", error.message);
    else { showToast("info", "Surat Dihapus"); fetchData(); }
    setConfirmDeleteId(null);
    setDeleting(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modal === "edit") handleUpdate();
    else handleCreate();
  }

  /* ── form content ────────────────────────────── */
  const FormContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
      <div>
        <Label>Nomor Surat <span className="text-error normal-case tracking-normal">*</span></Label>
        <input className={inputCls} type="text" placeholder="Contoh: B-104/SET/2024" required
          value={form.nomor_surat} onChange={(e) => setForm({ ...form, nomor_surat: e.target.value })} />
      </div>

      <div>
        <Label>Tujuan <span className="text-error normal-case tracking-normal">*</span></Label>
        <input className={inputCls} type="text" placeholder="Nama instansi tujuan" required
          value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} />
      </div>

      <div>
        <Label>Tanggal Surat <span className="text-error normal-case tracking-normal">*</span></Label>
        <input className={inputCls} type="date" required
          value={form.tanggal_surat} onChange={(e) => setForm({ ...form, tanggal_surat: e.target.value })} />
      </div>

      <div>
        <Label>Perihal <span className="text-error normal-case tracking-normal">*</span></Label>
        <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Perihal surat" required
          value={form.perihal} onChange={(e) => setForm({ ...form, perihal: e.target.value })} />
      </div>

      <div>
        <Label>Konten Surat <span className="font-normal normal-case tracking-normal opacity-60">(opsional)</span></Label>
        <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Isi konten surat..."
          value={form.konten} onChange={(e) => setForm({ ...form, konten: e.target.value })} />
      </div>

      <div>
        <Label>File Surat PDF <span className="font-normal normal-case tracking-normal opacity-60">(opsional)</span></Label>
        <FileUpload
          key={uploadKey}
          bucket="documents"
          folder="surat_keluar"
          existingFileUrl={form.file_url}
          onUploadSuccess={(url) => setForm((f) => ({ ...f, file_url: url || null }))}
          onUploadError={(err) => showToast("error", "Upload Gagal", err)}
        />
      </div>

      <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface-container-lowest pb-1">
        <button type="button" onClick={closeModal}
          className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors">
          Batal
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting
            ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan…</>
            : <><span className="material-symbols-outlined text-[18px]">{modal === "edit" ? "save" : "add"}</span>{modal === "edit" ? "Simpan Perubahan" : "Buat Surat"}</>}
        </button>
      </div>
    </form>
  );

  /* ── view content ────────────────────────────── */
  const ViewContent = selected && (
    <div className="p-6 overflow-y-auto flex-1 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nomor Surat</p>
          <p className="font-inter text-sm font-semibold text-on-surface">{selected.nomor_surat}</p>
        </div>
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status</p>
          <StatusBadge status={selected.status} />
        </div>
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tujuan</p>
          <p className="font-inter text-sm text-on-surface">{selected.tujuan}</p>
        </div>
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal Surat</p>
          <p className="font-inter text-sm text-on-surface">{new Date(selected.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div>
        <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Perihal</p>
        <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant font-inter text-sm text-on-surface">{selected.perihal}</div>
      </div>

      {selected.konten && (
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Konten Surat</p>
          <div className="p-3.5 bg-surface rounded-lg border border-outline-variant font-inter text-sm text-on-surface-variant whitespace-pre-wrap">{selected.konten}</div>
        </div>
      )}

      <div>
        <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Lampiran File</p>
        {selected.file_url ? (
          <div className="flex items-center justify-between p-3.5 border border-outline-variant rounded-xl bg-surface-container-low gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-error-container text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </div>
              <p className="font-inter text-sm font-medium text-on-surface truncate">{selected.file_url.split("/").pop()}</p>
            </div>
            <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 px-3.5 py-1.5 bg-primary text-on-primary rounded-lg font-inter text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>Buka
            </a>
          </div>
        ) : (
          <div className="p-5 border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px] opacity-40">description</span>
            <p className="font-inter text-sm">Tidak ada file lampiran</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={closeModal}
          className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors">
          Tutup
        </button>
        {(selected.status === "draft" || selected.status === "ditolak") && (
          <button onClick={() => openEdit(selected)}
            className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">edit</span>Edit
          </button>
        )}
      </div>
    </div>
  );

  /* ────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-on-surface">Surat Keluar</h2>
          <p className="font-inter text-sm text-on-surface-variant mt-1">Kelola dan pantau status pengiriman surat instansi.</p>
        </div>
        {userRole !== "pimpinan" && (
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Surat Keluar
          </button>
        )}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="px-5 py-3.5 border-b border-outline-variant bg-surface-container flex flex-wrap items-center gap-3">
          <span className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Filter:</span>
          {["", "draft", "diajukan", "disetujui", "ditolak"].map((val) => (
            <button key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-3 py-1 rounded-full font-inter text-xs font-semibold transition-colors ${
                filterStatus === val
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-tint"
              }`}>
              {val === "" ? "Semua" : val === "draft" ? "Draft" : val === "diajukan" ? "Diajukan" : val === "disetujui" ? "Disetujui" : "Ditolak"}
            </button>
          ))}
          <span className="ml-auto font-inter text-xs text-on-surface-variant">{suratList.length} surat</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant">
                  {["Nomor Surat", "Tanggal", "Tujuan", "Perihal", "Status", "Aksi"].map((h) => (
                    <th key={h} className={`py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider ${h === "Aksi" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-inter text-sm">
                {suratList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[48px] text-outline block mb-2">outgoing_mail</span>
                      Belum ada surat keluar.
                    </td>
                  </tr>
                ) : suratList.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3.5 px-4 font-medium text-on-surface whitespace-nowrap">{s.nomor_surat}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                      {new Date(s.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface max-w-[140px] truncate">{s.tujuan}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant max-w-[180px] truncate">{s.perihal}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* View */}
                        <button onClick={() => openView(s)} title="Lihat Detail"
                          className="p-1.5 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-[19px]">visibility</span>
                        </button>
                        {/* Edit (draft or rejected) */}
                        {userRole !== "pimpinan" && (s.status === "draft" || s.status === "ditolak") && (
                          <button onClick={() => openEdit(s)} title="Edit"
                            className="p-1.5 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                            <span className="material-symbols-outlined text-[19px]">edit</span>
                          </button>
                        )}
                        {/* Ajukan ke pimpinan (draft or ditolak) */}
                        {userRole !== "pimpinan" && (s.status === "draft" || s.status === "ditolak") && (
                          <button
                            onClick={() => handleSendApproval(s.id)}
                            disabled={sendingId === s.id}
                            title="Ajukan ke Pimpinan"
                            className="p-1.5 rounded-md text-on-surface-variant hover:text-secondary hover:bg-secondary-container/30 transition-colors disabled:opacity-50">
                            {sendingId === s.id
                              ? <span className="material-symbols-outlined text-[19px] animate-spin">progress_activity</span>
                              : <span className="material-symbols-outlined text-[19px]">send</span>}
                          </button>
                        )}
                        {/* Delete */}
                        {userRole === "admin" && (
                          <button onClick={() => setConfirmDeleteId(s.id)} title="Hapus"
                            className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors">
                            <span className="material-symbols-outlined text-[19px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3.5 border-t border-outline-variant bg-surface-container-lowest">
          <span className="font-inter text-xs text-on-surface-variant">Total: {suratList.length} surat</span>
        </div>
      </div>

      {/* ── Form Modal (Create / Edit) ── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full sm:max-w-[620px] max-h-[95dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-outline-variant shadow-2xl">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-public-sans text-lg font-bold text-on-surface">
                  {modal === "edit" ? "Edit Surat Keluar" : "Tambah Surat Keluar"}
                </h3>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">
                  {modal === "edit" ? `Mengubah: ${selected?.nomor_surat}` : "Isi form di bawah — status awal: Draft"}
                </p>
              </div>
              <button onClick={closeModal}
                className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {FormContent}
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {modal === "view" && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full sm:max-w-[680px] max-h-[95dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-outline-variant shadow-2xl">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between shrink-0 bg-surface-container-low rounded-t-2xl">
              <div>
                <h3 className="font-public-sans text-lg font-bold text-on-surface">Detail Surat Keluar</h3>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">{selected.nomor_surat}</p>
              </div>
              <button onClick={closeModal}
                className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {ViewContent}
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h4 className="font-public-sans font-bold text-on-surface">Hapus Surat?</h4>
                <p className="font-inter text-sm text-on-surface-variant mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-error text-on-error rounded-lg font-inter text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {deleting
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menghapus…</>
                  : <><span className="material-symbols-outlined text-[18px]">delete</span>Ya, Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
