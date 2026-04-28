"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import FileUpload from "@/components/FileUpload";
import type { SuratMasuk } from "@/types/database";

const EMPTY_FORM = {
  nomor_surat: "",
  pengirim: "",
  perihal: "",
  tanggal_surat: "",
  tanggal_diterima: new Date().toISOString().split("T")[0],
  status: "belum_dibaca" as SuratMasuk["status"],
  keterangan: "",
  file_url: null as string | null,
};

/* ────────────────────────────────────────────────
   Label helper
──────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 border border-outline-variant rounded-lg text-on-surface font-inter text-sm bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline/60";

/* ────────────────────────────────────────────────
   Page
──────────────────────────────────────────────── */
export default function SuratMasukPage() {
  const { showToast } = useToast();

  const [suratList, setSuratList] = useState<SuratMasuk[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState("staf");

  // modal state: null = closed, "create" | "edit" = form, "view" = detail
  const [modal, setModal] = useState<"create" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<SuratMasuk | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  // key trick: changing this resets FileUpload internal state
  const [uploadKey, setUploadKey] = useState(0);

  // ── confirm delete modal ──────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── fetch ───────────────────────────────────── */
  async function fetchData() {
    setLoading(true);
    const { data, error } = (await supabase
      .from("surat_masuk")
      .select("*")
      .order("created_at", { ascending: false })) as {
      data: SuratMasuk[] | null;
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
  }, []);

  /* ── open helpers ────────────────────────────── */
  function openCreate() {
    setForm(EMPTY_FORM);
    setUploadKey((k) => k + 1);
    setSelected(null);
    setModal("create");
  }

  function openEdit(s: SuratMasuk) {
    setForm({
      nomor_surat: s.nomor_surat,
      pengirim: s.pengirim,
      perihal: s.perihal,
      tanggal_surat: s.tanggal_surat,
      tanggal_diterima: s.tanggal_diterima,
      status: s.status,
      keterangan: s.keterangan ?? "",
      file_url: s.file_url,
    });
    setUploadKey((k) => k + 1);
    setSelected(s);
    setModal("edit");
  }

  function openView(s: SuratMasuk) {
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
    if (!form.pengirim.trim()) { showToast("warning", "Validasi", "Pengirim wajib diisi."); return false; }
    if (!form.perihal.trim()) { showToast("warning", "Validasi", "Perihal wajib diisi."); return false; }
    if (!form.tanggal_surat) { showToast("warning", "Validasi", "Tanggal surat wajib diisi."); return false; }
    if (!form.tanggal_diterima) { showToast("warning", "Validasi", "Tanggal diterima wajib diisi."); return false; }
    return true;
  }

  /* ── create ──────────────────────────────────── */
  async function handleCreate() {
    if (!validate()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("error", "Sesi Berakhir", "Silakan login kembali."); setSubmitting(false); return; }

    const { error } = await supabase.from("surat_masuk").insert([{
      nomor_surat: form.nomor_surat.trim(),
      pengirim: form.pengirim.trim(),
      perihal: form.perihal.trim(),
      tanggal_surat: form.tanggal_surat,
      tanggal_diterima: form.tanggal_diterima,
      status: form.status,
      keterangan: form.keterangan.trim() || null,
      file_url: form.file_url || null,
      registered_by: user.id,
    } as any]);

    if (error) { showToast("error", "Gagal Menambah Surat", error.message); }
    else {
      showToast("success", "Surat Masuk Ditambahkan", `Nomor: ${form.nomor_surat}`);
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
      .from("surat_masuk")
      .update({
        nomor_surat: form.nomor_surat.trim(),
        pengirim: form.pengirim.trim(),
        perihal: form.perihal.trim(),
        tanggal_surat: form.tanggal_surat,
        tanggal_diterima: form.tanggal_diterima,
        status: form.status,
        keterangan: form.keterangan.trim() || null,
        file_url: form.file_url || null,
      } as any)
      .eq("id", selected.id);

    if (error) { showToast("error", "Gagal Update", error.message); }
    else {
      showToast("success", "Surat Berhasil Diperbarui");
      closeModal();
      fetchData();
    }
    setSubmitting(false);
  }

  /* ── delete ──────────────────────────────────── */
  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("surat_masuk").delete().eq("id", confirmDeleteId);
    if (error) showToast("error", "Gagal Menghapus", error.message);
    else { showToast("info", "Surat Dihapus"); fetchData(); }
    setConfirmDeleteId(null);
    setDeleting(false);
  }

  /* ── submit dispatcher ───────────────────────── */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modal === "edit") handleUpdate();
    else handleCreate();
  }

  /* ── shared form content ─────────────────────── */
  const FormContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
      {/* Row 1 */}
      <div>
        <Label>Nomor Surat <span className="text-error normal-case tracking-normal">*</span></Label>
        <input className={inputCls} type="text" placeholder="Contoh: SM-2024/01/001" required
          value={form.nomor_surat} onChange={(e) => setForm({ ...form, nomor_surat: e.target.value })} />
      </div>

      {/* Row 2 */}
      <div>
        <Label>Asal / Pengirim <span className="text-error normal-case tracking-normal">*</span></Label>
        <input className={inputCls} type="text" placeholder="Nama instansi pengirim" required
          value={form.pengirim} onChange={(e) => setForm({ ...form, pengirim: e.target.value })} />
      </div>

      {/* Row 3 – dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Tanggal Surat <span className="text-error normal-case tracking-normal">*</span></Label>
          <input className={inputCls} type="date" required
            value={form.tanggal_surat} onChange={(e) => setForm({ ...form, tanggal_surat: e.target.value })} />
        </div>
        <div>
          <Label>Tanggal Terima <span className="text-error normal-case tracking-normal">*</span></Label>
          <input className={inputCls} type="date" required
            value={form.tanggal_diterima} onChange={(e) => setForm({ ...form, tanggal_diterima: e.target.value })} />
        </div>
      </div>

      {/* Row 4 – perihal */}
      <div>
        <Label>Perihal <span className="text-error normal-case tracking-normal">*</span></Label>
        <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Perihal surat" required
          value={form.perihal} onChange={(e) => setForm({ ...form, perihal: e.target.value })} />
      </div>

      {/* Row 5 – status */}
      <div>
        <Label>Status</Label>
        <select className={inputCls}
          value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SuratMasuk["status"] })}>
          <option value="belum_dibaca">Belum Dibaca</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
        </select>
      </div>

      {/* Row 6 – keterangan */}
      <div>
        <Label>Keterangan <span className="font-normal normal-case tracking-normal opacity-60">(opsional)</span></Label>
        <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Catatan tambahan..."
          value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
      </div>

      {/* Row 7 – file */}
      <div>
        <Label>File Surat PDF <span className="font-normal normal-case tracking-normal opacity-60">(opsional)</span></Label>
        <FileUpload
          key={uploadKey}
          bucket="documents"
          folder="surat_masuk"
          existingFileUrl={form.file_url}
          onUploadSuccess={(url) => setForm((f) => ({ ...f, file_url: url || null }))}
          onUploadError={(err) => showToast("error", "Upload Gagal", err)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface-container-lowest pb-1">
        <button type="button" onClick={closeModal}
          className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors">
          Batal
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting
            ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan…</>
            : <><span className="material-symbols-outlined text-[18px]">{modal === "edit" ? "save" : "add"}</span>{modal === "edit" ? "Simpan Perubahan" : "Kirim Surat"}</>
          }
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
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Pengirim</p>
          <p className="font-inter text-sm text-on-surface">{selected.pengirim}</p>
        </div>
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal Surat</p>
          <p className="font-inter text-sm text-on-surface">{new Date(selected.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tanggal Diterima</p>
          <p className="font-inter text-sm text-on-surface">{new Date(selected.tanggal_diterima).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div>
        <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Perihal</p>
        <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant font-inter text-sm text-on-surface">{selected.perihal}</div>
      </div>

      {selected.keterangan && (
        <div>
          <p className="font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Keterangan</p>
          <div className="p-3.5 bg-surface rounded-lg border border-outline-variant font-inter text-sm text-on-surface-variant italic">{selected.keterangan}</div>
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
        <button onClick={() => openEdit(selected)}
          className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">edit</span>Edit
        </button>
      </div>
    </div>
  );

  /* ────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-on-surface">Surat Masuk</h2>
          <p className="font-inter text-sm text-on-surface-variant mt-1">Kelola dan pantau seluruh surat masuk instansi.</p>
        </div>
        {userRole !== "pimpinan" && (
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Surat Masuk
          </button>
        )}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant">
                  {["Nomor Surat", "Tgl Terima", "Pengirim", "Perihal", "Status", "Aksi"].map((h) => (
                    <th key={h} className={`py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider ${h === "Aksi" ? "text-center" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-inter text-sm">
                {suratList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[48px] text-outline block mb-2">inbox</span>
                      Belum ada surat masuk.
                    </td>
                  </tr>
                ) : suratList.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="py-3.5 px-4 font-medium text-on-surface whitespace-nowrap">{s.nomor_surat}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                      {new Date(s.tanggal_diterima).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface max-w-[160px] truncate">{s.pengirim}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant max-w-[200px] truncate">{s.perihal}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openView(s)} title="Lihat Detail"
                          className="p-1.5 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-[19px]">visibility</span>
                        </button>
                        {userRole !== "pimpinan" && (
                          <button onClick={() => openEdit(s)} title="Edit"
                            className="p-1.5 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                            <span className="material-symbols-outlined text-[19px]">edit</span>
                          </button>
                        )}
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
            {/* Header */}
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-public-sans text-lg font-bold text-on-surface">
                  {modal === "edit" ? "Edit Surat Masuk" : "Tambah Surat Masuk"}
                </h3>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">
                  {modal === "edit" ? `Mengubah: ${selected?.nomor_surat}` : "Isi form di bawah untuk menambahkan surat baru"}
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
                <h3 className="font-public-sans text-lg font-bold text-on-surface">Detail Surat Masuk</h3>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl w-[90vw] max-w-[400px] p-6 flex flex-col gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h4 className="font-public-sans text-lg font-bold text-on-surface">Hapus Surat?</h4>
                <p className="font-inter text-sm text-on-surface-variant mt-0.5 leading-relaxed">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                className="w-full py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="w-full py-2.5 bg-error text-on-error rounded-xl font-inter text-sm font-semibold hover:bg-error/90 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                {deleting
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>...</>
                  : <><span className="material-symbols-outlined text-[18px]">delete</span>Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
