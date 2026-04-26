"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import type { Role } from "@/types/database";

const SYSTEM_ROLES = ["admin", "user", "pimpinan"];
const inputCls =
  "w-full px-3.5 py-2.5 border border-outline-variant rounded-lg text-on-surface font-inter text-sm bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline/60";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

const EMPTY_FORM = { name: "", description: "" };

export default function RolesPage() {
  // ── hooks first ───────────────────────────────────────────────
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── fetch ─────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("roles").select("*").order("name");
      if (searchQuery.trim()) query = query.ilike("name", `%${searchQuery.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      setRoles(data ?? []);
    } catch (err: any) {
      showToast("error", "Gagal Memuat Role", err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]); // eslint-disable-line

  // ── role check ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const localUser = localStorage.getItem("sipas_user");
      if (localUser) {
        const parsed = JSON.parse(localUser);
        if (parsed.role === "admin") setIsAdmin(true);
      }
    } catch {}
    setRoleChecked(true);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRoles();
  }, [isAdmin, fetchRoles]);

  // ── access guard (after all hooks) ───────────────────────────
  if (roleChecked && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <span className="material-symbols-outlined text-error text-[80px]">gpp_bad</span>
        <h2 className="text-2xl font-bold font-public-sans text-on-surface">Akses Ditolak</h2>
        <p className="text-on-surface-variant text-center max-w-md">
          Halaman ini hanya dapat diakses oleh Administrator sistem.
        </p>
      </div>
    );
  }

  // ── helpers ───────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingRole(null);
    setModal("create");
  }

  function openEdit(role: Role) {
    setForm({ name: role.name, description: role.description ?? "" });
    setEditingRole(role);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditingRole(null);
  }

  // ── create ────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.name.trim()) { showToast("warning", "Validasi", "Nama role wajib diisi."); return; }
    if (roles.some((r) => r.name.toLowerCase() === form.name.toLowerCase().trim())) {
      showToast("error", "Gagal", "Role dengan nama tersebut sudah ada.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("roles").insert([{
        name: form.name.toLowerCase().trim(),
        description: form.description.trim() || null,
      }]);
      if (error) throw error;
      showToast("success", "Role Ditambahkan", `Role "${form.name}" berhasil dibuat.`);
      closeModal();
      fetchRoles();
    } catch (err: any) {
      showToast("error", "Gagal Menambah Role", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── update ────────────────────────────────────────────────────
  async function handleUpdate() {
    if (!editingRole || !form.name.trim()) { showToast("warning", "Validasi", "Nama role wajib diisi."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("roles")
        .update({
          name: form.name.toLowerCase().trim(),
          description: form.description.trim() || null,
        })
        .eq("id", editingRole.id);
      if (error) throw error;
      showToast("success", "Role Berhasil Diperbarui");
      closeModal();
      fetchRoles();
    } catch (err: any) {
      showToast("error", "Gagal Update Role", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("roles").delete().eq("id", confirmDeleteId);
      if (error) throw error;
      showToast("info", "Role Dihapus");
      fetchRoles();
    } catch (err: any) {
      showToast("error", "Gagal Menghapus", err.message);
    } finally {
      setConfirmDeleteId(null);
      setDeleting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modal === "edit") handleUpdate();
    else handleCreate();
  }

  const isSystemRole = (name: string) => SYSTEM_ROLES.includes(name);
  const isEditingSystemRole = modal === "edit" && editingRole && isSystemRole(editingRole.name);

  // ── Form content ──────────────────────────────────────────────
  const FormContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div>
        <Label>Nama Role <span className="text-error normal-case tracking-normal">*</span></Label>
        <input
          className={`${inputCls} ${isEditingSystemRole ? "opacity-60 cursor-not-allowed" : ""}`}
          type="text"
          placeholder="Contoh: staff_hr"
          required
          disabled={!!isEditingSystemRole}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        {isEditingSystemRole && (
          <p className="font-inter text-xs text-on-surface-variant mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">lock</span>
            Nama role bawaan sistem tidak dapat diubah
          </p>
        )}
      </div>

      <div>
        <Label>Deskripsi <span className="font-normal normal-case tracking-normal opacity-60">(opsional)</span></Label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Deskripsi singkat mengenai role ini..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={closeModal}
          className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors">
          Batal
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting
            ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan…</>
            : <><span className="material-symbols-outlined text-[18px]">{modal === "edit" ? "save" : "add"}</span>{modal === "edit" ? "Simpan Perubahan" : "Tambah Role"}</>}
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-on-surface">Wewenang (Roles)</h2>
          <p className="font-inter text-sm text-on-surface-variant mt-1">
            Kelola role pengguna untuk mengatur hak akses sistem.
          </p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Role
        </button>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3.5 border-b border-outline-variant bg-surface-container flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[17px]">search</span>
            <input
              type="text" placeholder="Cari nama role..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg bg-surface font-inter text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <span className="ml-auto font-inter text-xs text-on-surface-variant">Total: {roles.length} role</span>
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
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Role</th>
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Deskripsi</th>
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipe</th>
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="font-inter text-sm divide-y divide-outline-variant">
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[48px] text-outline block mb-2">admin_panel_settings</span>
                      Tidak ada role ditemukan.
                    </td>
                  </tr>
                ) : roles.map((role) => (
                  <tr key={role.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-on-surface">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[17px]">shield_person</span>
                        {role.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant max-w-[240px] truncate">
                      {role.description || <span className="italic opacity-50">Tidak ada deskripsi</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {isSystemRole(role.name) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant">
                          <span className="material-symbols-outlined text-[10px]">lock</span>SISTEM
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-container text-on-primary-container">
                          KUSTOM
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(role)} title="Edit"
                          className="p-1.5 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-[19px]">edit</span>
                        </button>
                        {!isSystemRole(role.name) && (
                          <button
                            onClick={() => setConfirmDeleteId(role.id)}
                            title="Hapus"
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
          <span className="font-inter text-xs text-on-surface-variant">
            {roles.filter(r => isSystemRole(r.name)).length} role sistem · {roles.filter(r => !isSystemRole(r.name)).length} role kustom
          </span>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full sm:max-w-[500px] flex flex-col rounded-t-2xl sm:rounded-2xl border border-outline-variant shadow-2xl">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-public-sans text-lg font-bold text-on-surface">
                  {modal === "edit" ? "Edit Role" : "Tambah Role Baru"}
                </h3>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">
                  {modal === "edit" ? `Mengubah role: ${editingRole?.name}` : "Buat role baru untuk sistem"}
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

      {/* ── Delete Confirm ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h4 className="font-public-sans font-bold text-on-surface">Hapus Role?</h4>
                <p className="font-inter text-sm text-on-surface-variant mt-0.5">
                  User dengan role ini mungkin kehilangan akses.
                </p>
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
