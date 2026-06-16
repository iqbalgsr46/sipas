"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { PencilIcon, TrashBinIcon } from "@/icons";
import type { User } from "@/types/database";

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "staf" as User["role"],
    status: "aktif" as User["status"],
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterRole) query = query.eq("role", filterRole);
    if (filterStatus) query = query.eq("status", filterStatus);
    if (searchQuery) query = query.ilike("full_name", `%${searchQuery}%`);

    const { data, error } = (await query) as { data: User[] | null; error: any };
    if (error) showToast("error", "Gagal Memuat Data", error.message);
    else setUsers(data ?? []);
    setLoading(false);
  }, [filterRole, filterStatus, searchQuery]); // eslint-disable-line

  useEffect(() => {
    const localUser = localStorage.getItem("sipas_user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.role === "admin") {
        setIsAdmin(true);
      }
    }
    setRoleChecked(true);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  if (roleChecked && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <span className="material-symbols-outlined text-error-500 text-[80px]">gpp_bad</span>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Akses Ditolak</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Halaman ini hanya dapat diakses oleh Administrator sistem.
        </p>
      </div>
    );
  }

  const EMPTY_FORM = {
    full_name: "", username: "", email: "", password: "",
    role: "staf" as User["role"], status: "aktif" as User["status"],
  };

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModal("create");
  }

  function openEdit(user: User) {
    setForm({ full_name: user.full_name, username: user.username, email: user.email, password: "", role: user.role, status: user.status });
    setEditingId(user.id);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditingId(null);
  }

  function validate() {
    if (!form.full_name.trim()) { showToast("warning", "Validasi", "Nama lengkap wajib diisi."); return false; }
    if (!form.username.trim()) { showToast("warning", "Validasi", "Username wajib diisi."); return false; }
    if (!form.email.trim()) { showToast("warning", "Validasi", "Email wajib diisi."); return false; }
    if (modal === "create" && (!form.password || form.password.length < 6)) {
      showToast("warning", "Validasi", "Password minimal 6 karakter."); return false;
    }
    return true;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSubmitting(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        role: form.role,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showToast("error", "Gagal Membuat User", data.error ?? "Unknown error");
    } else {
      showToast("success", "User Berhasil Dibuat", `Email: ${form.email}`);
      closeModal();
      fetchUsers();
    }
    setSubmitting(false);
  }

  async function handleUpdate() {
    if (!editingId || !validate()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("users")
      .update({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        role: form.role,
        status: form.status,
      } as any)
      .eq("id", editingId);

    if (error) {
      showToast("error", "Gagal Update User", error.message);
    } else {
      showToast("success", "User Berhasil Diperbarui");
      closeModal();
      fetchUsers();
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("users").delete().eq("id", confirmDeleteId);
    if (error) showToast("error", "Gagal Menghapus", error.message);
    else { showToast("info", "User Dihapus"); fetchUsers(); }
    setConfirmDeleteId(null);
    setDeleting(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modal === "edit") handleUpdate();
    else handleCreate();
  }

  const roleBadgeCls = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
      staf: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      pimpinan: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    };
    return map[role] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-800 dark:text-white/90 text-sm bg-white dark:bg-gray-900 focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-400 outline-none transition-all placeholder:text-gray-400";

  const FormContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
          Nama Lengkap <span className="text-error-500 normal-case tracking-normal">*</span>
        </label>
        <input className={inputCls} type="text" placeholder="Nama lengkap beserta gelar" required
          value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
          Username <span className="text-error-500 normal-case tracking-normal">*</span>
        </label>
        <input className={inputCls} type="text" placeholder="nama.pengguna" required
          value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
          Email <span className="text-error-500 normal-case tracking-normal">*</span>
        </label>
        <input
          className={`${inputCls} ${modal === "edit" ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800" : ""}`}
          type="email" placeholder="email@instansi.go.id" required
          disabled={modal === "edit"}
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {modal === "edit" && (
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">lock</span>Email tidak dapat diubah
          </p>
        )}
      </div>

      {modal === "create" && (
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Password <span className="text-error-500 normal-case tracking-normal">*</span>
          </label>
          <input className={inputCls} type="password" placeholder="Minimal 6 karakter" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Role</label>
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User["role"] })}>
            <option value="admin">Admin</option>
            <option value="staf">Staf</option>
            <option value="pimpinan">Pimpinan</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Status</label>
          <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as User["status"] })}>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-aktif</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 mt-6 bg-white dark:bg-gray-900 sticky bottom-0 pb-2">
        <button type="button" onClick={closeModal}
          className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
          Batal
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-theme-md shadow-brand-500/20 hover:shadow-theme-lg hover:shadow-brand-500/30">
          {submitting
            ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Menyimpan…</>
            : <><span className="material-symbols-outlined text-[18px]">{modal === "edit" ? "save" : "person_add"}</span>{modal === "edit" ? "Simpan" : "Tambah User"}</>}
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">Manajemen Pengguna</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola akses, role, dan status pengguna sistem.</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 active:scale-[0.98] transition-all shadow-theme-sm shadow-brand-500/20">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Tambah User
        </button>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-theme-sm flex flex-col sm:flex-row flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[220px] w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-[20px]">search</span>
          <input
            type="text" placeholder="Cari nama pengguna..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-white/[0.02] text-sm text-gray-800 dark:text-white/90 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-white/[0.02] text-gray-700 dark:text-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all">
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="staf">Staf</option>
            <option value="pimpinan">Pimpinan</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-white/[0.02] text-gray-700 dark:text-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all">
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-aktif</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
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
                  {["Nama", "Username", "Role", "Status", "Bergabung", "Aksi"].map((h) => (
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
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 ring-1 ring-inset ring-emerald-500/20">
                          <span className="material-symbols-outlined icon-fill text-[32px] text-emerald-500">group</span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tidak ada pengguna ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group ${user.status === "nonaktif" ? "opacity-60 grayscale-[0.2]" : ""}`}>
                    <td className="py-4 px-6 font-semibold text-gray-800 dark:text-white/90 whitespace-nowrap">{user.full_name}</td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 whitespace-nowrap">{user.username}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold tracking-widest ${roleBadgeCls(user.role)}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6"><StatusBadge status={user.status} /></td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-start gap-3">
                        <button onClick={() => setConfirmDeleteId(user.id)} title="Hapus"
                          className="text-gray-400 hover:text-error-500 transition-colors">
                          <TrashBinIcon className="w-5 h-5 fill-current" />
                        </button>
                        <button onClick={() => openEdit(user)} title="Edit"
                          className="text-gray-400 hover:text-orange-500 transition-colors">
                          <PencilIcon className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total: {users.length} pengguna</span>
        </div>
      </div>

      {/* ── Form Modal ── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-[520px] max-h-[95dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xl overflow-hidden animate-slide-up sm:animate-modal-in">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  {modal === "edit" ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {modal === "edit" ? `Mengubah akun: ${form.email}` : "Buat akun pengguna baru"}
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

      {/* ── Delete Confirm ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xl w-[90vw] max-w-[400px] p-6 flex flex-col gap-6 animate-modal-in">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[32px]">person_remove</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800 dark:text-white/90">Hapus Pengguna?</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  User akan dihapus permanen dari sistem dan tidak dapat dikembalikan.
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
