"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import FileUpload from "@/components/FileUpload";
import type { SuratMasuk } from "@/types/database";
import { EyeIcon, PencilIcon, TrashBinIcon } from "@/icons";

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-white/90 text-sm bg-white dark:bg-gray-900 focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-400 outline-none transition-all placeholder:text-gray-400";

export default function SuratMasukPage() {
  const { showToast } = useToast();

  const [suratList, setSuratList] = useState<SuratMasuk[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState("staf");

  const [modal, setModal] = useState<"create" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<SuratMasuk | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadKey, setUploadKey] = useState(0);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function validate() {
    if (!form.nomor_surat.trim()) { showToast("warning", "Validasi", "Nomor surat wajib diisi."); return false; }
    if (!form.pengirim.trim()) { showToast("warning", "Validasi", "Pengirim wajib diisi."); return false; }
    if (!form.perihal.trim()) { showToast("warning", "Validasi", "Perihal wajib diisi."); return false; }
    if (!form.tanggal_surat) { showToast("warning", "Validasi", "Tanggal surat wajib diisi."); return false; }
    if (!form.tanggal_diterima) { showToast("warning", "Validasi", "Tanggal diterima wajib diisi."); return false; }
    return true;
  }

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

  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("surat_masuk").delete().eq("id", confirmDeleteId);
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

  const FormContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
      {/* Row 1 */}
      <div>
        <Label>Nomor Surat <span className="text-error-500">*</span></Label>
        <input className={inputCls} type="text" placeholder="Contoh: SM-2024/01/001" required
          value={form.nomor_surat} onChange={(e) => setForm({ ...form, nomor_surat: e.target.value })} />
      </div>

      {/* Row 2 */}
      <div>
        <Label>Asal / Pengirim <span className="text-error-500">*</span></Label>
        <input className={inputCls} type="text" placeholder="Nama instansi pengirim" required
          value={form.pengirim} onChange={(e) => setForm({ ...form, pengirim: e.target.value })} />
      </div>

      {/* Row 3 – dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Tanggal Surat <span className="text-error-500">*</span></Label>
          <input className={inputCls} type="date" required
            value={form.tanggal_surat} onChange={(e) => setForm({ ...form, tanggal_surat: e.target.value })} />
        </div>
        <div>
          <Label>Tanggal Terima <span className="text-error-500">*</span></Label>
          <input className={inputCls} type="date" required
            value={form.tanggal_diterima} onChange={(e) => setForm({ ...form, tanggal_diterima: e.target.value })} />
        </div>
      </div>

      {/* Row 4 – perihal */}
      <div>
        <Label>Perihal <span className="text-error-500">*</span></Label>
        <textarea className={`${inputCls} resize-none h-24`} placeholder="Perihal surat" required
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
        <Label>Keterangan <span className="text-gray-400 font-normal ml-1">(opsional)</span></Label>
        <textarea className={`${inputCls} resize-none h-20`} placeholder="Catatan tambahan..."
          value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
      </div>

      {/* Row 7 – file */}
      <div>
        <Label>File Surat PDF <span className="text-gray-400 font-normal ml-1">(opsional)</span></Label>
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
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900 pb-2">
        <button type="button" onClick={closeModal}
          className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
          Batal
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-theme-md shadow-brand-500/20 hover:shadow-theme-lg hover:shadow-brand-500/30">
          {submitting
            ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan…</>
            : <><span className="material-symbols-outlined text-[18px]">{modal === "edit" ? "save" : "add"}</span>{modal === "edit" ? "Simpan Perubahan" : "Kirim Surat"}</>
          }
        </button>
      </div>
    </form>
  );

  const ViewContent = selected && (
    <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-white/[0.03] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Nomor Surat</p>
          <p className="font-semibold text-gray-800 dark:text-white/90 text-lg">{selected.nomor_surat}</p>
        </div>
        <div className="bg-gray-50 dark:bg-white/[0.03] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Status</p>
          <StatusBadge status={selected.status} />
        </div>
        <div className="bg-gray-50 dark:bg-white/[0.03] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Pengirim</p>
          <p className="font-medium text-gray-800 dark:text-white/90">{selected.pengirim}</p>
        </div>
        <div className="bg-gray-50 dark:bg-white/[0.03] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tanggal Surat</p>
          <p className="font-medium text-gray-800 dark:text-white/90">{new Date(selected.tanggal_surat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Perihal</p>
        <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-900/50 text-gray-800 dark:text-white/90 leading-relaxed">
          {selected.perihal}
        </div>
      </div>

      {selected.keterangan && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Keterangan</p>
          <div className="p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 italic">
            {selected.keterangan}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Lampiran File</p>
        {selected.file_url ? (
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 shadow-theme-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{selected.file_url.split("/").pop()}</p>
            </div>
            <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 px-4 py-2 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 rounded-lg text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-500/20 transition flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span> Buka File
            </a>
          </div>
        ) : (
          <div className="p-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.02]">
            <span className="material-symbols-outlined text-[32px] opacity-50">description</span>
            <p className="text-sm font-medium">Tidak ada file lampiran</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <button onClick={closeModal}
          className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
          Tutup
        </button>
        {userRole !== "pimpinan" && (
          <button onClick={() => openEdit(selected)}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-theme-sm">
            <span className="material-symbols-outlined text-[18px]">edit</span> Edit Surat
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Surat Masuk</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola dan pantau seluruh surat masuk instansi.</p>
        </div>
        {userRole !== "pimpinan" && (
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 active:scale-[0.98] transition-all shadow-theme-sm shadow-brand-500/20">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Tambah Surat Masuk
          </button>
        )}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="material-symbols-outlined animate-spin text-brand-500 text-[40px]">progress_activity</span>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {["Nomor Surat", "Tgl Terima", "Pengirim", "Perihal", "Status", "Aksi"].map((h) => (
                    <th key={h} className={`py-4 px-6 font-medium text-gray-800 dark:text-white/90`}>
                      <div className={`flex items-center justify-between`}>
                        <span>{h}</span>
                        <span className="material-symbols-outlined text-[16px] text-gray-300 dark:text-gray-600 shrink-0">unfold_more</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {suratList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4 ring-1 ring-inset ring-blue-500/20">
                          <span className="material-symbols-outlined icon-fill text-[32px] text-blue-500">inbox</span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada surat masuk.</p>
                      </div>
                    </td>
                  </tr>
                ) : suratList.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="py-4 px-6 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">{s.nomor_surat}</td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(s.tanggal_diterima).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-4 px-6 text-gray-800 dark:text-white/90 max-w-[160px] truncate">{s.pengirim}</td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{s.perihal}</td>
                    <td className="py-4 px-6"><StatusBadge status={s.status} /></td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-start gap-3">
                        {userRole === "admin" && (
                          <button onClick={() => setConfirmDeleteId(s.id)} title="Hapus"
                            className="text-gray-400 hover:text-error-500 transition-colors">
                            <TrashBinIcon className="w-5 h-5 fill-current" />
                          </button>
                        )}
                        <button onClick={() => openView(s)} title="Lihat Detail"
                          className="text-gray-400 hover:text-brand-500 transition-colors">
                          <EyeIcon className="w-5 h-5 fill-current" />
                        </button>
                        {userRole !== "pimpinan" && (
                          <button onClick={() => openEdit(s)} title="Edit"
                            className="text-gray-400 hover:text-orange-500 transition-colors">
                            <PencilIcon className="w-5 h-5 fill-current" />
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
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total: {suratList.length} surat</span>
        </div>
      </div>

      {/* ── Form Modal (Create / Edit) ── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-[620px] max-h-[95dvh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-theme-xl overflow-hidden animate-slide-up sm:animate-modal-in">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  {modal === "edit" ? "Edit Surat Masuk" : "Tambah Surat Masuk"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {modal === "edit" ? `Mengubah: ${selected?.nomor_surat}` : "Isi form di bawah untuk menambahkan surat baru"}
                </p>
              </div>
              <button onClick={closeModal}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {FormContent}
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {modal === "view" && selected && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-[680px] max-h-[95dvh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-theme-xl overflow-hidden animate-slide-up sm:animate-modal-in">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Detail Surat Masuk</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selected.nomor_surat}</p>
              </div>
              <button onClick={closeModal}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {ViewContent}
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-xl w-[90vw] max-w-[400px] p-6 flex flex-col gap-6 animate-modal-in">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[32px]">warning</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800 dark:text-white/90">Hapus Surat?</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data surat secara permanen.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                className="w-full py-3 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="w-full py-3 bg-error-500 text-white rounded-xl font-medium hover:bg-error-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-theme-md shadow-error-500/20">
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
