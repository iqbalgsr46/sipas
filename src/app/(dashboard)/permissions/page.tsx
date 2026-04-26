"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import type { Role, RolePermission } from "@/types/database";

const RESOURCES = [
  { value: "surat_masuk",  label: "Surat Masuk" },
  { value: "surat_keluar", label: "Surat Keluar" },
  { value: "approval",     label: "Approval Pimpinan" },
  { value: "users",        label: "Manajemen Pengguna" },
  { value: "roles",        label: "Wewenang (Roles)" },
  { value: "permissions",  label: "Hak Akses" },
  { value: "settings",     label: "Pengaturan" },
];
const ACTIONS = ["create", "read", "update", "delete"] as const;
type Action = (typeof ACTIONS)[number];

const ACTION_LABELS: Record<Action, string> = { create: "Buat", read: "Lihat", update: "Ubah", delete: "Hapus" };
const ACTION_ICONS: Record<Action, string> = { create: "add_circle", read: "visibility", update: "edit", delete: "delete" };
const ACTION_COLORS: Record<Action, string> = {
  read:   "bg-secondary-container text-on-secondary-container",
  create: "bg-primary-container text-on-primary-container",
  update: "bg-[#e8f5e9] text-[#1b5e20]",
  delete: "bg-error-container text-on-error-container",
};

const inputCls =
  "w-full px-3.5 py-2.5 border border-outline-variant rounded-lg text-on-surface font-inter text-sm bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{children}</label>;
}

const resourceLabel = (val: string) => RESOURCES.find((r) => r.value === val)?.label ?? val;

export default function PermissionsPage() {
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingPerm, setEditingPerm] = useState<RolePermission | null>(null);
  const [form, setForm] = useState({ role_name: "", resource: "surat_masuk", actions: [] as Action[] });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterRole, setFilterRole] = useState("");

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("role_permissions").select("*").order("role_name").order("resource");
      if (filterRole) query = query.eq("role_name", filterRole);
      const { data, error } = await query;
      if (error) throw error;
      setPermissions(data ?? []);
    } catch (err: any) {
      showToast("error", "Gagal Memuat", err.message);
    } finally {
      setLoading(false);
    }
  }, [filterRole]); // eslint-disable-line

  const fetchRoles = useCallback(async () => {
    try {
      const { data } = await supabase.from("roles").select("*").order("name");
      setRoles((data ?? []) as Role[]);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const u = localStorage.getItem("sipas_user");
      if (u) { const p = JSON.parse(u); if (p.role === "admin") setIsAdmin(true); }
    } catch {}
    setRoleChecked(true);
  }, []);

  useEffect(() => { if (isAdmin) fetchRoles(); }, [isAdmin, fetchRoles]);
  useEffect(() => { if (isAdmin) fetchPermissions(); }, [isAdmin, fetchPermissions]);

  if (roleChecked && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <span className="material-symbols-outlined text-error text-[80px]">gpp_bad</span>
        <h2 className="text-2xl font-bold font-public-sans text-on-surface">Akses Ditolak</h2>
        <p className="text-on-surface-variant text-center max-w-md">Halaman ini hanya dapat diakses oleh Administrator.</p>
      </div>
    );
  }

  function openCreate() {
    setForm({ role_name: roles[0]?.name ?? "", resource: "surat_masuk", actions: [] });
    setEditingPerm(null);
    setModal("create");
  }

  function openEdit(perm: RolePermission) {
    setForm({ role_name: perm.role_name, resource: perm.resource, actions: [perm.action as Action] });
    setEditingPerm(perm);
    setModal("edit");
  }

  function closeModal() { setModal(null); setEditingPerm(null); }

  function toggleAction(action: Action) {
    if (modal === "edit") {
      // Edit: only allow single action selection
      setForm((f) => ({ ...f, actions: [action] }));
    } else {
      setForm((f) => ({
        ...f,
        actions: f.actions.includes(action) ? f.actions.filter((a) => a !== action) : [...f.actions, action],
      }));
    }
  }

  async function handleCreate() {
    if (!form.role_name) { showToast("warning", "Validasi", "Pilih role."); return; }
    if (form.actions.length === 0) { showToast("warning", "Validasi", "Pilih minimal satu aksi."); return; }

    const toInsert = form.actions.filter(
      (action) => !permissions.some((p) => p.role_name === form.role_name && p.resource === form.resource && p.action === action)
    );

    if (toInsert.length === 0) {
      showToast("warning", "Duplikat", "Semua aksi sudah ada untuk role & modul ini.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("role_permissions").insert(
        toInsert.map((action) => ({ role_name: form.role_name, resource: form.resource, action }))
      );
      if (error) throw error;
      showToast("success", "Permission Ditambahkan", `${toInsert.length} aksi ditambahkan.`);
      closeModal();
      fetchPermissions();
    } catch (err: any) {
      showToast("error", "Gagal Menambah", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editingPerm || form.actions.length === 0) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .update({ role_name: form.role_name, resource: form.resource, action: form.actions[0] })
        .eq("id", editingPerm.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Akses ditolak. Periksa fungsi is_admin().");
      showToast("success", "Permission Diperbarui");
      closeModal();
      fetchPermissions();
    } catch (err: any) {
      showToast("error", "Gagal Update", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.from("role_permissions").delete().eq("id", confirmDeleteId).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Akses ditolak. Periksa fungsi is_admin().");
      showToast("info", "Permission Dihapus");
      fetchPermissions();
    } catch (err: any) {
      showToast("error", "Gagal Menghapus", err.message);
    } finally {
      setConfirmDeleteId(null);
      setDeleting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    modal === "edit" ? handleUpdate() : handleCreate();
  }

  // Group permissions by role+resource for table display
  type GroupEntry = { role: string; resource: string; actions: RolePermission[] };
  const grouped: GroupEntry[] = Object.values(
    permissions.reduce<Record<string, GroupEntry>>((acc, p) => {
      const key = `${p.role_name}__${p.resource}`;
      if (!acc[key]) acc[key] = { role: p.role_name, resource: p.resource, actions: [] };
      acc[key].actions.push(p);
      return acc;
    }, {})
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-on-surface">Hak Akses (Permissions)</h2>
          <p className="font-inter text-sm text-on-surface-variant mt-1">Atur hak akses terperinci untuk setiap role.</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Permission
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3.5 border-b border-outline-variant bg-surface-container flex flex-wrap items-center gap-3">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="px-3.5 py-2 border border-outline-variant rounded-lg font-inter text-sm bg-surface text-on-surface focus:border-primary outline-none min-w-[160px]">
            <option value="">Semua Role</option>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <span className="ml-auto font-inter text-xs text-on-surface-variant">{permissions.length} permission · {grouped.length} grup</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline block mb-2">key_off</span>
            <p className="font-inter text-sm">Tidak ada hak akses ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant">
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Role</th>
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Modul</th>
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider">Aksi</th>
                  <th className="py-3 px-4 font-inter text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Kelola</th>
                </tr>
              </thead>
              <tbody className="font-inter text-sm divide-y divide-outline-variant">
                {grouped.map(({ role, resource, actions }) => (
                  <tr key={`${role}__${resource}`} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-primary align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">shield_person</span>
                        {role}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface align-top">{resourceLabel(resource)}</td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {actions.map((perm) => (
                          <span key={perm.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ACTION_COLORS[perm.action as Action] ?? "bg-surface-variant text-on-surface-variant"}`}>
                            {ACTION_LABELS[perm.action as Action] ?? perm.action}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center justify-center gap-1">
                        {actions.map((perm) => (
                          <button key={perm.id}
                            onClick={() => openEdit(perm)}
                            title={`Edit ${perm.action}`}
                            className="p-1 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        ))}
                        {actions.map((perm) => (
                          <button key={`del-${perm.id}`}
                            onClick={() => setConfirmDeleteId(perm.id)}
                            title={`Hapus ${perm.action}`}
                            className="p-1 rounded-md text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">remove_circle</span>
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3.5 border-t border-outline-variant bg-surface-container-lowest">
          <span className="font-inter text-xs text-on-surface-variant">Total: {permissions.length} permission</span>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full sm:max-w-[540px] max-h-[95dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-outline-variant shadow-2xl">
            <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-public-sans text-lg font-bold text-on-surface">
                  {modal === "edit" ? "Edit Permission" : "Tambah Permission"}
                </h3>
                <p className="font-inter text-xs text-on-surface-variant mt-0.5">
                  {modal === "edit"
                    ? `${editingPerm?.role_name} → ${resourceLabel(editingPerm?.resource ?? "")}`
                    : "Pilih role, modul, dan aksi yang diizinkan"}
                </p>
              </div>
              <button onClick={closeModal}
                className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <Label>Role <span className="text-error normal-case tracking-normal">*</span></Label>
                <select className={inputCls} required value={form.role_name}
                  onChange={(e) => setForm({ ...form, role_name: e.target.value })}>
                  <option value="">— Pilih Role —</option>
                  {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>

              <div>
                <Label>Modul <span className="text-error normal-case tracking-normal">*</span></Label>
                <select className={inputCls} required value={form.resource}
                  onChange={(e) => setForm({ ...form, resource: e.target.value })}>
                  {RESOURCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <Label>
                  Aksi <span className="text-error normal-case tracking-normal">*</span>
                  {modal === "create" && <span className="font-normal normal-case tracking-normal opacity-60 ml-1">(pilih satu atau lebih)</span>}
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {ACTIONS.map((action) => {
                    const checked = form.actions.includes(action);
                    return (
                      <label key={action}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none
                          ${checked ? "border-primary bg-primary/5" : "border-outline-variant bg-surface hover:border-primary/40"}`}>
                        <input type={modal === "edit" ? "radio" : "checkbox"} name="action" checked={checked}
                          onChange={() => toggleAction(action)} className="sr-only" />
                        <span className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0
                          ${checked ? "bg-primary border-primary" : "border-outline-variant bg-surface"}`}>
                          {checked && <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>}
                        </span>
                        <div>
                          <p className="font-inter text-sm font-semibold text-on-surface flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] opacity-60">{ACTION_ICONS[action]}</span>
                            {ACTION_LABELS[action]}
                          </p>
                          <p className="font-inter text-[10px] text-on-surface-variant uppercase tracking-wider">{action}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={submitting || form.actions.length === 0}
                  className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-inter text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                  {submitting
                    ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan…</>
                    : <><span className="material-symbols-outlined text-[18px]">{modal === "edit" ? "save" : "add"}</span>{modal === "edit" ? "Simpan" : "Tambah"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-outline-variant shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">key_off</span>
              </div>
              <div>
                <h4 className="font-public-sans font-bold text-on-surface">Hapus Permission?</h4>
                <p className="font-inter text-sm text-on-surface-variant mt-0.5">Akses ini akan dihapus permanen.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg font-inter text-sm font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-error text-on-error rounded-lg font-inter text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
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
